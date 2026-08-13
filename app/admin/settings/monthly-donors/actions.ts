"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { syncMonthlyMolliePayment } from "@/lib/monthly-donations";

export type RetryMandateState = { success: boolean; message: string };

export async function retryMonthlyMandate(_state: RetryMandateState, formData: FormData): Promise<RetryMandateState> {
  try {
    const session = await auth();
    if (!session?.user.id || !canManageSettings(session.user.role)) {
      return { success: false, message: "U heeft geen toegang tot deze actie." };
    }
    const donorId = String(formData.get("donorId") ?? "");
    const donor = await prisma.surveyDonor.findUnique({ where: { id: donorId } });
    if (!donor) return { success: false, message: "Donateur niet gevonden." };

    const firstPayment = await prisma.monthlyDonationPayment.findFirst({
      where: { surveyDonorId: donor.id, sequenceType: "first" },
      orderBy: { createdAt: "desc" }
    });
    if (!firstPayment) return { success: false, message: "Geen eerste betaling gevonden om te controleren." };

    const result = await syncMonthlyMolliePayment(firstPayment.molliePaymentId);
    revalidatePath(`/admin/settings/monthly-donors/${donorId}`);
    revalidatePath("/admin/settings/monthly-donors");
    await writeAuditLog({
      actorId: session.user.id,
      action: "UPDATE",
      entityType: "SurveyDonor",
      entityId: donorId,
      message: "Mollie-mandaat handmatig opnieuw gecontroleerd",
      metadata: { resultingStatus: result.donor?.status ?? null, mandatePending: Boolean(result.mandatePending) }
    });

    if (result.mandatePending) return { success: false, message: "Het SEPA-mandaat is bij Mollie nog niet klaar. Probeer het over een paar minuten opnieuw." };
    if (result.donor?.status === "ACTIVE") return { success: true, message: "Het maandelijkse abonnement is nu actief bij Mollie." };
    return { success: true, message: `Status bijgewerkt: ${result.donor?.status ?? "onbekend"}.` };
  } catch (error) {
    console.error("Mollie-mandaat handmatig controleren mislukt", error);
    const detail = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Controleren bij Mollie is niet gelukt: ${detail}` };
  }
}
