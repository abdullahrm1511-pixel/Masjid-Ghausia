import { normalizeIban } from "@/lib/iban";

export type BankDescriptionParseResult = {
  donorIban?: string;
  detectedIban?: string;
  payerName?: string;
  donorName?: string;
  lidnummer?: string;
  paymentTargetName?: string;
  paymentTargetRegistrationNumber?: string;
  contributionYear?: number;
  birthDateText?: string;
  explanations: string[];
  reviewReasons: string[];
  rawDescription: string;
  warnings: string[];
};

function compactSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeRegistrationNumber(value: string) {
  const match = value.match(/\b(11)\s*[- ]?\s*(\d{3,6})\b/i);
  if (!match) return undefined;
  return `${match[1]}-${match[2]}`;
}

const registrationLabelPattern =
  /(?:lidmaatschap\s*nr|lid\s*nr|lidnummer|registrat(?:ie|ienr|ienummer|ie\s*nr|ie\s*nummer)|reg(?:ister|istratie)?\s*nr|reg\s*nummer|registration\s*(?:number|nr)?|registerd|registered)/i;

const contributionYearLabelPattern =
  /(?:contributiejaar|contributie|contribu?tie|contrib|contri|bijdragejaar|bijdrage|jaar(?:\s*bedrag)?|year)/i;

const birthDateLabelPattern =
  /(?:geboorte\s*datum|geboortedatum|geb(?:o?rte)?\.?\s*datum|geboren\s*op|dob|birth\s*date|date\s*of\s*birth)/i;

const relationStopWordsPattern =
  /(?:kenmerk|eref|remi|notprovided|contributie|contribu?tie|contrib|contri|bijdragejaar|bijdrage|jaar(?:\s*bedrag)?|omschrijving|description|registratie|registratienr|registratienummer|reg\s*nr|geboortedatum|geboorte\s*datum)/i;

function exactIbanPattern(flags = "gi") {
  return new RegExp(String.raw`\bNL\s*\d\s*\d\s*[A-Z]\s*[A-Z]\s*[A-Z]\s*[A-Z](?:\s*\d){10}\b`, flags);
}

function cleanName(value?: string) {
  if (!value) return undefined;
  const cleaned = compactSpaces(
    value
      .replace(new RegExp(`\\b(?:omschrijving|description|kenmerk|eref|remi|bic|iban|lidmaatschap|${registrationLabelPattern.source})\\b.*$`, "i"), "")
      .replace(/^[.,;:/\-\s]+/g, "")
      .replace(/[.,;:/-]+$/g, "")
  );
  return cleaned || undefined;
}

function extractDonorIban(description: string, warnings: string[]) {
  const candidates = [...description.matchAll(exactIbanPattern())]
    .map((match) => normalizeIban(match[0]))
    .filter(Boolean);

  const labelledFallback = description.match(/\bIBAN\s*[:/]\s*(NL[0-9A-Z\s]{10,30})(?=\s+(?:BIC|Naam|Name|Omschrijving|Description)\b|\/BIC\/|\/NAME\/|$)/i);
  const detectedIban = candidates.find((candidate) => /^NL/i.test(candidate)) ?? normalizeIban(labelledFallback?.[1]);
  if (!detectedIban) {
    return { donorIban: undefined, detectedIban: undefined };
  }
  return { donorIban: detectedIban, detectedIban };
}

function extractName(description: string) {
  const mijnNaam = description.match(/mijn\s+naam\s*:\s*([^,\n\r/]+)/i);
  const naam = description.match(/\bNaam\s*:\s*([^\n\r/]+)/i);
  const slashName = description.match(/\/NAME\/([^/]+)/i);
  return cleanName(mijnNaam?.[1]) ?? cleanName(naam?.[1]) ?? cleanName(slashName?.[1]);
}

function extractContributionYear(description: string) {
  const direct = description.match(new RegExp(`\\b${contributionYearLabelPattern.source}\\D*(20\\s?\\d{2})\\b`, "i"));
  if (direct) return Number(direct[1].replace(/\s+/g, ""));
  const loose = description.match(/\b(20\s?\d{2})\b/);
  return loose ? Number(loose[1].replace(/\s+/g, "")) : undefined;
}

function extractBirthDateText(description: string) {
  const match = description.match(new RegExp(`\\b${birthDateLabelPattern.source}\\s*[:.]?\\s*(\\d{1,2}[./-]\\d{1,2}[./-]\\d{2,4})\\b`, "i"));
  return match?.[1];
}

function extractPaymentTarget(description: string) {
  const labelWithNumber = description.match(new RegExp(`\\b${registrationLabelPattern.source}\\s*[:.]?\\s*(11\\s*[- ]?\\s*\\d{3,6})\\s*([^/]+)?`, "i"));
  const registrationNumber = normalizeRegistrationNumber(labelWithNumber?.[1] ?? "");
  const nameAfterNumber = cleanRelationName(labelWithNumber?.[2]);

  const contributionFor = description.match(/\b(?:contributie|contribu?tie|contrib|contri|bijdrage)\s+voor\s+([^,/]+)/i);
  const contributionForName = cleanRelationName(contributionFor?.[1]);

  return {
    registrationNumber,
    name: nameAfterNumber ?? contributionForName
  };
}

function cleanRelationName(value?: string) {
  if (!value) return undefined;
  const cleaned = compactSpaces(
    value
      .replace(new RegExp(`\\b${relationStopWordsPattern.source}\\b.*$`, "i"), "")
      .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b.*$/i, "")
      .replace(/^[.,;:/\-\s]+/g, "")
      .replace(/[.,;:/-]+$/g, "")
  );
  return cleaned || undefined;
}

export function parseBankDescription(description: string): BankDescriptionParseResult {
  const rawDescription = String(description ?? "");
  const warnings: string[] = [];
  const explanations: string[] = [];
  const reviewReasons: string[] = [];
  const normalized = compactSpaces(rawDescription.replace(/\r?\n/g, " "));
  const paymentTarget = extractPaymentTarget(normalized);
  const lidnummer =
    paymentTarget.registrationNumber ??
    normalizeRegistrationNumber(normalized.match(new RegExp(`\\b${registrationLabelPattern.source}\\s*[:.]?\\s*(11\\s*[- ]?\\s*\\d{3,6})`, "i"))?.[1] ?? "") ??
    normalizeRegistrationNumber(normalized);
  const { donorIban, detectedIban } = extractDonorIban(normalized, warnings);
  const payerName = extractName(normalized);
  const donorName = paymentTarget.name ?? payerName;
  const paymentTargetRegistrationNumber = paymentTarget.registrationNumber ?? (paymentTarget.name ? lidnummer : undefined);
  const contributionYear = extractContributionYear(normalized);
  const birthDateText = extractBirthDateText(normalized);

  if (donorIban) explanations.push("IBAN uit de omschrijving gelezen, niet uit de kolom Rekeningnummer.");
  if (paymentTargetRegistrationNumber) explanations.push(`Betaling gekoppeld aan lidnummer ${paymentTargetRegistrationNumber} uit de omschrijving.`);
  if (paymentTarget.name && payerName && paymentTarget.name.toLowerCase() !== payerName.toLowerCase()) {
    explanations.push(`Naam betaler is ${payerName}; betalingsdoel lijkt ${paymentTarget.name}.`);
  }

  return {
    donorIban,
    detectedIban,
    payerName,
    donorName,
    lidnummer,
    paymentTargetName: paymentTarget.name,
    paymentTargetRegistrationNumber,
    contributionYear,
    birthDateText,
    explanations,
    reviewReasons,
    rawDescription,
    warnings
  };
}
