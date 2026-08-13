"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export async function saveSepaSettings(formData: FormData) {
  const session = await auth(); if (!session?.user.id || !canManageSettings(session.user.role)) throw new Error("Geen toegang");
  const value = { legalName: String(formData.get("legalName") ?? "").trim(), creditorIdentifier: String(formData.get("creditorIdentifier") ?? "").trim(), address: String(formData.get("address") ?? "").trim(), email: String(formData.get("email") ?? "").trim().toLowerCase(), noticeDays: Math.min(14, Math.max(1, Number(formData.get("noticeDays") ?? 3))), termsVersion: String(formData.get("termsVersion") ?? "").trim() };
  if (!value.legalName || !value.creditorIdentifier || !value.address || !value.email.includes("@") || !value.termsVersion) throw new Error("Vul alle SEPA-gegevens correct in.");
  await prisma.appConfig.upsert({ where: { key: "MASJID_MONTHLY_SEPA" }, update: { value }, create: { key: "MASJID_MONTHLY_SEPA", value, description: "Officiële gegevens voor maandelijkse Masjid Ghausia SEPA-machtigingen" } });
  await writeAuditLog({ actorId: session.user.id, action: "UPDATE", entityType: "AppConfig", entityId: "MASJID_MONTHLY_SEPA", message: "SEPA-instellingen maanddonaties bijgewerkt", metadata: { termsVersion: value.termsVersion } });
  revalidatePath("/admin/settings/monthly-donations");
}
