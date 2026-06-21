import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { normalizeIban } from "@/lib/iban";
import { parseBankDescription } from "@/lib/import/bank-description-parser";

export type ImportMode = "donor-list" | "bank-transactions" | "member-personal-details";
export type ImportAction =
  | "NEW"
  | "POSSIBLE_MATCH"
  | "DUPLICATE"
  | "INVALID"
  | "LINK_PAYMENT_TO_EXISTING_DONOR"
  | "PAYMENT_ONLY_REQUIRES_REVIEW"
  | "DUPLICATE_PAYMENT"
  | "DUPLICATE_IMPORT_ROW"
  | "INVALID_REQUIRES_REVIEW";

export type ImportPreviewRow = {
  rowNumber: number;
  importMode: ImportMode;
  registrationNumber: string;
  fullName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  relationshipToMember?: string;
  legacyMemberDetailKey?: string;
  legacyAddressKey?: string;
  addressLine1?: string;
  gender?: string;
  maritalStatus?: string;
  birthPlace?: string;
  iban: string;
  amountCents: number;
  paidAt: string | null;
  organizationAccountNumber?: string;
  rawDescription?: string;
  contributionYear?: number;
  email?: string;
  phone?: string;
  birthDate?: string | null;
  detectedAction: ImportAction;
  existingDonorId?: string;
  reviewReasons: string[];
  warnings: string[];
  errors: string[];
};

type RawImportRow = {
  rowNumber: number;
  importMode: ImportMode;
  registrationNumber: string;
  legacyMemberDetailKey: string;
  legacyAddressKey: string;
  addressLine1: string;
  firstName: string;
  middleName: string;
  lastName: string;
  relationshipToMember: string;
  gender: string;
  maritalStatus: string;
  birthPlace: string;
  iban: string;
  fullName: string;
  amount: unknown;
  date: unknown;
  organizationAccountNumber: string;
  description: string;
  rentDate: unknown;
  email: string;
  phone: string;
  birthDate: unknown;
};

const aliases = {
  registrationNumber: ["lid nr", "lidnummer", "registratienummer", "registration number", "registration nr key"],
  legacyMemberDetailKey: ["mem detail nr key", "member detail nr key"],
  legacyAddressKey: ["addr nr key", "address nr key"],
  addressLine1: ["address line 1", "adres", "address"],
  iban: ["rek nr", "iban", "bankrekening", "rekeningnummer"],
  fullName: ["naam", "name"],
  firstName: ["first name", "voornaam"],
  middleName: ["middle name", "middle nam", "tussenvoegsel"],
  lastName: ["surname", "achternaam", "last name"],
  relationshipToMember: ["relationship to member", "relatie tot lid"],
  gender: ["gender", "geslacht"],
  maritalStatus: ["marital status", "burgerlijke staat"],
  birthPlace: ["place of birth", "geboorteplaats"],
  amount: ["transactiebedrag", "bedrag", "betaald bedrag"],
  date: ["datum", "transactie datum", "transactiedatum", "boekdatum", "betaaldatum"],
  email: ["email", "e-mail", "e-mailadres"],
  phone: ["telefoon", "phone", "mobiel"],
  birthDate: ["geboortedatum", "birth date", "date of birth"],
  organizationAccountNumber: ["rekeningnummer"],
  description: ["omschrijving"],
  rentDate: ["rentedatum"]
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_/-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function headerIndex(headers: string[], names: string[]) {
  const normalizedNames = names.map(normalizeHeader);
  return headers.findIndex((header) => normalizedNames.includes(header));
}

function cellText(value: unknown) {
  if (value && typeof value === "object" && "text" in value) {
    return String((value as { text: string }).text ?? "").trim();
  }
  return String(value ?? "").trim();
}

function rowValues(values: ExcelJS.Row["values"]) {
  return Array.isArray(values) ? values.slice(1) : [];
}

function isAllowedSepaTransfer(description: string) {
  const normalized = description
    .toLowerCase()
    .replace(/[/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /\bsepa\s+(?:periodieke\s+)?overboeking\b/.test(normalized);
}

function buildIndexes(headers: string[]) {
  return {
    registrationNumber: headerIndex(headers, aliases.registrationNumber),
    legacyMemberDetailKey: headerIndex(headers, aliases.legacyMemberDetailKey),
    legacyAddressKey: headerIndex(headers, aliases.legacyAddressKey),
    addressLine1: headerIndex(headers, aliases.addressLine1),
    firstName: headerIndex(headers, aliases.firstName),
    middleName: headerIndex(headers, aliases.middleName),
    lastName: headerIndex(headers, aliases.lastName),
    relationshipToMember: headerIndex(headers, aliases.relationshipToMember),
    gender: headerIndex(headers, aliases.gender),
    maritalStatus: headerIndex(headers, aliases.maritalStatus),
    birthPlace: headerIndex(headers, aliases.birthPlace),
    iban: headerIndex(headers, aliases.iban),
    fullName: headerIndex(headers, aliases.fullName),
    amount: headerIndex(headers, aliases.amount),
    date: headerIndex(headers, aliases.date),
    email: headerIndex(headers, aliases.email),
    phone: headerIndex(headers, aliases.phone),
    birthDate: headerIndex(headers, aliases.birthDate),
    organizationAccountNumber: headerIndex(headers, aliases.organizationAccountNumber),
    description: headerIndex(headers, aliases.description),
    rentDate: headerIndex(headers, aliases.rentDate)
  };
}

function detectImportMode(indexes: Record<string, number>): ImportMode {
  if (
    indexes.registrationNumber >= 0 &&
    indexes.legacyAddressKey >= 0 &&
    indexes.relationshipToMember >= 0 &&
    indexes.firstName >= 0 &&
    indexes.lastName >= 0
  ) {
    return "member-personal-details";
  }
  if (indexes.organizationAccountNumber >= 0 && indexes.description >= 0 && indexes.amount >= 0) {
    return "bank-transactions";
  }
  return "donor-list";
}

function headerScore(indexes: Record<string, number>) {
  const generalScore = Object.values(indexes).filter((value) => value >= 0).length;
  const memberScore = [
    indexes.registrationNumber,
    indexes.legacyMemberDetailKey,
    indexes.legacyAddressKey,
    indexes.firstName,
    indexes.lastName,
    indexes.relationshipToMember,
    indexes.birthDate
  ].filter((value) => value >= 0).length;
  const bankScore = [indexes.organizationAccountNumber, indexes.description, indexes.amount, indexes.date].filter((value) => value >= 0).length;
  return Math.max(generalScore, memberScore * 2, bankScore * 2);
}

function findHeaderRow(rows: unknown[][]) {
  let bestMatch: { headerIndex: number; headers: string[]; indexes: Record<string, number>; importMode: ImportMode; score: number } | null = null;
  const maxRows = Math.min(rows.length, 30);
  for (let index = 0; index < maxRows; index += 1) {
    const headers = (rows[index] ?? []).map(normalizeHeader);
    const indexes = buildIndexes(headers);
    const score = headerScore(indexes);
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { headerIndex: index, headers, indexes, importMode: detectImportMode(indexes), score };
    }
  }
  if (bestMatch && bestMatch.score >= 3) return bestMatch;

  const headers = (rows[0] ?? []).map(normalizeHeader);
  const indexes = buildIndexes(headers);
  return { headerIndex: 0, headers, indexes, importMode: detectImportMode(indexes), score: headerScore(indexes) };
}

function rawRowToImportRow(rowNumber: number, values: unknown[], indexes: Record<string, number>, importMode: ImportMode): RawImportRow {
  return {
    rowNumber,
    importMode,
    registrationNumber: indexes.registrationNumber >= 0 ? cellText(values[indexes.registrationNumber]) : "",
    legacyMemberDetailKey: indexes.legacyMemberDetailKey >= 0 ? cellText(values[indexes.legacyMemberDetailKey]) : "",
    legacyAddressKey: indexes.legacyAddressKey >= 0 ? cellText(values[indexes.legacyAddressKey]) : "",
    addressLine1: indexes.addressLine1 >= 0 ? cellText(values[indexes.addressLine1]) : "",
    firstName: indexes.firstName >= 0 ? cellText(values[indexes.firstName]) : "",
    middleName: indexes.middleName >= 0 ? cellText(values[indexes.middleName]) : "",
    lastName: indexes.lastName >= 0 ? cellText(values[indexes.lastName]) : "",
    relationshipToMember: indexes.relationshipToMember >= 0 ? cellText(values[indexes.relationshipToMember]) : "",
    gender: indexes.gender >= 0 ? cellText(values[indexes.gender]) : "",
    maritalStatus: indexes.maritalStatus >= 0 ? cellText(values[indexes.maritalStatus]) : "",
    birthPlace: indexes.birthPlace >= 0 ? cellText(values[indexes.birthPlace]) : "",
    iban: indexes.iban >= 0 ? cellText(values[indexes.iban]) : "",
    fullName: indexes.fullName >= 0 ? cellText(values[indexes.fullName]) : "",
    amount: indexes.amount >= 0 ? values[indexes.amount] : "",
    date: indexes.date >= 0 ? values[indexes.date] : "",
    organizationAccountNumber: indexes.organizationAccountNumber >= 0 ? cellText(values[indexes.organizationAccountNumber]) : "",
    description: indexes.description >= 0 ? cellText(values[indexes.description]) : "",
    rentDate: indexes.rentDate >= 0 ? values[indexes.rentDate] : "",
    email: indexes.email >= 0 ? cellText(values[indexes.email]) : "",
    phone: indexes.phone >= 0 ? cellText(values[indexes.phone]) : "",
    birthDate: indexes.birthDate >= 0 ? values[indexes.birthDate] : ""
  };
}

export function parseExcelDate(value: unknown) {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "number") {
    const asText = String(Math.trunc(value));
    if (/^\d{8}$/.test(asText)) return parseYyyyMmDd(asText);
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
  }
  const text = cellText(value);
  if (!text) return null;
  if (/^\d{8}$/.test(text)) return parseYyyyMmDd(text);
  const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmy) {
    const shortYear = Number(dmy[3]);
    const year = dmy[3].length === 2 ? (shortYear >= 50 ? 1900 + shortYear : 2000 + shortYear) : shortYear;
    const month = Number(dmy[2]);
    const day = Number(dmy[1]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseYyyyMmDd(value: string) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAmountCents(value: unknown) {
  if (typeof value === "number") return Math.round(value * 100);
  const cleaned = cellText(value).replace(/[^\d,.-]/g, "").replace(",", ".");
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function normalizeRegistrationNumberForImport(value: string, importMode: ImportMode) {
  const cleaned = value.trim();
  if (importMode !== "member-personal-details") return cleaned;
  const spacedMatch = cleaned.match(/^11\D+(\d{1,5})$/);
  if (spacedMatch) return `11-${spacedMatch[1].padStart(5, "0")}`;
  if (/^11-\d{1,5}$/.test(cleaned)) {
    const digits = cleaned.split("-")[1] ?? "";
    return `11-${digits.padStart(5, "0")}`;
  }
  if (/^\d{1,5}$/.test(cleaned)) return `11-${cleaned.padStart(5, "0")}`;
  return cleaned;
}

export function splitName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: normalized, lastName: "" };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? ""
  };
}

async function detectAction(row: Omit<ImportPreviewRow, "detectedAction" | "existingDonorId">) {
  if (row.errors.length) {
    return { detectedAction: row.importMode === "bank-transactions" ? "INVALID_REQUIRES_REVIEW" as const : "INVALID" as const };
  }

  if (row.importMode === "bank-transactions") {
    return detectBankAction(row);
  }

  if (row.importMode === "member-personal-details") {
    if (!row.registrationNumber || !row.legacyAddressKey) return { detectedAction: "INVALID" as const };
    const existing = await prisma.donorProfile.findUnique({
      where: { registrationNumber: row.registrationNumber },
      select: { id: true }
    });
    return existing ? { detectedAction: "DUPLICATE" as const, existingDonorId: existing.id } : { detectedAction: "NEW" as const };
  }

  const existing = await prisma.donorProfile.findFirst({
    where: {
      OR: [
        ...(row.registrationNumber ? [{ registrationNumber: row.registrationNumber }] : []),
        ...(row.iban ? [{ iban: row.iban }] : []),
        ...(row.email ? [{ user: { email: { equals: row.email, mode: "insensitive" as const } } }] : []),
        ...(row.phone ? [{ phone: { contains: row.phone, mode: "insensitive" as const } }] : []),
        ...(row.fullName && row.birthDate
          ? [
              {
                AND: [
                  { dateOfBirth: new Date(row.birthDate) },
                  {
                    OR: [
                      { firstName: { contains: row.fullName.split(/\s+/)[0] ?? "", mode: "insensitive" as const } },
                      { lastName: { contains: row.fullName.split(/\s+/).at(-1) ?? "", mode: "insensitive" as const } }
                    ]
                  }
                ]
              }
            ]
          : []),
        ...(row.fullName
          ? [
              {
                AND: row.fullName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => ({
                    OR: [
                      { firstName: { contains: part, mode: "insensitive" as const } },
                      { lastName: { contains: part, mode: "insensitive" as const } }
                    ]
                  }))
              }
            ]
          : [])
      ]
    },
    select: { id: true, registrationNumber: true, iban: true }
  });

  if (!existing) {
    return { detectedAction: "NEW" as const };
  }
  if (
    (row.registrationNumber && existing.registrationNumber === row.registrationNumber) ||
    (row.iban && existing.iban === row.iban)
  ) {
    return { detectedAction: "DUPLICATE" as const, existingDonorId: existing.id };
  }
  return { detectedAction: "POSSIBLE_MATCH" as const, existingDonorId: existing.id };
}

async function detectBankAction(row: Omit<ImportPreviewRow, "detectedAction" | "existingDonorId">) {
  if (!row.registrationNumber) {
    row.reviewReasons.push("Geen lidnummer in de omschrijving; bankbetaling wordt niet automatisch gekoppeld op naam of IBAN.");
    return { detectedAction: "PAYMENT_ONLY_REQUIRES_REVIEW" as const };
  }

  const existing = await prisma.donorProfile.findUnique({
    where: { registrationNumber: row.registrationNumber },
    select: { id: true, iban: true, firstName: true, lastName: true }
  });

  if (!existing) {
    row.reviewReasons.push(`Lidnummer ${row.registrationNumber} staat niet in de donateurslijst; handmatige controle nodig.`);
    return { detectedAction: "PAYMENT_ONLY_REQUIRES_REVIEW" as const };
  }

  if (existing) {
    const duplicate = await prisma.paymentObligation.findFirst({
      where: {
        donorProfileId: existing.id,
        amountCents: row.amountCents,
        paidAt: row.paidAt ? new Date(row.paidAt) : null,
        source: { in: ["IMPORT_BANK_EXCEL", "IMPORT_BANK_EXCEL_OPEN"] },
        ...(row.iban ? { notes: { contains: `IBAN betaler: ${row.iban}` } } : {})
      },
      select: { id: true }
    });
    if (duplicate) return { detectedAction: "DUPLICATE_PAYMENT" as const, existingDonorId: existing.id };
    return { detectedAction: "LINK_PAYMENT_TO_EXISTING_DONOR" as const, existingDonorId: existing.id };
  }

  row.reviewReasons.push("Bankbetaling kon niet automatisch gekoppeld worden; handmatige controle nodig.");
  return { detectedAction: "PAYMENT_ONLY_REQUIRES_REVIEW" as const };
}

async function rowsFromXlsxWorkbook(buffer: ArrayBuffer): Promise<RawImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  let bestSheet: { rows: Array<{ rowNumber: number; values: unknown[] }>; headerIndex: number; indexes: Record<string, number>; importMode: ImportMode; score: number } | null = null;
  for (const worksheet of workbook.worksheets) {
    const rows: Array<{ rowNumber: number; values: unknown[] }> = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      rows.push({ rowNumber, values: rowValues(row.values) });
    });
    if (!rows.length) continue;
    const match = findHeaderRow(rows.map((row) => row.values));
    if (!bestSheet || match.score > bestSheet.score) {
      bestSheet = { rows, headerIndex: match.headerIndex, indexes: match.indexes, importMode: match.importMode, score: match.score };
    }
  }

  if (!bestSheet || bestSheet.score < 3) return [];

  return bestSheet.rows
    .filter((_, index) => index > bestSheet.headerIndex)
    .map(({ rowNumber, values }) => rawRowToImportRow(rowNumber, values, bestSheet.indexes, bestSheet.importMode))
    .filter(rowHasUsefulData)
    .filter((row) => row.importMode !== "bank-transactions" || isAllowedSepaTransfer(row.description));
}

async function rowsFromLegacyWorkbook(buffer: ArrayBuffer): Promise<RawImportRow[]> {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  let bestSheet: { rows: unknown[][]; headerIndex: number; indexes: Record<string, number>; importMode: ImportMode; score: number } | null = null;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
    if (!rows.length) continue;
    const match = findHeaderRow(rows);
    if (!bestSheet || match.score > bestSheet.score) {
      bestSheet = { rows, headerIndex: match.headerIndex, indexes: match.indexes, importMode: match.importMode, score: match.score };
    }
  }

  if (!bestSheet || bestSheet.score < 3) return [];

  return bestSheet.rows
    .slice(bestSheet.headerIndex + 1)
    .map((values, index) => rawRowToImportRow(bestSheet.headerIndex + index + 2, values, bestSheet.indexes, bestSheet.importMode))
    .filter(rowHasUsefulData)
    .filter((row) => row.importMode !== "bank-transactions" || isAllowedSepaTransfer(row.description));
}

async function rowsFromCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const splitLines = lines.map((line) => line.split(/[;,]/));
  const { headerIndex, indexes, importMode } = findHeaderRow(splitLines);

  return splitLines
    .slice(headerIndex + 1)
    .map((values, index) => rawRowToImportRow(headerIndex + index + 2, values, indexes, importMode))
    .filter(rowHasUsefulData)
    .filter((row) => row.importMode !== "bank-transactions" || isAllowedSepaTransfer(row.description));
}

function rowHasUsefulData(row: RawImportRow) {
  return [
    row.registrationNumber,
    row.legacyMemberDetailKey,
    row.legacyAddressKey,
    row.firstName,
    row.middleName,
    row.lastName,
    row.relationshipToMember,
    row.iban,
    row.fullName,
    row.amount,
    row.date,
    row.organizationAccountNumber,
    row.description,
    row.email,
    row.phone
  ].some((value) => (typeof value === "string" ? value.trim() : Boolean(value)));
}

function duplicateKeyPart(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function duplicateKeyForRow(row: ImportPreviewRow) {
  if (row.errors.length) return null;

  if (row.importMode === "bank-transactions") {
    const target = duplicateKeyPart(row.registrationNumber);
    const amount = String(row.amountCents);
    const paidAt = row.paidAt ? new Date(row.paidAt).toISOString().slice(0, 10) : "";
    const iban = duplicateKeyPart(row.iban);
    if (!target || !amount || !paidAt || !iban) return null;
    return `bank:${target}:${amount}:${paidAt}:${iban}`;
  }

  if (row.importMode === "member-personal-details") {
    const memberKey = duplicateKeyPart(row.legacyMemberDetailKey);
    if (memberKey) return `member-key:${memberKey}`;

    const registration = duplicateKeyPart(row.registrationNumber);
    const address = duplicateKeyPart(row.legacyAddressKey);
    const relation = duplicateKeyPart(row.relationshipToMember);
    const name = duplicateKeyPart(row.fullName);
    const birthDate = row.birthDate ? new Date(row.birthDate).toISOString().slice(0, 10) : "";
    if (!registration || !address || !relation || !name) return null;
    return `member-person:${registration}:${address}:${relation}:${name}:${birthDate}`;
  }

  const registration = duplicateKeyPart(row.registrationNumber);
  if (registration) return `donor-status-registration:${registration}`;

  const email = duplicateKeyPart(row.email);
  if (email) return `donor-status-email:${email}`;

  const iban = duplicateKeyPart(row.iban);
  if (iban) return `donor-status-iban:${iban}`;

  const name = duplicateKeyPart(row.fullName);
  const birthDate = row.birthDate ? new Date(row.birthDate).toISOString().slice(0, 10) : "";
  if (name && birthDate) return `donor-status-person:${name}:${birthDate}`;

  return null;
}

export function markDuplicateImportRows(rows: ImportPreviewRow[]) {
  const firstSeen = new Map<string, ImportPreviewRow>();

  return rows.map((row) => {
    const duplicateKey = duplicateKeyForRow(row);
    if (!duplicateKey) return row;

    const original = firstSeen.get(duplicateKey);
    if (!original) {
      firstSeen.set(duplicateKey, row);
      return row;
    }

    if (row.importMode === "bank-transactions") {
      return {
        ...row,
        detectedAction: "DUPLICATE_PAYMENT" as const,
        warnings: [...row.warnings, `Dubbele bankregel in dit importbestand; eerste keer gevonden op rij ${original.rowNumber}.`]
      };
    }

    return {
      ...row,
      detectedAction: "DUPLICATE_IMPORT_ROW" as const,
      errors: [...row.errors, `Dubbele persoon/statusregel in dit importbestand; eerste keer gevonden op rij ${original.rowNumber}.`]
    };
  });
}

export async function buildImportPreview(file: File): Promise<ImportPreviewRow[]> {
  const lowerName = file.name.toLowerCase();
  const rawRows = lowerName.endsWith(".csv")
    ? await rowsFromCsv(await file.text())
    : lowerName.endsWith(".xls")
      ? await rowsFromLegacyWorkbook(await file.arrayBuffer())
      : await rowsFromXlsxWorkbook(await file.arrayBuffer());

  const preview: ImportPreviewRow[] = [];
  for (const raw of rawRows) {
    const warnings: string[] = [];
    const errors: string[] = [];
    const parsedBank = raw.importMode === "bank-transactions" ? parseBankDescription(raw.description) : null;
    const registrationNumber = normalizeRegistrationNumberForImport(
      parsedBank?.lidnummer ?? raw.registrationNumber,
      raw.importMode
    );
    const fullName = raw.fullName.trim().replace(/\s+/g, " ");
    const iban = normalizeIban(parsedBank?.donorIban ?? (raw.importMode === "bank-transactions" ? "" : raw.iban));
    const amountCents = parseAmountCents(raw.amount);
    const paidAt = parseExcelDate(raw.date) ?? parseExcelDate(raw.rentDate);
    const birthDate = parseExcelDate(raw.birthDate);
    const email = raw.email.trim().toLowerCase();
    const phone = raw.phone.trim();
    const memberFullName = [raw.firstName, raw.middleName, raw.lastName].filter(Boolean).join(" ").trim().replace(/\s+/g, " ");

    if (parsedBank) warnings.push(...parsedBank.warnings.filter((message) => message !== "Geen lidnummer gevonden"));
    const reviewReasons: string[] = [];
    if (raw.importMode === "bank-transactions" && !raw.description) errors.push("Omschrijving ontbreekt");
    if (raw.importMode === "bank-transactions") {
      if (!registrationNumber) reviewReasons.push("Geen lidnummer gevonden");
      if (!paidAt) reviewReasons.push("Datum ontbreekt");
      if (!amountCents || amountCents < 0) reviewReasons.push("Bedrag controleren");
    }
    if (raw.importMode === "member-personal-details") {
      if (!raw.registrationNumber) errors.push("Lidnummer ontbreekt");
      if (!raw.legacyAddressKey) errors.push("Adresnummer ontbreekt");
      if (!memberFullName) errors.push("Naam ontbreekt");
      if (!raw.relationshipToMember) errors.push("Relatie tot lid ontbreekt");
      if (!birthDate) warnings.push("Geboortedatum ontbreekt of is niet leesbaar");
    }

    const base = {
      rowNumber: raw.rowNumber,
      importMode: raw.importMode,
      registrationNumber,
      fullName: raw.importMode === "member-personal-details" ? memberFullName : fullName,
      firstName: raw.firstName,
      middleName: raw.middleName,
      lastName: raw.lastName,
      relationshipToMember: raw.relationshipToMember,
      legacyMemberDetailKey: raw.legacyMemberDetailKey,
      legacyAddressKey: raw.legacyAddressKey,
      addressLine1: raw.addressLine1,
      gender: raw.gender,
      maritalStatus: raw.maritalStatus,
      birthPlace: raw.birthPlace,
      iban,
      amountCents,
      paidAt: paidAt ? paidAt.toISOString() : null,
      organizationAccountNumber: raw.organizationAccountNumber,
      rawDescription: parsedBank?.rawDescription ?? raw.description,
      contributionYear: parsedBank?.contributionYear ?? (paidAt ? paidAt.getFullYear() : undefined),
      email,
      phone,
      birthDate: birthDate ? birthDate.toISOString() : null,
      reviewReasons,
      warnings,
      errors
    };
    const detected = await detectAction(base);
    preview.push({ ...base, ...detected });
  }

  return markDuplicateImportRows(preview);
}
