"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canManageDonors } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { buildImportPreview, splitName, type ImportPreviewRow } from "@/lib/admin/import";
import { syncRegistrationCounter } from "@/lib/registration/numbers";
import { writeAuditLog } from "@/lib/audit";
import { calculateCurrentAnnualAmount, getPricingConfig } from "@/lib/pricing";

export type ImportPreviewState = {
  rows: ImportPreviewRow[];
  fileName: string;
  error?: string;
};

export type ImportResultState = {
  created: number;
  linked: number;
  invalid: number;
  review: number;
  duplicates?: number;
  error?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!canManageDonors(session?.user.role)) {
    throw new Error("Geen toegang");
  }
  return session.user.id;
}

export async function previewImport(_previous: ImportPreviewState | null, formData: FormData): Promise<ImportPreviewState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { rows: [], fileName: "", error: "Kies een Excel- of CSV-bestand." };
  }

  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls") && !lowerName.endsWith(".csv")) {
    return { rows: [], fileName: file.name, error: "Alleen .xlsx, .xls en .csv worden ondersteund." };
  }

  const rows = await buildImportPreview(file);
  return { rows, fileName: file.name };
}

function legacyEmail(registrationNumber: string, rowNumber: number) {
  const key = (registrationNumber || `row-${rowNumber}`).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `legacy+${key}@stgbc.local`;
}

async function findDonor(row: ImportPreviewRow, chosenId?: string) {
  if (chosenId) {
    return prisma.donorProfile.findUnique({ where: { id: chosenId } });
  }
  if (row.registrationNumber) {
    return prisma.donorProfile.findUnique({ where: { registrationNumber: row.registrationNumber } });
  }
  if (!row.iban) return null;

  const ibanMatches = await prisma.donorProfile.findMany({ where: { iban: row.iban }, take: 2 });
  return ibanMatches.length === 1 ? ibanMatches[0] : null;
}

async function createLegacyDonor(row: ImportPreviewRow, importWithoutIban: boolean) {
  const { firstName, lastName } = splitName(row.fullName);
  const email = legacyEmail(row.registrationNumber, row.rowNumber);
  const iban = row.iban && !importWithoutIban ? row.iban : "";
  const importedStatus = row.importMode === "bank-transactions" ? "PAYMENT_REQUIRED" : row.paidAt ? "ACTIVE" : "PAYMENT_REQUIRED";
  const birthDate = row.birthDate ? new Date(row.birthDate) : new Date("1900-01-01T00:00:00.000Z");

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: row.fullName, isActive: false },
    create: {
      name: row.fullName,
      email,
      role: "DONOR",
      isActive: false
    }
  });

  return prisma.donorProfile.upsert({
    where: { userId: user.id },
    update: {
      registrationNumber: row.registrationNumber || undefined,
      status: importedStatus,
      firstName: firstName || row.fullName,
      lastName,
      iban,
      accountHolderName: row.fullName
    },
    create: {
      userId: user.id,
      registrationNumber: row.registrationNumber || null,
      status: importedStatus,
      firstName: firstName || row.fullName,
      lastName,
      phone: "",
      addressLine1: "",
      postalCode: "",
      city: "",
      dateOfBirth: Number.isNaN(birthDate.getTime()) ? new Date("1900-01-01T00:00:00.000Z") : birthDate,
      birthPlace: "",
      iban,
      accountHolderName: row.fullName
    }
  });
}

function paymentNotes(row: ImportPreviewRow) {
  if (row.importMode !== "bank-transactions") return "Geimporteerd uit Excel";
  return [
    "Geimporteerd uit banktransactie",
    row.contributionYear ? `Contributiejaar: ${row.contributionYear}` : null,
    row.payerName ? `Naam betaler uit omschrijving: ${row.payerName}` : null,
    row.paymentTargetName ? `Betalingsdoel uit omschrijving: ${row.paymentTargetName}` : null,
    row.paymentTargetRegistrationNumber ? `Lidnummer betalingsdoel: ${row.paymentTargetRegistrationNumber}` : null,
    row.aiExplanation.length ? `Slim gelezen: ${row.aiExplanation.join(" | ")}` : null,
    row.reviewReasons.length ? `Tweede opinie redenen: ${row.reviewReasons.join(" | ")}` : null,
    row.organizationAccountNumber ? `Organisatie rekeningnummer: ${row.organizationAccountNumber}` : null,
    row.iban ? `Donor IBAN uit omschrijving: ${row.iban}` : null,
    row.rawDescription ? `Omschrijving: ${row.rawDescription}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

function paymentYear(item: { paidAt: Date | null; dueDate: Date | null; createdAt: Date; notes: string | null }) {
  const yearFromNotes = item.notes?.match(/\bContributiejaar:\s*(20\d{2})\b/i)?.[1];
  if (yearFromNotes) return Number(yearFromNotes);
  return (item.paidAt ?? item.dueDate ?? item.createdAt).getFullYear();
}

async function reconcileAnnualRemainder(donorId: string, year: number) {
  const donor = await prisma.donorProfile.findUnique({
    where: { id: donorId },
    include: { familyMembers: true, paymentObligations: true }
  });
  if (!donor) return null;

  const pricing = await getPricingConfig();
  const expectedCents = calculateCurrentAnnualAmount(donor, donor.familyMembers, pricing, new Date(`${year}-01-01T00:00:00.000Z`)) * 100;
  const paidCents = donor.paymentObligations
    .filter((item) => item.status === "PAID" && item.obligationType === "ANNUAL" && paymentYear(item) === year)
    .reduce((sum, item) => sum + item.amountCents, 0);
  const remainingCents = Math.max(expectedCents - paidCents, 0);

  await prisma.paymentObligation.deleteMany({
    where: {
      donorProfileId: donor.id,
      obligationType: "ANNUAL",
      status: "DUE",
      source: "IMPORT_ANNUAL_REMAINDER",
      notes: { contains: `Contributiejaar: ${year}` }
    }
  });

  if (remainingCents > 0) {
    await prisma.paymentObligation.create({
      data: {
        donorProfileId: donor.id,
        lidnummer: donor.registrationNumber,
        obligationType: "ANNUAL",
        status: "DUE",
        amountCents: remainingCents,
        dueDate: new Date(`${year}-03-31T00:00:00.000Z`),
        source: "IMPORT_ANNUAL_REMAINDER",
        notes: [`Open restant jaarbetaling`, `Contributiejaar: ${year}`, `Betaald tot nu toe: ${paidCents / 100}`].join("\n")
      }
    });
  }

  return { expectedCents, paidCents, remainingCents };
}

export async function commitImport(_previous: ImportResultState | null, formData: FormData): Promise<ImportResultState> {
  const adminId = await requireAdmin();
  const rawRows = String(formData.get("rows") ?? "");
  const fileName = String(formData.get("fileName") ?? "import");
  const rows = JSON.parse(rawRows) as ImportPreviewRow[];
  const summary: ImportResultState = { created: 0, linked: 0, invalid: 0, review: 0, duplicates: 0 };

  for (const row of rows) {
    const importWithoutIban = row.importMode !== "bank-transactions" && [...row.errors, ...row.warnings].some((message) => message.includes("IBAN"));

    if (row.detectedAction === "DUPLICATE_PAYMENT") {
      summary.duplicates = (summary.duplicates ?? 0) + 1;
      continue;
    }

    if (row.detectedAction === "PAYMENT_ONLY_REQUIRES_REVIEW" || row.detectedAction === "INVALID_REQUIRES_REVIEW" || row.reviewReasons.length) {
      summary.review += 1;
      continue;
    }

    const hasIbanProblem = row.importMode !== "bank-transactions" && [...row.errors, ...row.warnings].some((message) => message.includes("IBAN"));
    const blockingErrors = row.errors.filter((message) => !message.includes("IBAN"));
    if (blockingErrors.length || (hasIbanProblem && !importWithoutIban)) {
      summary.invalid += 1;
      continue;
    }

    const linkedDonor = await findDonor(row, row.existingDonorId);
    const donor = linkedDonor ?? (await createLegacyDonor(row, importWithoutIban));
    const hasPaidDate = Boolean(row.paidAt);

    if (linkedDonor && row.importMode === "bank-transactions" && row.iban && !linkedDonor.iban) {
      await prisma.donorProfile.update({
        where: { id: linkedDonor.id },
        data: { iban: row.iban }
      });
    }

    if (linkedDonor && !hasPaidDate && !["DECEASED", "REJECTED"].includes(linkedDonor.status)) {
      await prisma.donorProfile.update({
        where: { id: linkedDonor.id },
        data: {
          status: "PAYMENT_REQUIRED",
          inactiveSince: linkedDonor.inactiveSince ?? new Date(),
          statusChangedAt: new Date(),
          statusInternalNote: "Importregel zonder betaal-/transactiedatum verwerkt als betaling afwachtend.",
          statusDonorMessage: "Er staat nog een betaling open volgens de administratie."
        }
      });
    }

    if (linkedDonor && hasPaidDate && row.importMode !== "bank-transactions" && ["INACTIVE", "PAYMENT_REQUIRED"].includes(linkedDonor.status)) {
      await prisma.donorProfile.update({
        where: { id: linkedDonor.id },
        data: {
          status: "ACTIVE",
          activeSince: linkedDonor.activeSince ?? new Date(row.paidAt as string),
          statusChangedAt: new Date(),
          statusInternalNote: "Importregel met betaal-/transactiedatum verwerkt als betaald.",
          statusDonorMessage: "Uw betaling is verwerkt volgens de administratie."
        }
      });
    }

    const obligationType = row.importMode === "bank-transactions" ? "ANNUAL" : "MANUAL";
    await prisma.paymentObligation.create({
      data: {
        donorProfileId: donor.id,
        lidnummer: row.registrationNumber || donor.registrationNumber,
        obligationType,
        status: hasPaidDate ? "PAID" : "DUE",
        amountCents: row.amountCents,
        paidAt: row.paidAt ? new Date(row.paidAt) : null,
        paymentMethod: hasPaidDate && row.importMode === "bank-transactions" ? "BANK_TRANSFER" : null,
        source: row.importMode === "bank-transactions" ? (hasPaidDate ? "IMPORT_BANK_EXCEL" : "IMPORT_BANK_EXCEL_OPEN") : "IMPORT",
        notes: paymentNotes(row)
      }
    });

    if (row.importMode === "bank-transactions") {
      const year = row.contributionYear ?? (row.paidAt ? new Date(row.paidAt).getFullYear() : new Date().getFullYear());
      const annualState = await reconcileAnnualRemainder(donor.id, year);
      if (annualState && !["DECEASED", "REJECTED"].includes(donor.status)) {
        const fullyPaid = annualState.expectedCents > 0 && annualState.remainingCents === 0;
        await prisma.donorProfile.update({
          where: { id: donor.id },
          data: fullyPaid
            ? {
                status: "ACTIVE",
                activeSince: donor.activeSince ?? (row.paidAt ? new Date(row.paidAt) : new Date()),
                inactiveSince: null,
                statusChangedAt: new Date(),
                statusInternalNote: `Jaarbetaling ${year} volledig verwerkt via bankimport.`,
                statusDonorMessage: "Uw jaarlijkse betaling is verwerkt volgens de administratie."
              }
            : {
                status: "PAYMENT_REQUIRED",
                inactiveSince: donor.inactiveSince ?? new Date(),
                statusChangedAt: new Date(),
                statusInternalNote: `Jaarbetaling ${year} gedeeltelijk of niet volledig betaald via bankimport.`,
                statusDonorMessage: "Er staat nog een jaarlijkse betaling open volgens de administratie."
              }
        });
      }
    }

    if (linkedDonor) {
      summary.linked += 1;
    } else {
      summary.created += 1;
    }
  }

  await syncRegistrationCounter(rows.map((row) => row.registrationNumber).filter(Boolean));
  await writeAuditLog({
    actorId: adminId,
    action: "IMPORT",
    entityType: "PaymentObligation",
    message: "Excel import verwerkt",
    metadata: {
      fileName,
      rows: rows.length,
      ...summary
    }
  });

  revalidatePath("/admin/donors");
  revalidatePath("/admin/import");
  return summary;
}
