using {
    cuid,
    managed
} from '@sap/cds/common';

using animaladoption.types as common from './common';

namespace animaladoption;

// ======================================================
// Users
// ======================================================

entity Users : cuid, managed, common.Address {

    authId : String(255);

    firstName      : common.Name100;
    lastName       : common.Name100;

    email          : common.Email;
    phoneNumber    : common.Phone;

    role           : common.UserRole;
    status         : common.UserStatus;

    applications   : Association to many AdoptionApplications
                        on applications.applicant = $self;
}

// ======================================================
// Shelters
// ======================================================

entity Shelters : cuid, managed, common.Address {

    shelterName       : common.Name100;
    shelterCode       : String(20);

    contactNumber     : common.Phone;
    email             : common.Email;
    website           : common.Website;

    capacity          : Integer;
    currentOccupancy  : Integer;

    operatingTime     : Time;
    closingTime       : Time;

    shelterType       : common.Name50;
    licenseNumber     : String(50);

    animals           : Association to many Animals
                            on animals.shelter = $self;
}

// ======================================================
// Animals
// ======================================================

entity Animals : cuid, managed {

    shelter : Association to Shelters;

    name                : common.Name100;
    species             : common.Name50;
    breed               : common.Name100;

    gender              : common.Gender;
    age                 : Integer;

    arrivalDate         : Date;

    status              : common.AnimalStatus;

    vaccinationStatus   : common.VaccinationStatus;

    adoptionFee         : common.Money;

    isSpayedOrNeutered  : Boolean;

    photo               : common.ImageURL;

    description         : String(1000);

    healthRecords : Association to many HealthRecords
                        on healthRecords.animal = $self;

    applications : Association to many AdoptionApplications
                        on applications.animal = $self;
}

// ======================================================
// Adoption Applications
// ======================================================

entity AdoptionApplications : cuid, managed {

    animal              : Association to Animals;

    applicant           : Association to Users;

    applicationDate     : Date;

    reasonForAdoption   : common.Description500;
    housingDetails      : common.Description500;
    petExperience       : common.Description500;

    status              : common.ApplicationStatus;

    reviewedBy          : Association to Users;

    staffRemarks        : common.Description500;

    supportingDocument  : common.FileContent;

    adoption            : Association to one Adoptions
                            on adoption.application = $self;
}

// ======================================================
// Adoptions
// ======================================================

entity Adoptions : cuid, managed {

    application         : Association to AdoptionApplications;

    animal              : Association to Animals;

    adoptionDate        : Date;

    status              : common.AdoptionStatus;

    completedBy         : Association to Users;

    remarks             : common.Description500;

    inspections         : Association to many Inspections
                            on inspections.adoption = $self;
}

// ======================================================
// Health Records
// ======================================================

entity HealthRecords : cuid, managed {

    animal             : Association to Animals;

    checkupDate        : Date;

    healthStatus       : common.HealthStatus;

    diagnosis          : common.Description500;
    treatment          : common.Description500;
    medication         : common.Description500;

    veterinarianName   : common.Name100;

    weight             : common.Weight;

    nextCheckupDate    : Date;

    remarks            : common.Description500;

    medicalDocument    : common.FileContent;
}

// ======================================================
// Inspections
// ======================================================

entity Inspections : cuid, managed {

    adoption           : Association to Adoptions;

    inspector          : Association to Users;

    inspectionDate     : Date;

    inspectionType     : String(50);

    assignedDetails    : common.Description500;

    result             : common.InspectionResult;

    remarks            : common.Description500;

    inspectionDocument : common.FileContent;
}