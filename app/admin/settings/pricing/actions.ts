"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { DEFAULT_PRICING_CONFIG, type PricingConfig } from "@/lib/pricing-config";
import { getPricingConfig, savePricingConfig } from "@/lib/pricing";
import { writeAuditLog } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!canManageSettings(session?.user.role)) throw new Error("Geen toegang");
  return session.user.id;
}

function numberValue(formData: FormData, key: string) {
  return Number(String(formData.get(key) ?? "0").replace(",", "."));
}

function dateParts(formData: FormData, key: string, fallbackDay: number, fallbackMonth: number) {
  const [day, month] = String(formData.get(key) ?? "").split("-").map((item) => Number(item));
  return {
    day: Number.isFinite(day) && day > 0 ? day : fallbackDay,
    month: Number.isFinite(month) && month > 0 ? month : fallbackMonth
  };
}

export async function savePricing(formData: FormData) {
  const adminId = await requireAdmin();
  const oldValue = await getPricingConfig();
  const start = dateParts(formData, "paymentWindowStart", DEFAULT_PRICING_CONFIG.paymentWindowStartDay, DEFAULT_PRICING_CONFIG.paymentWindowStartMonth);
  const end = dateParts(formData, "paymentWindowEnd", DEFAULT_PRICING_CONFIG.paymentWindowEndDay, DEFAULT_PRICING_CONFIG.paymentWindowEndMonth);
  const config: PricingConfig = {
    annualIndividual18Plus: numberValue(formData, "annualIndividual18Plus"),
    annualSingleParent: numberValue(formData, "annualSingleParent"),
    annualFamily: numberValue(formData, "annualFamily"),
    paymentWindowStartDay: start.day,
    paymentWindowStartMonth: start.month,
    paymentWindowEndDay: end.day,
    paymentWindowEndMonth: end.month,
    monthlyPenaltyAfterWindow: numberValue(formData, "monthlyPenaltyAfterWindow"),
    oneTimeBrackets: DEFAULT_PRICING_CONFIG.oneTimeBrackets.map((bracket, index) => ({
      ...bracket,
      amount: numberValue(formData, `bracket.${index}`)
    }))
  };

  await savePricingConfig(config);
  await writeAuditLog({
    actorId: adminId,
    action: "UPDATE",
    entityType: "AppConfig",
    entityId: "pricing.rules",
    message: "Prijsinstellingen aangepast",
    metadata: { oldValue, newValue: config }
  });

  revalidatePath("/admin/settings/pricing");
}

export async function resetPricing() {
  const adminId = await requireAdmin();
  const oldValue = await getPricingConfig();
  await savePricingConfig(DEFAULT_PRICING_CONFIG);
  await writeAuditLog({
    actorId: adminId,
    action: "UPDATE",
    entityType: "AppConfig",
    entityId: "pricing.rules",
    message: "Prijsinstellingen gereset",
    metadata: { oldValue, newValue: DEFAULT_PRICING_CONFIG }
  });
  revalidatePath("/admin/settings/pricing");
}
