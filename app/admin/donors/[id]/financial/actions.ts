"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageDonors } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { formatCurrency, formatDate } from "@/lib/display";
import { prepareEmailLog } from "@/lib/email/templates";
import { calculateCurrentAnnualAmount, calculateTotalOneTimeContribution, getPricingConfig, oneTimePaymentDeadline } from "@/lib/pricing";
import type { PricingConfig } from "@/lib/pricing-config";
import { membershipIdForRegistrationNumber } from "@/lib/membership";
import { syncFamilyActivityForDonorStatus } from "@/lib/household-activity";

async function requireAdmin() {
  const session = await auth();
  if (!canManageDonors(session?.user.role)) throw new Error("Geen toegang");
  return session.user.id;
}

function parseAmountCents(value: string) {
  const trimmed = value.trim();
  const isNegative = trimmed.startsWith("-");
  const normalized = trimmed.replace(",", ".").replace(/[^\d.]/g, "");
  const cents = Math.round(Number(normalized) * 100) * (isNegative ? -1 : 1);
  return Number.isNaN(cents) ? 0 : cents;
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

function automaticDueSource(source?: string | null) {
  return (
    source === "REGISTRATION_APPROVAL_ANNUAL" ||
    source === "REGISTRATION_APPROVAL_ONE_TIME" ||
    source === "IMPORT_ANNUAL_REMAINDER" ||
    source === "IMPORT_BANK_EXCEL_OPEN" ||
    source === "ADMIN_PAYMENT_CORRECTION" ||
    !source
  );
}

async function reconcileAnnualRemainder(donorId: string, year: number) {
  const donor = await prisma.donorProfile.findUnique({
    where: { id: donorId },
    include: { familyMembers: true, paymentObligations: true }
  });
  if (!donor) return null;

  const pricing = await getPricingConfig();
  const expectedCents = calculateCurrentAnnualAmount(donor, donor.familyMembers, pricing, new Date(`${year}-01-01T00:00:00.000Z`)) * 100;
  const isNewApprovalYear = donor.approvedAt?.getFullYear() === year;
  const penaltyCents = expectedCents > 0 && !isNewApprovalYear ? penaltyCentsForYear(year, pricing) : 0;
  const paidCents = donor.paymentObligations
    .filter((item) => item.status === "PAID" && item.obligationType === "ANNUAL" && paymentYear(item) === year)
    .reduce((sum, item) => sum + item.amountCents, 0);
  const remainingCents = Math.max(expectedCents + penaltyCents - paidCents, 0);

  const dueIds = donor.paymentObligations
    .filter((item) => item.status === "DUE" && item.obligationType === "ANNUAL" && paymentYear(item) === year && automaticDueSource(item.source))
    .map((item) => item.id);

  if (dueIds.length) {
    await prisma.paymentObligation.deleteMany({
      where: { id: { in: dueIds } }
    });
  }

  if (remainingCents > 0) {
    const membershipId = await membershipIdForRegistrationNumber(donor.registrationNumber);
    await (prisma.paymentObligation.create as any)({
      data: {
        donorProfileId: donor.id,
        ...(membershipId ? { membershipId } : {}),
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

async function reconcileOneTimeRemainder(donorId: string) {
  const donor = await prisma.donorProfile.findUnique({
    where: { id: donorId },
    include: { familyMembers: true, paymentObligations: true }
  });
  if (!donor) return null;

  const pricing = await getPricingConfig();
  const expectedCents = donor.approvedAt ? calculateTotalOneTimeContribution(donor, donor.familyMembers, pricing, donor.approvedAt) * 100 : 0;
  const paidCents = donor.paymentObligations
    .filter((item) => item.status === "PAID" && item.obligationType === "ONE_TIME")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const remainingCents = Math.max(expectedCents - paidCents, 0);
  const dueIds = donor.paymentObligations
    .filter((item) => item.status === "DUE" && item.obligationType === "ONE_TIME" && automaticDueSource(item.source))
    .map((item) => item.id);

  if (dueIds.length) {
    await prisma.paymentObligation.deleteMany({
      where: { id: { in: dueIds } }
    });
  }

  if (remainingCents > 0) {
    const membershipId = await membershipIdForRegistrationNumber(donor.registrationNumber);
    await (prisma.paymentObligation.create as any)({
      data: {
        donorProfileId: donor.id,
        ...(membershipId ? { membershipId } : {}),
        lidnummer: donor.registrationNumber,
        obligationType: "ONE_TIME",
        status: "DUE",
        amountCents: remainingCents,
        dueDate: oneTimePaymentDeadline(donor.approvedAt),
        source: "REGISTRATION_APPROVAL_ONE_TIME",
        notes: [
          "Open restant eenmalige bijdrage",
          `Eenmalig bedrag: ${expectedCents / 100}`,
          `Betaald tot nu toe: ${paidCents / 100}`
        ].join("\n")
      }
    });
  }

  return { expectedCents, paidCents, remainingCents };
}

async function registrationBalance(donorId: string) {
  const donor = await prisma.donorProfile.findUnique({
    where: { id: donorId },
    include: { familyMembers: true, paymentObligations: true }
  });
  if (!donor?.approvedAt) return null;

  const pricing = await getPricingConfig();
  const approvalYear = donor.approvedAt.getFullYear();
  const annualRequired = calculateCurrentAnnualAmount(donor, donor.familyMembers, pricing, donor.approvedAt) * 100;
  const oneTimeRequired = calculateTotalOneTimeContribution(donor, donor.familyMembers, pricing, donor.approvedAt) * 100;
  const annualPaid = donor.paymentObligations
    .filter((item) => item.status === "PAID" && item.obligationType === "ANNUAL" && paymentYear(item) === approvalYear)
    .reduce((sum, item) => sum + item.amountCents, 0);
  const oneTimePaid = donor.paymentObligations
    .filter((item) => item.status === "PAID" && item.obligationType === "ONE_TIME")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const remainingCents = Math.max(annualRequired - annualPaid, 0) + Math.max(oneTimeRequired - oneTimePaid, 0);

  return { approvalYear, annualRequired, oneTimeRequired, annualPaid, oneTimePaid, remainingCents };
}

async function isRegistrationBalancePaid(donorId: string) {
  const balance = await registrationBalance(donorId);
  return Boolean(balance && balance.annualRequired > 0 && balance.remainingCents === 0);
}

export async function updatePaymentStatus(formData: FormData) {
  const adminId = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const donorId = String(formData.get("donorId") ?? "");
  const status = String(formData.get("status") ?? "DUE") as "DUE" | "PAID" | "WAIVED" | "MANUAL_CORRECTION";
  const adminNote = String(formData.get("adminNote") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "");
  const paidAtInput = String(formData.get("paidAt") ?? "");
  const amountInput = String(formData.get("amount") ?? "");
  const path = `/admin/donors/${donorId}/financial`;

  const existing = await prisma.paymentObligation.findUnique({
    where: { id },
    include: { donorProfile: { include: { user: true } } }
  });
  if (!existing) redirect(`${path}?error=Betaling+niet+gevonden`);

  const data: {
    status: typeof status;
    paidAt?: Date | null;
    amountCents?: number;
    paymentMethod?: "BANK_TRANSFER" | "EXTERNAL_IDEAL" | "EXTERNAL_SEPA" | "OTHER" | null;
    source?: string | null;
    adminNote?: string | null;
    notes?: string | null;
    updatedByAdminId: string;
  } = {
    status,
    updatedByAdminId: adminId
  };

  if (status === "PAID") {
    const paidAt = paidAtInput ? new Date(`${paidAtInput}T00:00:00.000Z`) : null;
    const normalizedAmount = amountInput.replace(",", ".").replace(/[^\d.]/g, "");
    const amountCents = Math.round(Number(normalizedAmount) * 100);

    if (!paidAt || Number.isNaN(paidAt.getTime())) redirect(`${path}?error=Vul+een+geldige+betaaldatum+in`);
    if (!amountInput || Number.isNaN(amountCents) || amountCents <= 0) redirect(`${path}?error=Vul+een+geldig+bedrag+in`);
    if (!["BANK_TRANSFER", "EXTERNAL_IDEAL", "EXTERNAL_SEPA", "OTHER"].includes(paymentMethod)) {
      redirect(`${path}?error=Kies+een+betaalmethode`);
    }

    data.paidAt = paidAt;
    data.amountCents = amountCents;
    data.paymentMethod = paymentMethod as "BANK_TRANSFER" | "EXTERNAL_IDEAL" | "EXTERNAL_SEPA" | "OTHER";
    data.source = `MANUAL_${paymentMethod}`;
    data.adminNote = adminNote || null;
  } else {
    data.paidAt = status === "DUE" ? null : undefined;
    data.paymentMethod = status === "DUE" ? null : undefined;
    data.adminNote = adminNote || null;
    data.notes =
      status === "WAIVED"
        ? "Kwijtgescholden"
        : status === "MANUAL_CORRECTION"
          ? "Handmatige correctie"
          : status === "DUE"
            ? "Openstaand gezet"
            : undefined;
  }

  const updated = await prisma.paymentObligation.update({
    where: { id },
    data
  });
  const year = updated.obligationType === "ANNUAL" ? paymentYear(updated) : null;
  if (year) await reconcileAnnualRemainder(existing.donorProfile.id, year);
  if (updated.obligationType === "ONE_TIME") await reconcileOneTimeRemainder(existing.donorProfile.id);
  const shouldActivateAfterAnnualPayment =
    status === "PAID" &&
    ["ANNUAL", "ONE_TIME"].includes(updated.obligationType) &&
    (await isRegistrationBalancePaid(existing.donorProfile.id)) &&
    existing.donorProfile.status === "INACTIVE";

  await writeAuditLog({
    actorId: adminId,
    action: "UPDATE",
    entityType: "PaymentObligation",
    entityId: id,
    message:
      status === "PAID"
        ? "Betaling handmatig bevestigd"
        : status === "DUE"
          ? "Betaling openstaand gezet"
          : status === "WAIVED"
            ? "Betaling kwijtgescholden"
            : "Betaling handmatig gecorrigeerd",
    metadata: { status, paymentMethod: updated.paymentMethod, amountCents: updated.amountCents }
  });

  if (status === "PAID") {
    const donor = existing.donorProfile;
    if (shouldActivateAfterAnnualPayment) {
      const now = new Date();
      const internalNote = "Automatisch actief gezet nadat de volledige inschrijfschuld is voldaan.";
      const donorMessage = "Uw betaling is bevestigd en uw status is bijgewerkt naar actief.";
      await prisma.$transaction([
        prisma.donorProfile.update({
          where: { id: donor.id },
          data: {
            status: "ACTIVE",
            statusChangedAt: now,
            activeSince: now,
            statusInternalNote: internalNote,
            statusDonorMessage: donorMessage
          }
        }),
        prisma.donorStatusHistory.create({
          data: {
            donorProfileId: donor.id,
            changedById: adminId,
            fromStatus: donor.status,
            toStatus: "ACTIVE",
            internalNote,
            donorMessage
          }
        })
      ]);
      await syncFamilyActivityForDonorStatus(prisma, donor.id, "ACTIVE");
      await writeAuditLog({
        actorId: adminId,
        action: "STATUS_CHANGE",
        entityType: "DonorProfile",
        entityId: donor.id,
        message: "Donateur automatisch actief gezet na jaarlijkse betaling"
      });
    }
    await prepareEmailLog({
      templateKey: "PAYMENT_CONFIRMED",
      recipient: donor.user.email,
      entityType: "PaymentObligation",
      entityId: id,
      data: {
        naam: `${donor.firstName} ${donor.lastName}`.trim(),
        voornaam: donor.firstName,
        achternaam: donor.lastName,
        lidnummer: donor.registrationNumber ?? "",
        bedrag: formatCurrency(updated.amountCents),
        betaaldatum: formatDate(updated.paidAt),
        organisatie: "St. GBC Masjid Ghausia"
      }
    });
  }

  revalidatePath(path);
}

export async function registerBankPayment(formData: FormData) {
  const adminId = await requireAdmin();
  const donorId = String(formData.get("donorId") ?? "");
  const obligationType = String(formData.get("obligationType") ?? "MANUAL") as "ONE_TIME" | "ANNUAL" | "MANUAL";
  const amountInput = String(formData.get("amount") ?? "");
  const paidAtInput = String(formData.get("paidAt") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim();
  const path = `/admin/donors/${donorId}/financial`;

  if (!["ONE_TIME", "ANNUAL", "MANUAL"].includes(obligationType)) redirect(`${path}?error=Kies+een+geldige+betalingssoort`);
  const amountCents = parseAmountCents(amountInput);
  if (!amountInput || amountCents === 0) redirect(`${path}?error=Vul+een+geldig+bedrag+in`);

  const paidAt = paidAtInput ? new Date(`${paidAtInput}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(paidAt.getTime())) redirect(`${path}?error=Vul+een+geldige+betaaldatum+in`);

  const donor = await prisma.donorProfile.findUnique({
    where: { id: donorId },
    include: { user: true }
  });
  if (!donor) redirect("/admin/donors");

  const membershipId = await membershipIdForRegistrationNumber(donor.registrationNumber);
  const payment = await (prisma.paymentObligation.create as any)({
    data: {
      donorProfileId: donor.id,
      ...(membershipId ? { membershipId } : {}),
      updatedByAdminId: adminId,
      lidnummer: donor.registrationNumber,
      obligationType,
      amountCents,
      status: "PAID",
      paymentMethod: "BANK_TRANSFER",
      paidAt,
      adminNote: adminNote || null,
      source: amountCents < 0 ? "MANUAL_BANK_CORRECTION" : "MANUAL_BANK_TRANSFER",
      notes: amountCents < 0 ? "Handmatige aftrek/correctie geregistreerd" : "Bankoverschrijving handmatig geregistreerd"
    }
  });

  await writeAuditLog({
    actorId: adminId,
    action: "CREATE",
    entityType: "PaymentObligation",
    entityId: payment.id,
    message: "Bankbetaling geregistreerd",
    metadata: { donorId, obligationType, amountCents }
  });

  if (obligationType === "ANNUAL") await reconcileAnnualRemainder(donor.id, paidAt.getFullYear());
  if (obligationType === "ONE_TIME") await reconcileOneTimeRemainder(donor.id);

  if (
    amountCents > 0 &&
    ["ANNUAL", "ONE_TIME"].includes(obligationType) &&
    donor.status === "INACTIVE" &&
    (await isRegistrationBalancePaid(donor.id))
  ) {
    const now = new Date();
    const internalNote = "Automatisch actief gezet nadat de volledige inschrijfschuld is voldaan.";
    const donorMessage = "Uw betaling is ontvangen en uw status is bijgewerkt naar actief.";
    await prisma.$transaction([
      prisma.donorProfile.update({
        where: { id: donor.id },
        data: {
          status: "ACTIVE",
          statusChangedAt: now,
          activeSince: now,
          statusInternalNote: internalNote,
          statusDonorMessage: donorMessage
        }
      }),
      prisma.donorStatusHistory.create({
        data: {
          donorProfileId: donor.id,
          changedById: adminId,
          fromStatus: donor.status,
          toStatus: "ACTIVE",
          internalNote,
          donorMessage
        }
      })
    ]);
    await syncFamilyActivityForDonorStatus(prisma, donor.id, "ACTIVE");
    await writeAuditLog({
      actorId: adminId,
      action: "STATUS_CHANGE",
      entityType: "DonorProfile",
      entityId: donor.id,
      message: "Donateur automatisch actief gezet na bankbetaling"
    });
  }

  if (amountCents > 0) {
    await prepareEmailLog({
      templateKey: "PAYMENT_CONFIRMED",
      recipient: donor.user.email,
      entityType: "PaymentObligation",
      entityId: payment.id,
      data: {
        naam: `${donor.firstName} ${donor.lastName}`.trim(),
        voornaam: donor.firstName,
        achternaam: donor.lastName,
        lidnummer: donor.registrationNumber ?? "",
        bedrag: formatCurrency(payment.amountCents),
        betaaldatum: formatDate(payment.paidAt),
        organisatie: "St. GBC Masjid Ghausia"
      }
    });
  }

  revalidatePath(path);
  revalidatePath(`/admin/donors/${donorId}`);
  revalidatePath("/admin");
  redirect(path);
}

export async function resetRegisteredPayments(formData: FormData) {
  const adminId = await requireAdmin();
  const donorId = String(formData.get("donorId") ?? "");
  const confirmed = String(formData.get("confirmReset") ?? "") === "yes";
  const path = `/admin/donors/${donorId}/financial`;

  if (!confirmed) redirect(`${path}?error=Vink+eerst+aan+dat+je+de+betalingsregistraties+wilt+resetten`);

  const donor = await prisma.donorProfile.findUnique({
    where: { id: donorId },
    select: { id: true, registrationNumber: true }
  });
  if (!donor) redirect("/admin/donors");

  const deleted = await prisma.paymentObligation.deleteMany({
    where: { donorProfileId: donor.id }
  });

  await writeAuditLog({
    actorId: adminId,
    action: "DELETE",
    entityType: "PaymentObligation",
    entityId: donor.id,
    message: "Betalingsregistraties van donateur gereset",
    metadata: {
      donorId: donor.id,
      lidnummer: donor.registrationNumber,
      deletedCount: deleted.count
    }
  });

  revalidatePath(path);
  revalidatePath(`/admin/donors/${donor.id}`);
  revalidatePath("/admin/donors");
  revalidatePath("/admin");
  redirect(path);
}

export async function markAnnualPaymentDue(formData: FormData) {
  const adminId = await requireAdmin();
  const donorId = String(formData.get("donorId") ?? "");
  const year = Number(formData.get("year") ?? new Date().getFullYear());
  const path = `/admin/donors/${donorId}/financial`;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) redirect(`${path}?error=Vul+een+geldig+jaar+in`);

  const donor = await prisma.donorProfile.findUnique({ where: { id: donorId } });
  if (!donor) redirect("/admin/donors");

  const annualState = await reconcileAnnualRemainder(donor.id, year);
  if (!annualState?.expectedCents) redirect(`${path}?error=Geen+jaarbijdrage+gevonden+voor+dit+lid`);

  if (annualState.remainingCents > 0 && !["DECEASED", "REJECTED"].includes(donor.status)) {
    const now = new Date();
    await prisma.$transaction([
      prisma.donorProfile.update({
        where: { id: donor.id },
        data: {
          status: "INACTIVE",
          inactiveSince: donor.inactiveSince ?? now,
          statusChangedAt: now,
          statusInternalNote: `Jaarbetaling ${year} handmatig open gezet.`,
          statusDonorMessage: "Er staat nog een jaarlijkse betaling open volgens de administratie."
        }
      }),
      prisma.donorStatusHistory.create({
        data: {
          donorProfileId: donor.id,
          changedById: adminId,
          fromStatus: donor.status,
          toStatus: "INACTIVE",
          internalNote: `Jaarbetaling ${year} handmatig open gezet.`,
          donorMessage: "Er staat nog een jaarlijkse betaling open volgens de administratie."
        }
      })
    ]);
    await syncFamilyActivityForDonorStatus(prisma, donor.id, "INACTIVE");
  }

  await writeAuditLog({
    actorId: adminId,
    action: "UPDATE",
    entityType: "PaymentObligation",
    entityId: donor.id,
    message: "Jaarbetaling handmatig open gezet",
    metadata: { donorId: donor.id, year, remainingCents: annualState.remainingCents }
  });

  revalidatePath(path);
  revalidatePath(`/admin/donors/${donor.id}`);
  revalidatePath("/admin/donors");
  revalidatePath("/admin");
  redirect(path);
}

export async function activateDonorManually(formData: FormData) {
  const adminId = await requireAdmin();
  const donorId = String(formData.get("donorId") ?? "");
  const path = `/admin/donors/${donorId}/financial`;
  const donor = await prisma.donorProfile.findUnique({
    where: { id: donorId },
    include: { paymentObligations: true }
  });

  if (!donor) redirect(`${path}?error=Donateur+niet+gevonden`);
  const canActivate = await isRegistrationBalancePaid(donor.id);
  if (!canActivate) redirect(`${path}?error=Het+restant+van+de+inschrijving+moet+eerst+0+euro+zijn`);

  const now = new Date();
  const internalNote = "Handmatig actief gezet na betaalcontrole.";
  const donorMessage = "Uw betaling is bevestigd en uw status is bijgewerkt naar actief.";
  await prisma.$transaction([
    prisma.donorProfile.update({
      where: { id: donorId },
      data: {
        status: "ACTIVE",
        statusChangedAt: now,
        activeSince: now,
        statusInternalNote: internalNote,
        statusDonorMessage: donorMessage
      }
    }),
    prisma.donorStatusHistory.create({
      data: {
        donorProfileId: donorId,
        changedById: adminId,
        fromStatus: donor.status,
        toStatus: "ACTIVE",
        internalNote,
        donorMessage
      }
    })
  ]);
  await syncFamilyActivityForDonorStatus(prisma, donorId, "ACTIVE");

  await writeAuditLog({
    actorId: adminId,
    action: "STATUS_CHANGE",
    entityType: "DonorProfile",
    entityId: donorId,
    message: "Donateur handmatig geactiveerd na betaalcontrole"
  });

  revalidatePath(path);
  redirect(path);
}
