using animaladoption as db from '../db/schema';

type UserProfile {
    ID          : UUID;
    firstName   : String(100);
    lastName    : String(100);
    email       : String(255);
    phoneNumber : String(30);
    role        : String(30);
    status      : String(30);
}

type UserApplication {
    ID                : UUID;
    animal_ID         : UUID;
    applicationDate   : Date;
    reasonForAdoption : String(500);
    housingDetails    : String(500);
    petExperience     : String(500);
    status            : String(30);
    staffRemarks      : String(500);
}

type UserAdoption {
    ID           : UUID;
    application_ID : UUID;
    animal_ID    : UUID;
    adoptionDate : Date;
    status       : String(30);
    remarks      : String(500);
}

@requires: 'User'
service UserService {

    @readonly
    entity Animals as projection on db.Animals;

    @readonly
    entity Shelters as projection on db.Shelters;

    @readonly
    entity HealthRecords as projection on db.HealthRecords;

    @readonly
    entity Inspections as projection on db.Inspections;

    @readonly
    action getCurrentUser() returns UserProfile;

    action applyForAdoption(
        animalID : UUID,
        reasonForAdoption : String(500),
        housingDetails : String(500),
        petExperience : String(500)
    ) returns UUID;

    action withdrawApplication(
        applicationID : UUID
    ) returns String;

    action editApplication(
        applicationID : UUID,
        reasonForAdoption : String(500),
        housingDetails : String(500),
        petExperience : String(500)
    ) returns String;

    action deleteApplication(
        applicationID : UUID
    ) returns String;

    action getUserApplications()
        returns array of UserApplication;

    action getUserAdoptions()
        returns array of UserAdoption;

    action updateUserProfile(
        firstName : String(100),
        lastName : String(100),
        email : String(255),
        phoneNumber : String(30)
    ) returns String;
}