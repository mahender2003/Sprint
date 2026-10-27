using animaladoption as db from '../db/schema';

@requires: 'Admin'
service AdminService {

    entity Animals as projection on db.Animals;
    entity Shelters as projection on db.Shelters;
    entity Users as projection on db.Users;
    entity AdoptionApplications as projection on db.AdoptionApplications;
    entity Adoptions as projection on db.Adoptions;
    entity HealthRecords as projection on db.HealthRecords;
    entity Inspections as projection on db.Inspections;

    action getDashboard() returns String;

  action approveApplication(
    applicationID : UUID,
    remarks : String(500)
) returns String;

action rejectApplication(
    applicationID : UUID,
    remarks : String(500)
) returns String;

    action scheduleInspection(
        adoptionID : UUID,
        inspectorID : UUID,
        inspectionDate : Date
    ) returns UUID;

    action validateInspection(
        inspectionID : UUID,
        remarks : String(500)
    ) returns String;
}