"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export type SepaSettingsState = { success: boolean; message: string };

export async function saveSepaSettings(_state: SepaSettingsState, formData: FormData): Promise<SepaSettingsState> {
  try {
    const session = await auth();
    if (!session?.user.id || !canManageSettings(session.user.role)) {
      return { success: false, message: "U heeft geen toegang tot deze instellingen." };
    }

    const rawNoticeDays = Number(formData.get("noticeDays") ?? 3);
    const value = {
      legalName: String(formData.get("legalName") ?? "").trim(),
      creditorIdentifier: String(formData.get("creditorIdentifier") ?? "").trim().toUpperCase(),
      address: String(formData.get("address") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      noticeDays: Number.isFinite(rawNoticeDays) ? Math.min(14, Math.max(1, rawNoticeDays)) : 3,
      termsVersion: String(formData.get("termsVersion") ?? "").trim()
    };

    if (!value.legalName || !value.creditorIdentifier || !value.address || !value.email.includes("@") || !value.termsVersion) {
      return { success: false, message: "Vul alle SEPA-gegevens correct in." };
    }

    await prisma.appConfig.upsert({
      where: { key: "MASJID_MONTHLY_SEPA" },
      update: { value },
      create: { key: "MASJID_MONTHLY_SEPA", value, description: "Officiële gegevens voor maandelijkse Masjid Ghausia SEPA-machtigingen" }
    });
    await writeAuditLog({
      actorId: session.user.id,
      action: "UPDATE",
      entityType: "AppConfig",
      entityId: "MASJID_MONTHLY_SEPA",
      message: "SEPA-instellingen maanddonaties bijgewerkt",
      metadata: { termsVersion: value.termsVersion }
    });
    revalidatePath("/admin/settings/monthly-donations");
    return { success: true, message: "SEPA-instellingen zijn opgeslagen." };
  } catch (error) {
    console.error("SEPA-instellingen opslaan mislukt", error);
    return { success: false, message: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }
}
