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
export const CUSTOM_SURVEY_TEMPLATE_KEY = "CUSTOM_FORM";

export const surveyQuestionTypes = ["SHORT_TEXT", "LONG_TEXT", "MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN", "YES_NO", "EMAIL", "PHONE", "NUMBER", "DATE"] as const;
export type SurveyQuestionType = (typeof surveyQuestionTypes)[number];
export type SurveyQuestion = {
  id: string;
  title: string;
  description?: string;
  type: SurveyQuestionType;
  required: boolean;
  options?: string[];
};

export const surveyQuestionTypeLabels: Record<SurveyQuestionType, string> = {
  SHORT_TEXT: "Kort antwoord",
  LONG_TEXT: "Lang antwoord",
  MULTIPLE_CHOICE: "Meerkeuze (een antwoord)",
  CHECKBOXES: "Selectievakjes (meerdere antwoorden)",
  DROPDOWN: "Dropdown",
  YES_NO: "Ja / nee",
  EMAIL: "E-mailadres",
  PHONE: "Telefoonnummer",
  NUMBER: "Getal",
  DATE: "Datum"
};

export function parseSurveyQuestions(value: unknown): SurveyQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const type = surveyQuestionTypes.includes(raw.type as SurveyQuestionType) ? raw.type as SurveyQuestionType : "SHORT_TEXT";
    const title = String(raw.title ?? "").trim().slice(0, 300);
    const id = String(raw.id ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    if (!id || !title) return [];
    const acceptsOptions = ["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(type);
    const options = acceptsOptions && Array.isArray(raw.options)
      ? raw.options.map((option) => String(option).trim().slice(0, 150)).filter(Boolean).slice(0, 30)
      : undefined;
    return [{ id, title, description: String(raw.description ?? "").trim().slice(0, 500) || undefined, type, required: raw.required === true, options }];
  }).slice(0, 100);
}

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
