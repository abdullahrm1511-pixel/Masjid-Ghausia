"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canManageDonors } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { buildImportPreview, splitName, type ImportPreviewRow } from "@/lib/admin/import";
import { syncRegistrationCounter } from "@/lib/registration/numbers";
import { writeAuditLog } from "@/lib/audit";
import { calculateCurrentAnnualAmount, getPricingConfig } from "@/lib/pricing";
import type { PricingConfig } from "@/lib/pricing-config";
import { ensurePrimaryMembership, findPrimaryDonorByMembershipNumber, membershipIdForRegistrationNumber } from "@/lib/membership";

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
  inactive?: number;
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
  if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls") && !lowerName.endsWith(".xlsm") && !lowerName.endsWith(".csv")) {
    return { rows: [], fileName: file.name, error: "Alleen .xlsx, .xls, .xlsm en .csv worden ondersteund." };
  }

  let rows: ImportPreviewRow[] = [];
  try {
    rows = await buildImportPreview(file);
  } catch {
    return {
      rows: [],
      fileName: file.name,
      error: "Het bestand kon niet gelezen worden. Controleer of het Excelbestand niet beschadigd is en dat de kolommen zichtbaar zijn."
    };
  }
  if (!rows.length) {
    return {
      rows: [],
      fileName: file.name,
      error:
        "Geen importeerbare rijen gevonden. Voor Alle leden import verwacht het systeem kolommen zoals REGISTRATION NR KEY, ADDR NR KEY, FIRST NAME, SURNAME en RELATIONSHIP TO MEMBER."
    };
  }
  return { rows, fileName: file.name };
}

function legacyEmail(registrationNumber: string, rowNumber: number) {
  const key = (registrationNumber || `row-${rowNumber}`).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `legacy+${key}@stgbc.local`;
}

function isValidEmail(email?: string) {
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

function normalizeGender(value?: string) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.startsWith("m")) return "MALE";
  if (normalized.startsWith("f") || normalized.startsWith("v")) return "FEMALE";
  return undefined;
}

function normalizeMaritalStatus(value?: string) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.startsWith("married") || normalized.startsWith("gehuwd") || normalized.startsWith("getrouwd")) return "MARRIED";
  if (normalized.startsWith("single") || normalized.startsWith("alleenstaand") || normalized.startsWith("ongehuwd")) return "SINGLE";
  if (normalized.startsWith("divorced") || normalized.startsWith("gescheiden")) return "DIVORCED";
  if (normalized.startsWith("widow") || normalized.startsWith("weduw")) return "WIDOWED";
  return undefined;
}

function memberRelation(row: Pick<ImportPreviewRow, "relationshipToMember">) {
  const relation = String(row.relationshipToMember ?? "").trim().toLowerCase();
  if (relation.includes("primary")) return "PRIMARY";
  if (relation.includes("partner")) return "PARTNER";
  if (relation.includes("child") || relation.includes("kind")) return "CHILD";
  return "OTHER";
}

function safeBirthDate(value?: string | null) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date("1900-01-01T00:00:00.000Z");
}

async function userEmailForImportedPrimary(row: ImportPreviewRow) {
  const rowEmail = row.email?.toLowerCase();
  const preferred = isValidEmail(rowEmail) && rowEmail ? rowEmail : legacyEmail(row.registrationNumber, row.rowNumber);
  const existingUser = await prisma.user.findUnique({ where: { email: preferred }, select: { id: true } });
  if (!existingUser) return preferred;

  const donorWithEmail = await prisma.donorProfile.findUnique({
    where: { userId: existingUser.id },
    select: { registrationNumber: true }
  });
  return donorWithEmail?.registrationNumber === row.registrationNumber ? preferred : legacyEmail(row.registrationNumber, row.rowNumber);
}

async function upsertImportedPrimary(row: ImportPreviewRow) {
  const fullName = row.fullName || [row.firstName, row.middleName, row.lastName].filter(Boolean).join(" ").trim();
  const firstName = row.firstName?.trim() || splitName(fullName).firstName || fullName;
  const lastName = row.lastName?.trim() || splitName(fullName).lastName;
  const birthDate = safeBirthDate(row.birthDate);

  const existingDonor = await prisma.donorProfile.findUnique({
    where: { registrationNumber: row.registrationNumber },
    include: { user: true }
  });

  if (existingDonor) {
    const donor = await prisma.donorProfile.update({
      where: { id: existingDonor.id },
      data: {
        status: existingDonor.status === "PENDING" ? "ACTIVE" : existingDonor.status,
        legacyMemberDetailKey: row.legacyMemberDetailKey || existingDonor.legacyMemberDetailKey,
        legacyAddressKey: row.legacyAddressKey || existingDonor.legacyAddressKey,
        firstName,
        lastName,
        gender: normalizeGender(row.gender),
        phone: row.phone || existingDonor.phone,
        addressLine1: row.addressLine1 || existingDonor.addressLine1,
        dateOfBirth: birthDate,
        birthPlace: row.birthPlace || existingDonor.birthPlace,
        accountHolderName: fullName || existingDonor.accountHolderName,
        maritalStatus: normalizeMaritalStatus(row.maritalStatus),
        activeSince: existingDonor.activeSince ?? new Date()
      }
    });

    const rowEmail = row.email?.toLowerCase();
    if (isValidEmail(rowEmail) && existingDonor.user.email.startsWith("legacy+")) {
      const emailOwner = await prisma.user.findUnique({ where: { email: rowEmail }, select: { id: true } });
      if (!emailOwner) {
        await prisma.user.update({
          where: { id: existingDonor.userId },
          data: { email: rowEmail, name: fullName || existingDonor.user.name }
        });
      }
    } else {
      await prisma.user.update({
        where: { id: existingDonor.userId },
        data: { name: fullName || existingDonor.user.name }
      });
    }

    return { donor, created: false };
  }

  const email = await userEmailForImportedPrimary(row);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: fullName, isActive: false },
    create: {
      name: fullName,
      email,
      role: "DONOR",
      isActive: false
    }
  });

  const donor = await prisma.donorProfile.create({
    data: {
      userId: user.id,
      registrationNumber: row.registrationNumber,
      legacyMemberDetailKey: row.legacyMemberDetailKey || null,
      legacyAddressKey: row.legacyAddressKey || null,
      status: "ACTIVE",
      firstName,
      lastName,
      gender: normalizeGender(row.gender),
      phone: row.phone || "",
      addressLine1: row.addressLine1 || "",
      postalCode: "",
      city: "",
      dateOfBirth: birthDate,
      birthPlace: row.birthPlace || "",
      iban: "",
      accountHolderName: fullName,
      maritalStatus: normalizeMaritalStatus(row.maritalStatus),
      activeSince: new Date(),
      approvedAt: new Date()
    }
  });

  return { donor, created: true };
}

async function upsertImportedFamilyMember(donorId: string, row: ImportPreviewRow, membershipId?: string | null) {
  const relation = memberRelation(row);
  if (relation === "PRIMARY") return false;

  const fullName = row.fullName || [row.firstName, row.middleName, row.lastName].filter(Boolean).join(" ").trim();
  const firstName = row.firstName?.trim() || splitName(fullName).firstName || fullName;
  const lastName = row.lastName?.trim() || splitName(fullName).lastName;
  const dateOfBirth = safeBirthDate(row.birthDate);
  const type = relation === "PARTNER" ? "PARTNER" : relation === "CHILD" ? "CHILD" : "OTHER";

  const existing = await prisma.familyMember.findFirst({
    where: {
      donorProfileId: donorId,
      type,
      firstName: { equals: firstName, mode: "insensitive" },
      lastName: { equals: lastName, mode: "insensitive" },
      dateOfBirth
    }
  });

  const familyMember = existing
    ? await prisma.familyMember.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName,
          legacyMemberDetailKey: row.legacyMemberDetailKey || existing.legacyMemberDetailKey,
          legacyAddressKey: row.legacyAddressKey || existing.legacyAddressKey,
          gender: normalizeGender(row.gender),
          dateOfBirth,
          birthPlace: row.birthPlace || existing.birthPlace,
          relationship: row.relationshipToMember || existing.relationship,
          isActive: true
        }
      })
    : await prisma.familyMember.create({
        data: {
          donorProfileId: donorId,
          legacyMemberDetailKey: row.legacyMemberDetailKey || null,
          legacyAddressKey: row.legacyAddressKey || null,
          type,
          firstName,
          lastName,
          gender: normalizeGender(row.gender),
          dateOfBirth,
          birthPlace: row.birthPlace || "",
          relationship: row.relationshipToMember || null,
          isActive: true
        }
      });

  if (membershipId) {
    await (prisma.membershipMember.upsert as any)({
      where: {
        membershipId_familyMemberId: {
          membershipId,
          familyMemberId: familyMember.id
        }
      },
      update: {
        role: type === "PARTNER" ? "PARTNER" : "CHILD",
        isActive: true,
        endedAt: null,
        endReason: null
      },
      create: {
        membershipId,
        familyMemberId: familyMember.id,
        role: type === "PARTNER" ? "PARTNER" : "CHILD",
        displayNumber: type === "PARTNER" ? `${row.registrationNumber}-P` : null,
        isPrimaryPayer: false,
        isActive: true,
        activeFrom: new Date()
      }
    });
  }

  return !existing;
}

async function commitMemberPersonalDetailsImport(rows: ImportPreviewRow[], adminId: string, fileName: string): Promise<ImportResultState> {
  const summary: ImportResultState = { created: 0, linked: 0, invalid: 0, review: 0, duplicates: 0, inactive: 0 };
  const validRows = rows.filter((row) => row.importMode === "member-personal-details" && row.errors.length === 0);
  const invalidRows = rows.filter((row) => row.importMode === "member-personal-details" && row.errors.length > 0);
  summary.invalid = invalidRows.length;

  const groups = new Map<string, ImportPreviewRow[]>();
  for (const row of validRows) {
    const key = `${row.registrationNumber}::${row.legacyAddressKey}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  for (const groupRows of groups.values()) {
    const primary = groupRows.find((row) => memberRelation(row) === "PRIMARY");
    if (!primary) {
      summary.review += groupRows.length;
      continue;
    }

    const { donor, created } = await upsertImportedPrimary(primary);
    const membership = await ensurePrimaryMembership({
      id: donor.id,
      registrationNumber: donor.registrationNumber,
      status: donor.status,
      activeSince: donor.activeSince,
      approvedAt: donor.approvedAt,
      createdAt: donor.createdAt,
      updatedAt: donor.updatedAt
    });

    if (created) summary.created += 1;
    else summary.linked += 1;

    for (const row of groupRows) {
      const familyCreated = await upsertImportedFamilyMember(donor.id, row, membership?.id);
      if (familyCreated) summary.linked += 1;
    }
  }

  await syncRegistrationCounter(validRows.map((row) => row.registrationNumber).filter(Boolean));
  await writeAuditLog({
    actorId: adminId,
    action: "IMPORT",
    entityType: "DonorProfile",
    message: "Bestaande leden import verwerkt",
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

async function findDonor(row: ImportPreviewRow, chosenId?: string) {
  if (chosenId) {
    return prisma.donorProfile.findUnique({ where: { id: chosenId } });
  }
  if (row.registrationNumber) {
    return (await findPrimaryDonorByMembershipNumber(row.registrationNumber)) ?? prisma.donorProfile.findUnique({ where: { registrationNumber: row.registrationNumber } });
  }
  if (row.importMode === "bank-transactions") return null;
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

  const donor = await prisma.donorProfile.upsert({
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

  await ensurePrimaryMembership({
    id: donor.id,
    registrationNumber: donor.registrationNumber,
    status: donor.status,
    activeSince: donor.activeSince,
    approvedAt: donor.approvedAt,
    createdAt: donor.createdAt,
    updatedAt: donor.updatedAt
  });

  return donor;
}

function paymentNotes(row: ImportPreviewRow, fileName: string) {
  if (row.importMode !== "bank-transactions") return "Geimporteerd uit Excel";
  return [
    "Geimporteerd uit banktransactie",
    `Importbestand: ${fileName}`,
    `Importdatum: ${new Date().toISOString()}`,
    row.paidAt ? `Transactiedatum: ${new Date(row.paidAt).toISOString().slice(0, 10)}` : null,
    row.amountCents ? `Bedrag: ${row.amountCents / 100}` : null,
    row.iban ? `IBAN betaler: ${row.iban}` : null,
    row.contributionYear ? `Contributiejaar: ${row.contributionYear}` : null,
    row.organizationAccountNumber ? `Organisatie rekeningnummer: ${row.organizationAccountNumber}` : null,
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

function penaltyCentsForYear(year: number, config: PricingConfig, today = new Date()) {
  const paymentWindowEnd = new Date(year, config.paymentWindowEndMonth - 1, config.paymentWindowEndDay, 23, 59, 59, 999);
  if (today <= paymentWindowEnd) return 0;
  const lastPenaltyMonth = today.getFullYear() > year ? 12 : today.getMonth() + 1;
  const penaltyMonths = Math.max(lastPenaltyMonth - config.paymentWindowEndMonth, 0);
  return penaltyMonths * config.monthlyPenaltyAfterWindow * 100;
}

async function reconcileAnnualRemainder(donorId: string, year: number) {
  const donor = await prisma.donorProfile.findUnique({
    where: { id: donorId },
    include: { familyMembers: true, paymentObligations: true }
  });
  if (!donor) return null;

  const pricing = await getPricingConfig();
  const expectedCents = calculateCurrentAnnualAmount(donor, donor.familyMembers, pricing, new Date(`${year}-01-01T00:00:00.000Z`)) * 100;
  const penaltyCents = expectedCents > 0 ? penaltyCentsForYear(year, pricing) : 0;
  const paidCents = donor.paymentObligations
    .filter((item) => item.status === "PAID" && item.obligationType === "ANNUAL" && paymentYear(item) === year)
    .reduce((sum, item) => sum + item.amountCents, 0);
  const remainingCents = Math.max(expectedCents + penaltyCents - paidCents, 0);

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
        notes: [
          `Open restant jaarbetaling`,
          `Contributiejaar: ${year}`,
          `Jaarbedrag: ${expectedCents / 100}`,
          penaltyCents ? `Boete tot nu toe: ${penaltyCents / 100}` : null,
          `Betaald tot nu toe: ${paidCents / 100}`
        ]
          .filter(Boolean)
          .join("\n")
      }
    });
  }

  return { expectedCents, penaltyCents, paidCents, remainingCents };
}

async function markUnpaidDonorsInactiveAfterWindow(adminId: string, year: number, skippedDonorIds: Set<string>) {
  const pricing = await getPricingConfig();
  const today = new Date();
  const paymentWindowEnd = new Date(year, pricing.paymentWindowEndMonth - 1, pricing.paymentWindowEndDay, 23, 59, 59, 999);
  if (today <= paymentWindowEnd) return 0;

  const donors = await prisma.donorProfile.findMany({
    where: {
      status: { in: ["ACTIVE", "PAYMENT_REQUIRED"] },
      id: skippedDonorIds.size ? { notIn: [...skippedDonorIds] } : undefined
    },
    include: { familyMembers: true, paymentObligations: true }
  });

  let inactiveCount = 0;
  for (const donor of donors) {
    const expectedCents = calculateCurrentAnnualAmount(donor, donor.familyMembers, pricing, new Date(`${year}-01-01T00:00:00.000Z`)) * 100;
    if (expectedCents <= 0) continue;

    const paidCents = donor.paymentObligations
      .filter((item) => item.status === "PAID" && item.obligationType === "ANNUAL" && paymentYear(item) === year)
      .reduce((sum, item) => sum + item.amountCents, 0);
    const penaltyCents = penaltyCentsForYear(year, pricing, today);
    const remainingCents = Math.max(expectedCents + penaltyCents - paidCents, 0);
    if (remainingCents <= 0) continue;

    await reconcileAnnualRemainder(donor.id, year);

    const cancelled = today.getFullYear() > year;
    const internalNote = cancelled
      ? `Lidmaatschap geannuleerd wegens niet betalen van jaarbetaling ${year}.`
      : `Jaarbetaling ${year} niet volledig voldaan na betaalperiode. Openstaand inclusief boete: ${remainingCents / 100}.`;
    const donorMessage = cancelled
      ? "Uw lidmaatschap is geannuleerd omdat de jaarlijkse betaling niet is voldaan."
      : "Er staat nog een jaarlijkse betaling open volgens de administratie.";

    await prisma.$transaction([
      prisma.donorProfile.update({
        where: { id: donor.id },
        data: {
          status: "INACTIVE",
          inactiveSince: donor.inactiveSince ?? today,
          statusChangedAt: today,
          statusInternalNote: internalNote,
          statusDonorMessage: donorMessage
        }
      }),
      prisma.donorStatusHistory.create({
        data: {
          donorProfileId: donor.id,
          changedById: adminId,
          fromStatus: donor.status,
          toStatus: "INACTIVE",
          internalNote,
          donorMessage
        }
      })
    ]);
    inactiveCount += 1;
  }

  return inactiveCount;
}

export async function commitImport(_previous: ImportResultState | null, formData: FormData): Promise<ImportResultState> {
  const adminId = await requireAdmin();
  const rawRows = String(formData.get("rows") ?? "");
  const fileName = String(formData.get("fileName") ?? "import");
  const rows = JSON.parse(rawRows) as ImportPreviewRow[];
  if (rows.some((row) => row.importMode === "member-personal-details")) {
    return commitMemberPersonalDetailsImport(rows, adminId, fileName);
  }

  const summary: ImportResultState = { created: 0, linked: 0, invalid: 0, review: 0, duplicates: 0, inactive: 0 };
  const bankImportYears = new Set<number>();
  const skippedDonorIds = new Set<string>();

  for (const row of rows) {
    if (row.importMode === "bank-transactions") {
      bankImportYears.add(row.contributionYear ?? (row.paidAt ? new Date(row.paidAt).getFullYear() : new Date().getFullYear()));
    }
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
    if (row.importMode === "bank-transactions" && !linkedDonor) {
      summary.review += 1;
      continue;
    }
    const donor = linkedDonor ?? (await createLegacyDonor(row, importWithoutIban));
    const hasPaidDate = Boolean(row.paidAt);

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
    const membershipId = await membershipIdForRegistrationNumber(row.registrationNumber || donor.registrationNumber);
    await (prisma.paymentObligation.create as any)({
      data: {
        donorProfileId: donor.id,
        ...(membershipId ? { membershipId } : {}),
        lidnummer: row.registrationNumber || donor.registrationNumber,
        obligationType,
        status: hasPaidDate ? "PAID" : "DUE",
        amountCents: row.amountCents,
        paidAt: row.paidAt ? new Date(row.paidAt) : null,
        paymentMethod: hasPaidDate && row.importMode === "bank-transactions" ? "BANK_TRANSFER" : null,
        source: row.importMode === "bank-transactions" ? (hasPaidDate ? "IMPORT_BANK_EXCEL" : "IMPORT_BANK_EXCEL_OPEN") : "IMPORT",
        notes: paymentNotes(row, fileName)
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

  for (const year of bankImportYears) {
    summary.inactive = (summary.inactive ?? 0) + await markUnpaidDonorsInactiveAfterWindow(adminId, year, skippedDonorIds);
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
