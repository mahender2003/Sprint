const cds = require("@sap/cds");

module.exports = class UserService extends cds.ApplicationService {
    async init() {
        const db = cds.entities("animaladoption");

        const Users = db.Users;
        const Animals = db.Animals;
        const AdoptionApplications = db.AdoptionApplications;
        const Adoptions = db.Adoptions;

        /*
         * Resolve the logged-in XSUAA user to a database Users record.
         * Never use a user ID supplied by the browser to determine ownership.
         */
        const getCurrentUserRecord = async (req, tx) => {
            const principal = req.user || cds.context.user;

            if (!principal || principal._is_anonymous) {
                return req.reject(401, "Please sign in first");
            }

            const email = principal.attr && principal.attr.email;
            const login = principal.id;
            console.log("========== LOGIN DEBUG ==========");
console.log("principal.id =", login);
console.log("principal.email =", email);
console.log("=================================");

            let matches = [];

            if (email) {
                matches = await tx.run(
                    SELECT.from(Users).where({
                        email: String(email).trim().toLowerCase()
                    })
                );

                // Some databases compare strings case-sensitively.
                if (!matches.length) {
                    const emailMatches = await tx.run(
                        SELECT.from(Users)
                    );

                    matches = emailMatches.filter(
                        user => user.email &&
                            user.email.toLowerCase() ===
                            String(email).trim().toLowerCase()
                    );
                }
            }

            // Fallback: XSUAA username must match the database authId.
            if (!matches.length && login) {
                matches = await tx.run(
                    SELECT.from(Users).where({ authId: login })
                );
            }
            console.log("matches found:", matches.length);
console.log(JSON.stringify(matches, null, 2));

            if (matches.length !== 1) {
                return req.reject(
                    403,
                    "Your login could not be matched to exactly one user record. " +
                    "Check the email/authId mapping in the Users table."
                );
            }

            const user = matches[0];

            if (user.status !== "ACTIVE") {
                return req.reject(403, "Your user account is not active");
            }

            return user;
        };

        const getOwnedApplication = async (req, tx, applicationID) => {
            const user = await getCurrentUserRecord(req, tx);

            const application = await tx.run(
                SELECT.one.from(AdoptionApplications).where({
                    ID: applicationID
                })
            );

            if (!application) {
                return req.reject(404, "Application not found");
            }

            if (application.applicant_ID !== user.ID) {
                return req.reject(
                    403,
                    "You cannot access another user's application"
                );
            }

            return { user, application };
        };

        this.on("getCurrentUser", async (req) => {
            const tx = cds.tx(req);
            const user = await getCurrentUserRecord(req, tx);

            return {
                ID: user.ID,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                status: user.status
            };
        });

        this.on("applyForAdoption", async (req) => {
            const tx = cds.tx(req);
            const user = await getCurrentUserRecord(req, tx);

            const animalID = req.data.animalID;

            const animal = await tx.run(
                SELECT.one.from(Animals).where({ ID: animalID })
            );

            if (!animal) {
                return req.reject(404, "Animal not found");
            }

            if (animal.status !== "AVAILABLE") {
                return req.reject(
                    400,
                    "Animal is not available for adoption"
                );
            }

            const existing = await tx.run(
                SELECT.one.from(AdoptionApplications).where({
                    animal_ID: animalID,
                    applicant_ID: user.ID,
                    status: { "!=": "WITHDRAWN" }
                })
            );

            if (existing) {
                return req.reject(
                    400,
                    "You already have an active application for this animal"
                );
            }

            const id = cds.utils.uuid();

            await tx.run(
                INSERT.into(AdoptionApplications).entries({
                    ID: id,
                    animal_ID: animalID,
                    applicant_ID: user.ID,
                    applicationDate: new Date().toISOString().slice(0, 10),
                    reasonForAdoption: req.data.reasonForAdoption || "",
                    housingDetails: req.data.housingDetails || "",
                    petExperience: req.data.petExperience || "",
                    status: "SUBMITTED"
                })
            );

            return id;
        });

        this.on("getUserApplications", async (req) => {
            const tx = cds.tx(req);
            const user = await getCurrentUserRecord(req, tx);

            const rows = await tx.run(
                SELECT.from(AdoptionApplications)
                    .columns(
                        "ID",
                        "animal_ID",
                        "applicationDate",
                        "reasonForAdoption",
                        "housingDetails",
                        "petExperience",
                        "status",
                        "staffRemarks"
                    )
                    .where({ applicant_ID: user.ID })
                    .orderBy({ applicationDate: "desc" })
            );

            return rows;
        });

        this.on("getUserAdoptions", async (req) => {
            const tx = cds.tx(req);
            const user = await getCurrentUserRecord(req, tx);

            const applicationIDs = SELECT.from(AdoptionApplications)
                .columns("ID")
                .where({ applicant_ID: user.ID });

            return tx.run(
                SELECT.from(Adoptions)
                    .columns(
                        "ID",
                        "application_ID",
                        "animal_ID",
                        "adoptionDate",
                        "status",
                        "remarks"
                    )
                    .where({
                        application_ID: { in: applicationIDs }
                    })
                    .orderBy({ adoptionDate: "desc" })
            );
        });

        this.on("withdrawApplication", async (req) => {
            const tx = cds.tx(req);

            const result = await getOwnedApplication(
                req,
                tx,
                req.data.applicationID
            );

            if (result.application.status !== "SUBMITTED") {
                return req.reject(
                    400,
                    "Only SUBMITTED applications can be withdrawn"
                );
            }

            await tx.run(
                UPDATE(AdoptionApplications)
                    .set({ status: "WITHDRAWN" })
                    .where({ ID: result.application.ID })
            );

            return "Application withdrawn successfully";
        });

        this.on("editApplication", async (req) => {
            const tx = cds.tx(req);

            const result = await getOwnedApplication(
                req,
                tx,
                req.data.applicationID
            );

            if (
                !["SUBMITTED", "UNDER_REVIEW"].includes(
                    result.application.status
                )
            ) {
                return req.reject(
                    400,
                    "Only pending applications can be edited"
                );
            }

            if (
                !req.data.reasonForAdoption ||
                !req.data.housingDetails
            ) {
                return req.reject(
                    400,
                    "Reason for adoption and housing details are required"
                );
            }

            await tx.run(
                UPDATE(AdoptionApplications)
                    .set({
                        reasonForAdoption: req.data.reasonForAdoption,
                        housingDetails: req.data.housingDetails,
                        petExperience: req.data.petExperience || ""
                    })
                    .where({ ID: result.application.ID })
            );

            return "Application updated successfully";
        });

        this.on("deleteApplication", async (req) => {
            const tx = cds.tx(req);

            const result = await getOwnedApplication(
                req,
                tx,
                req.data.applicationID
            );

            if (
                !["SUBMITTED", "UNDER_REVIEW"].includes(
                    result.application.status
                )
            ) {
                return req.reject(
                    400,
                    "Only pending applications can be deleted"
                );
            }

            await tx.run(
                DELETE.from(AdoptionApplications).where({
                    ID: result.application.ID
                })
            );

            return "Application deleted successfully";
        });

        this.on("updateUserProfile", async (req) => {
    const tx = cds.tx(req);
    const user = await getCurrentUserRecord(req, tx);

    if (
        !req.data.firstName ||
        !req.data.lastName ||
        !req.data.email
    ) {
        return req.reject(
            400,
            "First name, last name and email are required"
        );
    }

    if (
        String(req.data.email).trim().toLowerCase() !==
        String(user.email).trim().toLowerCase()
    ) {
        return req.reject(
            400,
            "Your login email cannot be changed from this profile"
        );
    }

    await tx.run(
        UPDATE(Users)
            .set({
                firstName: req.data.firstName,
                lastName: req.data.lastName,
                phoneNumber: req.data.phoneNumber || null
            })
            .where({ ID: user.ID })
    );

    return "Profile updated successfully";
});
        return super.init();
    }
};