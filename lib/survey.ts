import { randomBytes } from "crypto";

export const DONOR_SURVEY_TEMPLATE = {
  key: "DONOR_JOURNEY",
  name: "Donateurstraject",
  questions: [
    "Bent u al donateur bij Masjid Ghausia?",
    "Wilt u donateur worden van Masjid Ghausia?",
    "Wilt u Masjid Ghausia steunen met een maandelijkse donatie?"
  ]
} as const;

export const ONE_TIME_DONATION_TEMPLATE_KEY = "ONE_TIME_DONATION";

export type DonorSurveyAnswers = {
  isExistingDonor: boolean;
  wantsToBecomeDonor: boolean | null;
  wantsMonthlyDonation: boolean | null;
  monthlyAmountCents: number | null;
  directDebitConsent: boolean;
};

export type OneTimeDonationAnswers = {
  wantsOneTimeDonation: boolean;
  oneTimeAmountCents: number | null;
};

export function createSurveySlug() {
  return `donateurs-${randomBytes(6).toString("base64url").toLowerCase()}`;
}

export function surveyAvailability(survey: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }, now = new Date()) {
  if (!survey.isActive) return "inactive" as const;
  if (survey.startsAt && survey.startsAt > now) return "scheduled" as const;
  if (survey.endsAt && survey.endsAt < now) return "closed" as const;
  return "open" as const;
}

export function surveyStatusLabel(survey: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }) {
  const status = surveyAvailability(survey);
  return status === "open" ? "Open" : status === "scheduled" ? "Ingepland" : status === "closed" ? "Gesloten" : "Uitgeschakeld";
}
