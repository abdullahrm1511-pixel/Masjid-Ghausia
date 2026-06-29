"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DonorStatus, FamilyMemberStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { contributesToHousehold } from "@/lib/family-status";
import { syncFamilyActivityForDonorStatus } from "@/lib/household-activity";

const editableStatuses = ["ACTIVE", "INACTIVE", "DECEASED"] as const;
const editableFamilyStatuses = ["ACTIVE_DEPENDENT", "UNDER_18", "ADULT_NEEDS_REGISTRATION", "REGISTERED_SEPARATELY", "NOT_A_MEMBER", "DECEASED"] as const;

function memberFullName(member: { firstName: string; lastName: string | null }) {
  return [member.firstName, member.lastName].filter(Boolean).join(" ");
}

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

  const donor = await prisma.donorProfile.findUnique({
    where: { id: donorId },
    include: { familyMembers: { orderBy: [{ type: "asc" }, { dateOfBirth: "asc" }] } }
  });
  if (!donor) redirect("/admin/donors");

  const now = new Date();
  const promotedParent =
    nextStatus === "DECEASED"
      ? donor.familyMembers.find((member) => member.type === "PARTNER" && contributesToHousehold(member.status) && member.status !== "DECEASED")
      : null;
  const promotionInternalNote = promotedParent
    ? `Partner (${memberFullName(promotedParent)}) automatisch ingesteld als primaire contactpersoon omdat de primaire donateur overleden is.`
    : null;
  const promotionDonorMessage = promotedParent
    ? `De partner ${memberFullName(promotedParent)} is administratief vastgelegd als primaire contactpersoon voor het huishouden.`
    : null;
  const finalInternalNote = [internalNote, promotionInternalNote].filter(Boolean).join("\n");
  const finalDonorMessage = [donorMessage, promotionDonorMessage].filter(Boolean).join("\n");

  await prisma.$transaction(async (tx) => {
    await tx.donorProfile.update({
      where: { id: donorId },
      data: {
        status: nextStatus,
        statusChangedAt: now,
        activeSince: nextStatus === "ACTIVE" ? now : donor.activeSince,
        inactiveSince: nextStatus === "INACTIVE" ? now : donor.inactiveSince,
        deceasedAt: nextStatus === "DECEASED" ? now : donor.deceasedAt,
        statusInternalNote: finalInternalNote,
        statusDonorMessage: finalDonorMessage
      }
    });
    await tx.donorStatusHistory.create({
      data: {
        donorProfileId: donorId,
        changedById: session.user.id,
        fromStatus: donor.status,
        toStatus: nextStatus,
        internalNote: finalInternalNote,
        donorMessage: finalDonorMessage
      }
    });
    await syncFamilyActivityForDonorStatus(tx, donorId, nextStatus);
    if (promotedParent) {
      await tx.familyMember.update({
        where: { id: promotedParent.id },
        data: { status: "ACTIVE_DEPENDENT", isActive: true, relationship: "Primaire contactpersoon" }
      });
      await tx.familyMemberStatusHistory.create({
        data: {
          familyMemberId: promotedParent.id,
          donorProfileId: donorId,
          changedById: session.user.id,
          fromStatus: promotedParent.status,
          toStatus: "ACTIVE_DEPENDENT",
          internalNote: promotionInternalNote ?? "Automatisch ingesteld als primaire contactpersoon.",
          donorMessage: promotionDonorMessage ?? "Automatisch ingesteld als primaire contactpersoon."
        }
      });
    }
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "STATUS_CHANGE",
    entityType: "DonorProfile",
    entityId: donorId,
    message: `Donateurstatus gewijzigd van ${donor.status} naar ${nextStatus}`,
    metadata: { internalNote: finalInternalNote, donorMessage: finalDonorMessage, promotedParentId: promotedParent?.id ?? null }
  });

  revalidatePath(path);
  revalidatePath("/admin");
  revalidatePath("/admin/donors");
  redirect(path);
}

export async function updateHouseholdStatuses(formData: FormData) {
  const session = await auth();
  if (!canManageSettings(session?.user.role)) throw new Error("Geen toegang");

  const donorId = String(formData.get("donorId") ?? "");
  const nextStatus = String(formData.get("primaryStatus") ?? "") as DonorStatus;
  const primaryInternalNote = String(formData.get("primaryInternalNote") ?? "").trim();
  const primaryDonorMessage = String(formData.get("primaryDonorMessage") ?? "").trim();
  const path = `/admin/donors/${donorId}?tab=status`;

  if (!editableStatuses.includes(nextStatus as (typeof editableStatuses)[number])) {
    redirect(`${path}&error=Kies+een+geldige+status+voor+de+primaire+persoon`);
  }

  const donor = await prisma.donorProfile.findUnique({
    where: { id: donorId },
    include: { familyMembers: true }
  });
  if (!donor) redirect("/admin/donors");

  const donorStatusChanged = donor.status !== nextStatus;
  if (donorStatusChanged && (!primaryInternalNote || !primaryDonorMessage)) {
    redirect(`${path}&error=Vul+een+notitie+in+voor+de+primaire+persoon`);
  }

  const familyChanges = donor.familyMembers.flatMap((member) => {
    const rawStatus = String(formData.get(`familyStatus:${member.id}`) ?? "") as FamilyMemberStatus;
    if (!editableFamilyStatuses.includes(rawStatus as (typeof editableFamilyStatuses)[number])) return [];
    const nextIsActive = contributesToHousehold(rawStatus);
    if (rawStatus === member.status) return [];
    const internalNote = String(formData.get(`familyInternalNote:${member.id}`) ?? "").trim();
    const donorMessage = String(formData.get(`familyDonorMessage:${member.id}`) ?? "").trim();
    if (!internalNote || !donorMessage) {
      redirect(`${path}&error=Vul+een+notitie+in+voor+elk+gezinslid+dat+je+wijzigt`);
    }

    return [
      {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        type: member.type,
        dateOfBirth: member.dateOfBirth,
        fromStatus: member.status,
        toStatus: rawStatus,
        nextIsActive,
        internalNote,
        donorMessage
      }
    ];
  });

  if (!donorStatusChanged && familyChanges.length === 0) {
    redirect(`${path}&error=Er+is+geen+statuswijziging+gekozen`);
  }

  const promotedParent =
    nextStatus === "DECEASED"
      ? donor.familyMembers.find((member) => {
          if (member.type !== "PARTNER") return false;
          const planned = familyChanges.find((change) => change.id === member.id);
          const effectiveStatus = planned?.toStatus ?? member.status;
          return contributesToHousehold(effectiveStatus) && effectiveStatus !== "DECEASED";
        })
      : null;
  const needsGuardian =
    nextStatus === "DECEASED" &&
    !promotedParent &&
    donor.familyMembers.some((member) => {
      if (member.type !== "CHILD") return false;
      const planned = familyChanges.find((change) => change.id === member.id);
      const effectiveStatus = planned?.toStatus ?? member.status;
      return effectiveStatus === "UNDER_18";
    });
  const promotionInternalNote = promotedParent
    ? `Partner (${memberFullName(promotedParent)}) automatisch ingesteld als primaire contactpersoon omdat de primaire donateur overleden is.`
    : null;
  const promotionDonorMessage = promotedParent
    ? `De partner ${memberFullName(promotedParent)} is administratief vastgelegd als primaire contactpersoon voor het huishouden.`
    : null;
  const guardianInternalNote = needsGuardian ? "Geen actieve partner gevonden; voogd/contactpersoon nodig voor kinderen onder 18." : null;
  const guardianDonorMessage = needsGuardian ? "Er is administratief vastgelegd dat er een voogd/contactpersoon nodig is voor dit huishouden." : null;

  const latestInternalNote = [
    donorStatusChanged ? `Primair (${donor.firstName} ${donor.lastName}): ${primaryInternalNote}` : null,
    ...familyChanges.map((change) => `${change.name}: ${change.internalNote}`),
    promotionInternalNote,
    guardianInternalNote
  ]
    .filter(Boolean)
    .join("\n");
  const latestDonorMessage = [
    donorStatusChanged ? `Primair (${donor.firstName} ${donor.lastName}): ${primaryDonorMessage}` : null,
    ...familyChanges.map((change) => `${change.name}: ${change.donorMessage}`),
    promotionDonorMessage,
    guardianDonorMessage
  ]
    .filter(Boolean)
    .join("\n");

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    if (donorStatusChanged) {
      await tx.donorProfile.update({
        where: { id: donorId },
        data: {
          status: nextStatus,
          statusChangedAt: now,
          activeSince: nextStatus === "ACTIVE" ? now : donor.activeSince,
          inactiveSince: nextStatus === "INACTIVE" ? now : donor.inactiveSince,
          deceasedAt: nextStatus === "DECEASED" ? now : donor.deceasedAt,
          statusInternalNote: latestInternalNote,
          statusDonorMessage: latestDonorMessage
        }
      });
      await tx.donorStatusHistory.create({
        data: {
          donorProfileId: donorId,
          changedById: session.user.id,
          fromStatus: donor.status,
          toStatus: nextStatus,
          internalNote: primaryInternalNote,
          donorMessage: primaryDonorMessage
        }
      });
      await syncFamilyActivityForDonorStatus(tx, donorId, nextStatus);
    } else {
      await tx.donorProfile.update({
        where: { id: donorId },
        data: {
          statusInternalNote: latestInternalNote,
          statusDonorMessage: latestDonorMessage
        }
      });
    }

    for (const change of familyChanges) {
      await tx.familyMember.update({
        where: { id: change.id },
        data: { status: change.toStatus, isActive: change.nextIsActive }
      });
      await tx.familyMemberStatusHistory.create({
        data: {
          familyMemberId: change.id,
          donorProfileId: donorId,
          changedById: session.user.id,
          fromStatus: change.fromStatus,
          toStatus: change.toStatus,
          internalNote: change.internalNote,
          donorMessage: change.donorMessage
        }
      });

      if (change.type !== "CHILD") continue;
      const turned18At = new Date(Date.UTC(change.dateOfBirth.getUTCFullYear() + 18, change.dateOfBirth.getUTCMonth(), change.dateOfBirth.getUTCDate()));
      if (change.toStatus === "ADULT_NEEDS_REGISTRATION") {
        await tx.adultChildTransition.upsert({
          where: { familyMemberId: change.id },
          update: {
            previousDonorProfileId: donorId,
            turned18At,
            status: "NEEDS_REGISTRATION",
            notes: change.internalNote
          },
          create: {
            familyMemberId: change.id,
            previousDonorProfileId: donorId,
            turned18At,
            status: "NEEDS_REGISTRATION",
            notes: change.internalNote
          }
        });
      }
      if (change.toStatus === "REGISTERED_SEPARATELY") {
        await tx.adultChildTransition.updateMany({
          where: { familyMemberId: change.id },
          data: { status: "REGISTERED", resolvedById: session.user.id, resolvedAt: now, notes: change.internalNote }
        });
      }
      if (change.toStatus === "NOT_A_MEMBER") {
        await tx.adultChildTransition.updateMany({
          where: { familyMemberId: change.id },
          data: { status: "DISMISSED", resolvedById: session.user.id, resolvedAt: now, notes: change.internalNote }
        });
      }
    }

    if (donorStatusChanged) {
      await syncFamilyActivityForDonorStatus(tx, donorId, nextStatus);
    }

    if (promotedParent) {
      await tx.familyMember.update({
        where: { id: promotedParent.id },
        data: { status: "ACTIVE_DEPENDENT", isActive: true, relationship: "Primaire contactpersoon" }
      });
      await tx.familyMemberStatusHistory.create({
        data: {
          familyMemberId: promotedParent.id,
          donorProfileId: donorId,
          changedById: session.user.id,
          fromStatus: promotedParent.status,
          toStatus: "ACTIVE_DEPENDENT",
          internalNote: promotionInternalNote ?? "Automatisch ingesteld als primaire contactpersoon.",
          donorMessage: promotionDonorMessage ?? "Automatisch ingesteld als primaire contactpersoon."
        }
      });
    }
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "STATUS_CHANGE",
    entityType: "DonorProfile",
    entityId: donorId,
    message: donorStatusChanged
      ? `Huishoudstatus bijgewerkt, primaire status van ${donor.status} naar ${nextStatus}`
      : "Huishoudstatus bijgewerkt",
    metadata: {
      primary: donorStatusChanged
        ? {
            fromStatus: donor.status,
            toStatus: nextStatus,
            internalNote: primaryInternalNote,
            donorMessage: primaryDonorMessage
          }
        : null,
      familyChanges,
      promotedParent: promotedParent ? { id: promotedParent.id, name: memberFullName(promotedParent) } : null,
      needsGuardian
    }
  });

  revalidatePath(`/admin/donors/${donorId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/donors");
  redirect(`/admin/donors/${donorId}?tab=status`);
}
