import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { normalizeIban } from "@/lib/iban";
import { parseBankDescription } from "@/lib/import/bank-description-parser";
import { improveBankDescriptionWithAi } from "@/lib/import/ai-bank-description-parser";

export type ImportMode = "donor-list" | "bank-transactions";
export type ImportAction =
  | "NEW"
  | "POSSIBLE_MATCH"
  | "DUPLICATE"
  | "INVALID"
  | "LINK_PAYMENT_TO_EXISTING_DONOR"
  | "CREATE_IMPORTED_DONOR_AND_PAYMENT"
  | "PAYMENT_ONLY_REQUIRES_REVIEW"
  | "DUPLICATE_PAYMENT"
  | "INVALID_REQUIRES_REVIEW";

export type ImportPreviewRow = {
  rowNumber: number;
  importMode: ImportMode;
  registrationNumber: string;
  fullName: string;
  payerName?: string;
  paymentTargetName?: string;
  paymentTargetRegistrationNumber?: string;
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
  aiExplanation: string[];
  reviewReasons: string[];
  warnings: string[];
  errors: string[];
};

type RawImportRow = {
  rowNumber: number;
  importMode: ImportMode;
  registrationNumber: string;
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
  registrationNumber: ["lid nr", "lidnummer", "registratienummer", "registration number"],
  iban: ["rek nr", "iban", "bankrekening", "rekeningnummer"],
  fullName: ["naam", "name"],
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
    .replace(/\s+/g, " ");
}

function headerIndex(headers: string[], names: string[]) {
  return headers.findIndex((header) => names.includes(header));
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

function rawRowToImportRow(rowNumber: number, values: unknown[], indexes: Record<string, number>, bankExport: boolean): RawImportRow {
  return {
    rowNumber,
    importMode: bankExport ? "bank-transactions" : "donor-list",
    registrationNumber: indexes.registrationNumber >= 0 ? cellText(values[indexes.registrationNumber]) : "",
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
  let existing = row.registrationNumber
    ? await prisma.donorProfile.findUnique({
        where: { registrationNumber: row.registrationNumber },
        select: { id: true, iban: true, firstName: true, lastName: true }
      })
    : null;

  if (!existing && row.paymentTargetName) {
    const targetParts = row.paymentTargetName.split(/\s+/).filter(Boolean);
    const targetMatches = await prisma.donorProfile.findMany({
      where: {
        AND: targetParts.slice(0, 3).map((part) => ({
          OR: [
            { firstName: { contains: part, mode: "insensitive" as const } },
            { lastName: { contains: part, mode: "insensitive" as const } }
          ]
        }))
      },
      select: { id: true, iban: true, firstName: true, lastName: true },
      take: 2
    });
    if (targetMatches.length === 1) {
      existing = targetMatches[0];
    }
    if (targetMatches.length > 1) {
      row.reviewReasons.push("Betalingsdoel komt overeen met meerdere donateurs.");
      return { detectedAction: "PAYMENT_ONLY_REQUIRES_REVIEW" as const };
    }
  }

  if (!existing && row.iban) {
    const ibanMatches = await prisma.donorProfile.findMany({
      where: { iban: row.iban },
      select: { id: true },
      take: 2
    });
    if (ibanMatches.length === 1) {
      existing = await prisma.donorProfile.findUnique({
        where: { id: ibanMatches[0].id },
        select: { id: true, iban: true, firstName: true, lastName: true }
      });
    }
    if (ibanMatches.length > 1) {
      row.reviewReasons.push("IBAN komt bij meerdere lidnummers voor; kies handmatig op lidnummer of zorg dat de omschrijving een lidnummer bevat.");
      return { detectedAction: "PAYMENT_ONLY_REQUIRES_REVIEW" as const };
    }
  }

  if (!existing && row.fullName) {
    const nameParts = row.fullName.split(/\s+/).filter(Boolean);
    const nameMatches = await prisma.donorProfile.findMany({
      where: {
        AND: nameParts.slice(0, 2).map((part) => ({
          OR: [
            { firstName: { contains: part, mode: "insensitive" as const } },
            { lastName: { contains: part, mode: "insensitive" as const } }
          ]
        }))
      },
      select: { id: true },
      take: 2
    });
    if (nameMatches.length === 1) {
      existing = await prisma.donorProfile.findUnique({
        where: { id: nameMatches[0].id },
        select: { id: true, iban: true, firstName: true, lastName: true }
      });
    }
  }

  if (existing) {
    const duplicate = await prisma.paymentObligation.findFirst({
      where: {
        donorProfileId: existing.id,
        amountCents: row.amountCents,
        paidAt: row.paidAt ? new Date(row.paidAt) : null,
        source: { in: ["IMPORT_BANK_EXCEL", "IMPORT_BANK_EXCEL_OPEN"] }
      },
      select: { id: true }
    });
    if (duplicate) return { detectedAction: "DUPLICATE_PAYMENT" as const, existingDonorId: existing.id };
    return { detectedAction: "LINK_PAYMENT_TO_EXISTING_DONOR" as const, existingDonorId: existing.id };
  }

  if (row.registrationNumber && row.fullName) {
    return { detectedAction: "CREATE_IMPORTED_DONOR_AND_PAYMENT" as const };
  }
  return { detectedAction: "PAYMENT_ONLY_REQUIRES_REVIEW" as const };
}

async function rowsFromXlsxWorkbook(buffer: ArrayBuffer): Promise<RawImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headerRow = worksheet.getRow(1);
  const headers = rowValues(headerRow.values).map(normalizeHeader);
  const indexes = buildIndexes(headers);
  const bankExport = indexes.organizationAccountNumber >= 0 && indexes.description >= 0 && indexes.amount >= 0;

  const rows: Array<{ rowNumber: number; values: unknown[] }> = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    rows.push({ rowNumber, values: rowValues(row.values) });
  });

  return rows
    .map(({ rowNumber, values }) => rawRowToImportRow(rowNumber, values, indexes, bankExport))
    .filter((row) => !bankExport || isAllowedSepaTransfer(row.description));
}

async function rowsFromLegacyWorkbook(buffer: ArrayBuffer): Promise<RawImportRow[]> {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];

  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
  const [headerRow, ...dataRows] = rows;
  const headers = (headerRow ?? []).map(normalizeHeader);
  const indexes = buildIndexes(headers);
  const bankExport = indexes.organizationAccountNumber >= 0 && indexes.description >= 0 && indexes.amount >= 0;

  return dataRows
    .map((values, index) => rawRowToImportRow(index + 2, values, indexes, bankExport))
    .filter((row) =>
      [row.registrationNumber, row.iban, row.fullName, row.amount, row.date, row.organizationAccountNumber, row.description, row.email, row.phone].some((value) =>
        typeof value === "string" ? value.trim() : Boolean(value)
      )
    )
    .filter((row) => !bankExport || isAllowedSepaTransfer(row.description));
}

async function rowsFromCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const headers = (lines.shift() ?? "").split(/[;,]/).map(normalizeHeader);
  const indexes = buildIndexes(headers);
  const bankExport = indexes.organizationAccountNumber >= 0 && indexes.description >= 0 && indexes.amount >= 0;

  return lines
    .map((line, index) => {
      const values = line.split(/[;,]/);
      return rawRowToImportRow(index + 2, values, indexes, bankExport);
    })
    .filter((row) => !bankExport || isAllowedSepaTransfer(row.description));
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
    let parsedBank = raw.importMode === "bank-transactions" ? parseBankDescription(raw.description) : null;
    if (parsedBank) {
      parsedBank = await improveBankDescriptionWithAi(raw.description, parsedBank);
    }
    const registrationNumber = (parsedBank?.paymentTargetRegistrationNumber ?? parsedBank?.lidnummer ?? raw.registrationNumber).trim();
    const fullName = (parsedBank?.paymentTargetName ?? parsedBank?.donorName ?? raw.fullName).trim().replace(/\s+/g, " ");
    const iban = normalizeIban(parsedBank?.donorIban ?? (raw.importMode === "bank-transactions" ? "" : raw.iban));
    const amountCents = parseAmountCents(raw.amount);
    const paidAt = parseExcelDate(raw.date) ?? parseExcelDate(raw.rentDate);
    const birthDate = parseExcelDate(raw.birthDate) ?? parseExcelDate(parsedBank?.birthDateText);
    const email = raw.email.trim().toLowerCase();
    const phone = raw.phone.trim();

    if (parsedBank) warnings.push(...parsedBank.warnings);
    const reviewReasons = parsedBank?.reviewReasons ?? [];
    if (raw.importMode === "bank-transactions" && !raw.description) errors.push("Omschrijving ontbreekt");

    const base = {
      rowNumber: raw.rowNumber,
      importMode: raw.importMode,
      registrationNumber,
      fullName,
      payerName: parsedBank?.payerName,
      paymentTargetName: parsedBank?.paymentTargetName,
      paymentTargetRegistrationNumber: parsedBank?.paymentTargetRegistrationNumber,
      iban,
      amountCents,
      paidAt: paidAt ? paidAt.toISOString() : null,
      organizationAccountNumber: raw.organizationAccountNumber,
      rawDescription: parsedBank?.rawDescription ?? raw.description,
      contributionYear: parsedBank?.contributionYear ?? (paidAt ? paidAt.getFullYear() : undefined),
      email,
      phone,
      birthDate: birthDate ? birthDate.toISOString() : null,
      aiExplanation: parsedBank?.explanations ?? [],
      reviewReasons,
      warnings,
      errors
    };
    const detected = await detectAction(base);
    preview.push({ ...base, ...detected });
  }

  return preview;
}
