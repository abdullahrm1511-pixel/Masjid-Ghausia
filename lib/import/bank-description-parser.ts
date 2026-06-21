import { normalizeIban } from "@/lib/iban";

export type BankDescriptionParseResult = {
  donorIban?: string;
  lidnummer?: string;
  contributionYear?: number;
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

function exactIbanPattern(flags = "gi") {
  return new RegExp(String.raw`\bNL\s*\d\s*\d\s*[A-Z]\s*[A-Z]\s*[A-Z]\s*[A-Z](?:\s*\d){10}\b`, flags);
}

function extractDonorIban(description: string, warnings: string[]) {
  const candidates = [...description.matchAll(exactIbanPattern())]
    .map((match) => normalizeIban(match[0]))
    .filter(Boolean);

  const labelledFallback = description.match(/\bIBAN\s*[:/]\s*(NL[0-9A-Z\s]{10,30})(?=\s+(?:BIC|Naam|Name|Omschrijving|Description)\b|\/BIC\/|\/NAME\/|$)/i);
  const detectedIban = candidates.find((candidate) => /^NL/i.test(candidate)) ?? normalizeIban(labelledFallback?.[1]);
  if (!detectedIban) {
    return undefined;
  }
  return detectedIban;
}

function extractContributionYear(description: string) {
  const direct = description.match(new RegExp(`\\b${contributionYearLabelPattern.source}\\D*(20\\s?\\d{2})\\b`, "i"));
  if (direct) return Number(direct[1].replace(/\s+/g, ""));
  const loose = description.match(/\b(20\s?\d{2})\b/);
  return loose ? Number(loose[1].replace(/\s+/g, "")) : undefined;
}

export function parseBankDescription(description: string): BankDescriptionParseResult {
  const rawDescription = String(description ?? "");
  const warnings: string[] = [];
  const normalized = compactSpaces(rawDescription.replace(/\r?\n/g, " "));
  const lidnummer =
    normalizeRegistrationNumber(normalized.match(new RegExp(`\\b${registrationLabelPattern.source}\\s*[:.]?\\s*(11\\s*[- ]?\\s*\\d{3,6})`, "i"))?.[1] ?? "") ??
    normalizeRegistrationNumber(normalized);
  const donorIban = extractDonorIban(normalized, warnings);
  const contributionYear = extractContributionYear(normalized);

  if (!lidnummer) warnings.push("Geen lidnummer gevonden");

  return {
    donorIban,
    lidnummer,
    contributionYear,
    rawDescription,
    warnings
  };
}
