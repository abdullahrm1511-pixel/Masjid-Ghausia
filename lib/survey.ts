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

export type FixedSurveySettings = {
  contactHeading: string;
  firstNameLabel: string;
  lastNameLabel: string;
  phoneLabel: string;
  emailLabel: string;
  question1: string;
  question2: string;
  question3: string;
  yesLabel: string;
  noLabel: string;
  joinYesLabel: string;
  joinNoLabel: string;
  existingDonorNote: string;
  noMembershipNote: string;
  monthlyNoNote: string;
  monthlyAmountLabel: string;
  consentText: string;
  submitLabel: string;
  oneTimeHeading: string;
  oneTimeNameLabel: string;
  oneTimeAmountLabel: string;
  oneTimeAmountPlaceholder: string;
  oneTimeSubmitLabel: string;
  privacyText: string;
};

export const defaultFixedSurveySettings: FixedSurveySettings = {
  contactHeading: "Uw gegevens",
  firstNameLabel: "Voornaam",
  lastNameLabel: "Achternaam",
  phoneLabel: "Mobiel nummer",
  emailLabel: "E-mailadres",
  question1: "Bent u al donateur bij Masjid Ghausia?",
  question2: "Wilt u donateur worden van Masjid Ghausia?",
  question3: "Wilt u Masjid Ghausia steunen met een maandelijkse donatie?",
  yesLabel: "Ja",
  noLabel: "Nee",
  joinYesLabel: "Ja, ik wil donateur worden",
  joinNoLabel: "Nee, op dit moment niet",
  existingDonorNote: "Dank voor uw bevestiging. Dit is de laatste vraag; u kunt uw antwoord verzenden.",
  noMembershipNote: "Dank voor uw tijd. Dit is de laatste vraag; u kunt uw antwoord verzenden.",
  monthlyNoNote: "Geen probleem. U kunt uw antwoord nu verzenden.",
  monthlyAmountLabel: "Zelfgekozen bedrag per maand (€)",
  consentText: "Ik geef toestemming om na het afronden van de beveiligde machtigingsstap het gekozen bedrag maandelijks automatisch te laten afschrijven. Tot die definitieve machtiging is afgerond, wordt er niets afgeschreven.",
  submitLabel: "Antwoorden verzenden",
  oneTimeHeading: "Eenmalige donatie",
  oneTimeNameLabel: "Naam",
  oneTimeAmountLabel: "Bedrag (€)",
  oneTimeAmountPlaceholder: "Bijvoorbeeld 25,00",
  oneTimeSubmitLabel: "Verder naar veilig betalen",
  privacyText: "Uw gegevens worden alleen gebruikt voor deze enquête en de opvolging daarvan."
};

export function parseFixedSurveySettings(value: unknown): FixedSurveySettings {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(defaultFixedSurveySettings).map(([key, fallback]) => {
    const entered = String(raw[key] ?? "").trim();
    return [key, entered ? entered.slice(0, key === "consentText" ? 1000 : 500) : fallback];
  })) as FixedSurveySettings;
}

export const surveyQuestionTypes = ["SHORT_TEXT", "LONG_TEXT", "MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN", "YES_NO", "EMAIL", "PHONE", "NUMBER", "DATE", "FILE"] as const;
export type SurveyQuestionType = (typeof surveyQuestionTypes)[number];
export type SurveyQuestion = {
  id: string;
  title: string;
  description?: string;
  type: SurveyQuestionType;
  required: boolean;
  options?: string[];
  showWhen?: {
    questionId: string;
    operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS";
    value: string;
  };
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
  DATE: "Datum",
  FILE: "Bestand uploaden"
};

export function parseSurveyQuestions(value: unknown): SurveyQuestion[] {
  if (!Array.isArray(value)) return [];
  const parsed = value.flatMap((item) => {
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
    const rawCondition = raw.showWhen && typeof raw.showWhen === "object" ? raw.showWhen as Record<string, unknown> : null;
    const operator = ["EQUALS", "NOT_EQUALS", "CONTAINS"].includes(String(rawCondition?.operator)) ? String(rawCondition?.operator) as "EQUALS" | "NOT_EQUALS" | "CONTAINS" : "EQUALS";
    const showWhen = rawCondition ? { questionId: String(rawCondition.questionId ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80), operator, value: String(rawCondition.value ?? "").trim().slice(0, 150) } : undefined;
    return [{ id, title, description: String(raw.description ?? "").trim().slice(0, 500) || undefined, type, required: raw.required === true, options, showWhen }];
  }).slice(0, 100);
  const earlierIds = new Set<string>();
  return parsed.map((question) => {
    const validCondition = question.showWhen?.questionId && earlierIds.has(question.showWhen.questionId) && question.showWhen.value;
    earlierIds.add(question.id);
    return validCondition ? question : { ...question, showWhen: undefined };
  });
}

export function isSurveyQuestionVisible(question: SurveyQuestion, answers: Record<string, string | string[]>) {
  if (!question.showWhen) return true;
  const answer = answers[question.showWhen.questionId];
  const values = Array.isArray(answer) ? answer : answer === undefined || answer === "" ? [] : [answer];
  const matches = values.includes(question.showWhen.value);
  if (question.showWhen.operator === "NOT_EQUALS") return !matches;
  if (question.showWhen.operator === "CONTAINS") return values.some((value) => value.toLowerCase().includes(question.showWhen!.value.toLowerCase()));
  return matches;
}

export function visibleSurveyQuestions(questions: SurveyQuestion[], answers: Record<string, string | string[]>) {
  const visible: SurveyQuestion[] = [];
  const visibleAnswers: Record<string, string | string[]> = {};
  for (const question of questions) {
    if (!isSurveyQuestionVisible(question, visibleAnswers)) continue;
    visible.push(question);
    if (answers[question.id] !== undefined) visibleAnswers[question.id] = answers[question.id];
  }
  return visible;
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

export function surveyAvailability(survey: { isActive: boolean; isDraft?: boolean; startsAt: Date | null; endsAt: Date | null }, now = new Date()) {
  if (survey.isDraft) return "draft" as const;
  if (!survey.isActive) return "inactive" as const;
  if (survey.startsAt && survey.startsAt > now) return "scheduled" as const;
  if (survey.endsAt && survey.endsAt < now) return "closed" as const;
  return "open" as const;
}

export function surveyStatusLabel(survey: { isActive: boolean; isDraft?: boolean; startsAt: Date | null; endsAt: Date | null }) {
  const status = surveyAvailability(survey);
  return status === "open" ? "Open" : status === "draft" ? "Concept" : status === "scheduled" ? "Ingepland" : status === "closed" ? "Gesloten" : "Uitgeschakeld";
}
