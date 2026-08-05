import { randomBytes } from "crypto";

export function createFuneralAccessToken() {
  return randomBytes(18).toString("base64url");
}

export type FuneralFormData = {
  hasBsn: boolean; unbornUnder24Weeks: boolean | null;
  deceasedBsn: string; deceasedLastName: string; deceasedFirstName: string; deceasedBirthDate: string;
  deceasedBirthPlace: string; deceasedGender: string; deceasedStreet: string; deceasedHouseNumber: string;
  deceasedPostalCode: string; deceasedCity: string; deceasedCountry: string; deathPlace: string;
  deathDate: string; deathTime: string; naturalDeath: string; bodyFound: string; maritalStatus: string;
  partnerLastName: string; partnerFirstName: string; partnerBirthDate: string;
  applicantLastName: string; applicantFirstName: string; applicantRelationship: string; applicantBirthDate: string;
  applicantBirthPlace: string; applicantStreet: string; applicantHouseNumber: string; applicantPostalCode: string;
  applicantCity: string; applicantCountry: string; applicantBsn: string; applicantPhone: string; applicantEmail: string;
  burialLocation: string; gravePeriod: string; graveType: string; signatureName: string; acceptedCosts: boolean;
};
