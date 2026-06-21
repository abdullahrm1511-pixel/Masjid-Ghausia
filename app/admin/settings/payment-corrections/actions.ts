"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { membershipIdForRegistrationNumber } from "@/lib/membership";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

async function requireSuperAdmin() {
  const session = await auth();
  if (!canManageSettings(session?.user.role)) throw new Error("Geen toegang");
  return session.user.id;
}

function parseAmountCents(value: string) {
  const normalized = value.trim().replace(",", ".").replace(/[^\d.]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function normalizeRegistrationNumber(value: string) {
  const cleaned = value.trim();
  const prefixed = cleaned.match(/^11\D*(\d{1,5})$/i);
  if (prefixed) return `11-${prefixed[1].padStart(5, "0")}`;
  if (/^\d{1,5}$/.test(cleaned)) return `11-${cleaned.padStart(5, "0")}`;
  return cleaned;
}

export async function createPaymentCorrection(formData: FormData) {
  const adminId = await requireSuperAdmin();
  const configuredCode = process.env.FINANCIAL_CORRECTION_CODE;
  const code = String(formData.get("code") ?? "");
  const lidnummer = normalizeRegistrationNumber(String(formData.get("registrationNumber") ?? ""));
  const correctionType = String(formData.get("correctionType") ?? "");
  const amountCentsInput = parseAmountCents(String(formData.get("amount") ?? ""));
  const adminNote = String(formData.get("adminNote") ?? "").trim();
  const path = "/admin/settings/payment-corrections";

  if (!configuredCode) redirect(`${path}?error=Correctiecode+niet+ingesteld+in+de+server`);
  if (code !== configuredCode) redirect(`${path}?error=Correctiecode+klopt+niet`);
  if (!lidnummer) redirect(`${path}?error=Vul+een+lidnummer+in`);
  if (amountCentsInput <= 0) redirect(`${path}?error=Vul+een+geldig+bedrag+in`);

  const donor = await prisma.donorProfile.findUnique({
    where: { registrationNumber: lidnummer },
    select: { id: true, registrationNumber: true }
  });
  if (!donor) redirect(`${path}?error=Lidnummer+niet+gevonden`);

  const typeMap: Record<string, { obligationType: "ANNUAL" | "ONE_TIME" | "MANUAL"; status: "DUE" | "PAID"; sign: 1 | -1; label: string }> = {
    annual_due: { obligationType: "ANNUAL", status: "DUE", sign: 1, label: "Jaarbetaling open gezet" },
    one_time_due: { obligationType: "ONE_TIME", status: "DUE", sign: 1, label: "Eenmalige betaling open gezet" },
    manual_due: { obligationType: "MANUAL", status: "DUE", sign: 1, label: "Handmatige schuld toegevoegd" },
    annual_paid: { obligationType: "ANNUAL", status: "PAID", sign: 1, label: "Jaarbetaling ontvangen toegevoegd" },
    one_time_paid: { obligationType: "ONE_TIME", status: "PAID", sign: 1, label: "Eenmalige betaling ontvangen toegevoegd" },
    manual_paid: { obligationType: "MANUAL", status: "PAID", sign: 1, label: "Extra betaling ontvangen toegevoegd" },
    credit_correction: { obligationType: "MANUAL", status: "PAID", sign: -1, label: "Aftrek/correctie toegevoegd" }
  };

  const selected = typeMap[correctionType];
  if (!selected) redirect(`${path}?error=Kies+een+geldige+correctiesoort`);

  const amountCents = amountCentsInput * selected.sign;
  const now = new Date();
  const membershipId = await membershipIdForRegistrationNumber(donor.registrationNumber);
  const payment = await (prisma.paymentObligation.create as any)({
    data: {
      donorProfileId: donor.id,
      ...(membershipId ? { membershipId } : {}),
      updatedByAdminId: adminId,
      lidnummer: donor.registrationNumber,
      obligationType: selected.obligationType,
      status: selected.status,
      amountCents,
      dueDate: selected.status === "DUE" ? now : null,
      paidAt: selected.status === "PAID" ? now : null,
      paymentMethod: selected.status === "PAID" && amountCents > 0 ? "BANK_TRANSFER" : null,
      source: "ADMIN_PAYMENT_CORRECTION",
      adminNote: adminNote || null,
      notes: selected.label
    }
  });

  await writeAuditLog({
    actorId: adminId,
    action: "CREATE",
    entityType: "PaymentObligation",
    entityId: payment.id,
    message: selected.label,
    metadata: {
      donorId: donor.id,
      lidnummer: donor.registrationNumber,
      correctionType,
      amountCents
    }
  });

  revalidatePath(`/admin/donors/${donor.id}`);
  revalidatePath(`/admin/donors/${donor.id}/financial`);
  revalidatePath("/admin/donors");
  redirect(`${path}?success=Correctie+opgeslagen+voor+${encodeURIComponent(donor.registrationNumber ?? lidnummer)}`);
}
