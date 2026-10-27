namespace animaladoption.types;

// ======================================================
// Reusable Types
// ======================================================

type Name100         : String(100);
type Name50          : String(50);

type Description500  : String(500);

type Email           : String(255);
type Phone           : String(20);

type PostalCode      : String(20);

type Website         : String(255);

type Money           : Decimal(10,2);
type Weight          : Decimal(10,2);

type ImageURL        : String(500);

// Stores text content instead of uploaded files
type FileContent     : LargeString;

// ======================================================
// Address Aspect
// ======================================================

aspect Address {

    addressLine1 : String(150);
    addressLine2 : String(150);

    city         : Name100;
    state        : Name100;

    postalCode   : PostalCode;
    country      : Name50;
}

// ======================================================
// User
// ======================================================

type UserRole : String enum {
    USER;
    ADMIN;
}

type UserStatus : String enum {
    ACTIVE;
    INACTIVE;
}

// ======================================================
// Animal
// ======================================================

type Gender : String enum {
    MALE;
    FEMALE;
}

type AnimalStatus : String enum {
    AVAILABLE;
    RESERVED;
    ADOPTED;
    UNDER_TREATMENT;
}

// ======================================================
// Adoption Application
// ======================================================

type ApplicationStatus : String enum {
    SUBMITTED;
    UNDER_REVIEW;
    APPROVED;
    REJECTED;
    WITHDRAWN;
}

// ======================================================
// Adoption
// ======================================================

type AdoptionStatus : String enum {
    IN_PROGRESS;
    COMPLETED;
    CANCELLED;
}

// ======================================================
// Health
// ======================================================

type HealthStatus : String enum {
    HEALTHY;
    SICK;
    INJURED;
    UNDER_TREATMENT;
    CRITICAL;
}

type VaccinationStatus : String enum {
    VACCINATED;
    PARTIALLY_VACCINATED;
    NOT_VACCINATED;
}

// ======================================================
// Inspection
// ======================================================

type InspectionResult : String enum {
    VALIDATED;
    FOLLOW_UP_REQUIRED;
    FAILED;
}