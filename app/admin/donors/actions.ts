"use server";

import { revalidatePath } from "next/cache";
import type { DonorStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { syncFamilyActivityForDonorStatus } from "@/lib/household-activity";
import { findDonorByRegistrationNumber } from "@/lib/membership";

const bulkEditableStatuses = ["ACTIVE", "INACTIVE", "PAYMENT_REQUIRED"] as const;

export type BulkStatusState = {
  updated: number;
  notFound: string[];
  error?: string;
};

export async function bulkUpdateDonorStatus(_previous: BulkStatusState, formData: FormData): Promise<BulkStatusState> {
  const session = await auth();
  if (!canManageSettings(session?.user.role)) return { updated: 0, notFound: [], error: "Geen toegang." };

  const nextStatus = String(formData.get("status") ?? "") as DonorStatus;
  if (!bulkEditableStatuses.includes(nextStatus as (typeof bulkEditableStatuses)[number])) {
    return { updated: 0, notFound: [], error: "Kies een geldige status." };
  }
  const internalNote = String(formData.get("internalNote") ?? "").trim();
  const donorMessage = String(formData.get("donorMessage") ?? "").trim();
  if (!internalNote || !donorMessage) {
    return { updated: 0, notFound: [], error: "Vul zowel een interne notitie als een bericht aan de donateur in." };
  }

  const rawNumbers = String(formData.get("registrationNumbers") ?? "")
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const uniqueNumbers = [...new Set(rawNumbers)];
  if (!uniqueNumbers.length) return { updated: 0, notFound: [], error: "Vul minstens één lidnummer in." };

  const now = new Date();
  const notFound: string[] = [];
  let updated = 0;

  for (const rawNumber of uniqueNumbers) {
    const donor = await findDonorByRegistrationNumber(rawNumber);
    if (!donor) {
      notFound.push(rawNumber);
      continue;
    }
    const fullDonor = await prisma.donorProfile.findUnique({ where: { id: donor.id } });
    if (!fullDonor) {
      notFound.push(rawNumber);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.donorProfile.update({
        where: { id: fullDonor.id },
        data: {
          status: nextStatus,
          statusChangedAt: now,
          activeSince: nextStatus === "ACTIVE" ? (fullDonor.activeSince ?? now) : fullDonor.activeSince,
          inactiveSince: nextStatus === "INACTIVE" ? (fullDonor.inactiveSince ?? now) : fullDonor.inactiveSince,
          statusInternalNote: internalNote,
          statusDonorMessage: donorMessage
        }
      });
      await tx.donorStatusHistory.create({
        data: {
          donorProfileId: fullDonor.id,
          changedById: session!.user.id,
          fromStatus: fullDonor.status,
          toStatus: nextStatus,
          internalNote,
          donorMessage
        }
      });
      await syncFamilyActivityForDonorStatus(tx, fullDonor.id, nextStatus);
    });
    updated += 1;
  }

  await writeAuditLog({
    actorId: session!.user.id,
    action: "STATUS_CHANGE",
    entityType: "DonorProfile",
    message: `Bulkstatus gewijzigd naar ${nextStatus} voor ${updated} donateur(en)`,
    metadata: { nextStatus, internalNote, donorMessage, requested: uniqueNumbers.length, updated, notFound }
  });

  revalidatePath("/admin/donors");
  revalidatePath("/admin");
  return { updated, notFound };
}
