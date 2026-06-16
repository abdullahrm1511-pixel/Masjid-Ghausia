"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DonorStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const editableStatuses = ["ACTIVE", "INACTIVE", "DECEASED"] as const;

export async function updateDonorStatus(formData: FormData) {
  const session = await auth();
  if (!canManageSettings(session?.user.role)) throw new Error("Geen toegang");

  const donorId = String(formData.get("donorId") ?? "");
  const nextStatus = String(formData.get("status") ?? "") as DonorStatus;
  const internalNote = String(formData.get("internalNote") ?? "").trim();
  const donorMessage = String(formData.get("donorMessage") ?? "").trim();
  const path = `/admin/donors/${donorId}`;

  if (!editableStatuses.includes(nextStatus as (typeof editableStatuses)[number])) {
    redirect(`${path}?error=Kies+een+geldige+status`);
  }
  if (!internalNote || !donorMessage) {
    redirect(`${path}?error=Vul+zowel+een+interne+als+externe+notitie+in`);
  }

  const donor = await prisma.donorProfile.findUnique({ where: { id: donorId } });
  if (!donor) redirect("/admin/donors");

  const now = new Date();
  await prisma.$transaction([
    prisma.donorProfile.update({
      where: { id: donorId },
      data: {
        status: nextStatus,
        statusChangedAt: now,
        activeSince: nextStatus === "ACTIVE" ? now : donor.activeSince,
        inactiveSince: nextStatus === "INACTIVE" ? now : donor.inactiveSince,
        deceasedAt: nextStatus === "DECEASED" ? now : donor.deceasedAt,
        statusInternalNote: internalNote,
        statusDonorMessage: donorMessage
      }
    }),
    prisma.donorStatusHistory.create({
      data: {
        donorProfileId: donorId,
        changedById: session.user.id,
        fromStatus: donor.status,
        toStatus: nextStatus,
        internalNote,
        donorMessage
      }
    })
  ]);

  await writeAuditLog({
    actorId: session.user.id,
    action: "STATUS_CHANGE",
    entityType: "DonorProfile",
    entityId: donorId,
    message: `Donateurstatus gewijzigd van ${donor.status} naar ${nextStatus}`,
    metadata: { internalNote, donorMessage }
  });

  revalidatePath(path);
  revalidatePath("/admin");
  revalidatePath("/admin/donors");
  redirect(path);
}
