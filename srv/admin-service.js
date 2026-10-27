const cds = require("@sap/cds");

module.exports = class AdminService extends cds.ApplicationService {
    async init() {
        const {
            Animals,
            AdoptionApplications,
            Adoptions,
            Inspections,
            Shelters
        } = this.entities;

        this.on("getDashboard", async (req) => {
            const tx = cds.tx(req);

            const [animals, applications, adoptions, shelters, inspections] =
                await Promise.all([
                    tx.run(SELECT.from(Animals)),
                    tx.run(SELECT.from(AdoptionApplications)),
                    tx.run(SELECT.from(Adoptions)),
                    tx.run(SELECT.from(Shelters)),
                    tx.run(SELECT.from(Inspections))
                ]);

            const count = (items, predicate) => items.filter(predicate).length;

            return JSON.stringify({
                totalAnimals: animals.length,
                availableAnimals: count(animals, a => a.status === "AVAILABLE"),
                adoptedAnimals: count(animals, a => a.status === "ADOPTED"),
                totalApplications: applications.length,
                pendingApplications: count(
                    applications,
                    a => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW"
                ),
                approvedApplications: count(applications, a => a.status === "APPROVED"),
                rejectedApplications: count(applications, a => a.status === "REJECTED"),
                totalAdoptions: adoptions.length,
                pendingInspections: count(
                    inspections,
                    i => i.result === "FOLLOW_UP_REQUIRED"
                ),
                shelterOccupancy: shelters.map(s => {
                    const capacity = Number(s.capacity) || 0;
                    const occupancy = Number(s.currentOccupancy) || 0;

                    return {
                        shelterName: s.shelterName,
                        location: [s.city, s.state].filter(Boolean).join(", "),
                        capacity,
                        occupancy,
                        percentage: capacity
                            ? Math.min(100, Math.round(occupancy * 100 / capacity))
                            : 0
                    };
                })
            });
        });

        this.on("approveApplication", async (req) => {
            const tx = cds.tx(req);
            const { applicationID, remarks } = req.data;

            if (!applicationID) {
                return req.reject(400, "applicationID is required");
            }

            const application = await tx.run(
                SELECT.one.from(AdoptionApplications).where({ ID: applicationID })
            );

            if (!application) {
                return req.reject(404, "Application not found");
            }

            if (["APPROVED", "REJECTED", "WITHDRAWN"].includes(application.status)) {
                return req.reject(400, "Application has already been processed");
            }

            const animal = await tx.run(
                SELECT.one.from(Animals).where({ ID: application.animal_ID })
            );

            if (!animal) {
                return req.reject(404, "Animal linked to this application was not found");
            }

            if (animal.status !== "AVAILABLE") {
                return req.reject(409, "This animal is no longer available");
            }

            const existingAdoption = await tx.run(
                SELECT.one.from(Adoptions).where({ application_ID: applicationID })
            );

            if (existingAdoption) {
                return req.reject(409, "An adoption record already exists for this application");
            }

            await tx.run(
                INSERT.into(Adoptions).entries({
                    ID: cds.utils.uuid(),
                    application_ID: applicationID,
                    animal_ID: application.animal_ID,
                    adoptionDate: new Date().toISOString().slice(0, 10),
                    status: "IN_PROGRESS",
                    remarks: remarks || null
                })
            );

            await tx.run(
                UPDATE(AdoptionApplications)
                    .set({
                        status: "APPROVED",
                        staffRemarks: remarks || null
                    })
                    .where({ ID: applicationID })
            );

            await tx.run(
                UPDATE(Animals)
                    .set({ status: "ADOPTED" })
                    .where({ ID: application.animal_ID })
            );

            return "Application approved. Adoption record created and animal marked as adopted.";
        });

        this.on("rejectApplication", async (req) => {
            const tx = cds.tx(req);
            const { applicationID, remarks } = req.data;

            if (!applicationID) {
                return req.reject(400, "applicationID is required");
            }

            const application = await tx.run(
                SELECT.one.from(AdoptionApplications).where({ ID: applicationID })
            );

            if (!application) {
                return req.reject(404, "Application not found");
            }

            if (["APPROVED", "REJECTED", "WITHDRAWN"].includes(application.status)) {
                return req.reject(400, "Application has already been processed");
            }

            await tx.run(
                UPDATE(AdoptionApplications)
                    .set({
                        status: "REJECTED",
                        staffRemarks: remarks || null
                    })
                    .where({ ID: applicationID })
            );

            return "Application rejected successfully.";
        });

        this.on("scheduleInspection", async (req) => {
            const tx = cds.tx(req);
            const { adoptionID, inspectorID, inspectionDate } = req.data;

            if (!adoptionID || !inspectionDate) {
                return req.reject(400, "adoptionID and inspectionDate are required");
            }

            const adoption = await tx.run(
                SELECT.one.from(Adoptions).where({ ID: adoptionID })
            );

            if (!adoption) {
                return req.reject(404, "Adoption not found");
            }

            const entry = {
                ID: cds.utils.uuid(),
                adoption_ID: adoptionID,
                inspectionDate,
                result: "FOLLOW_UP_REQUIRED"
            };

            if (inspectorID) {
                entry.inspector_ID = inspectorID;
            }

            await tx.run(INSERT.into(Inspections).entries(entry));

            return entry.ID;
        });

        this.on("validateInspection", async (req) => {
            const tx = cds.tx(req);
            const { inspectionID, remarks } = req.data;

            if (!inspectionID) {
                return req.reject(400, "inspectionID is required");
            }

            const inspection = await tx.run(
                SELECT.one.from(Inspections).where({ ID: inspectionID })
            );

            if (!inspection) {
                return req.reject(404, "Inspection not found");
            }

            await tx.run(
                UPDATE(Inspections)
                    .set({
                        result: "VALIDATED",
                        remarks: remarks || null
                    })
                    .where({ ID: inspectionID })
            );

            return "Inspection validated successfully.";
        });

        return super.init();
    }
};