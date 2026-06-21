"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

async function requireSuperAdmin() {
  const session = await auth();
  if (!canManageSettings(session?.user.role)) throw new Error("Geen toegang");
  return session.user.id;
}

function pagePath(message?: string) {
  return message ? `/admin/family-transitions?message=${encodeURIComponent(message)}` : "/admin/family-transitions";
}

export async function markAdultTransitionInvited(formData: FormData) {
  const adminId = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const transition = await prisma.adultChildTransition.update({
    where: { id },
    data: {
      status: "INVITED",
      notes: note || "Gemarkeerd als uitgenodigd voor zelfstandige inschrijving."
    }
  });

  await writeAuditLog({
    actorId: adminId,
    action: "UPDATE",
    entityType: "AdultChildTransition",
    entityId: id,
    message: "18+ kandidaat gemarkeerd als uitgenodigd",
    metadata: { note }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/family-transitions");
  revalidatePath(`/admin/donors/${transition.previousDonorProfileId}`);
  redirect(pagePath("18+ kandidaat gemarkeerd als uitgenodigd."));
}

export async function dismissAdultTransition(formData: FormData) {
  const adminId = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const transition = await prisma.adultChildTransition.findUnique({ where: { id }, include: { familyMember: true } });
  if (!transition) redirect(pagePath("18+ kandidaat niet gevonden."));
  if (!note) redirect(pagePath("Vul een interne notitie in bij geen lid / geen interesse."));

  await prisma.$transaction([
    prisma.familyMember.update({
      where: { id: transition.familyMemberId },
      data: { status: "NOT_A_MEMBER", isActive: false }
    }),
    prisma.adultChildTransition.update({
      where: { id },
      data: {
        status: "DISMISSED",
        notes: note,
        resolvedById: adminId,
        resolvedAt: new Date()
      }
    }),
    prisma.familyMemberStatusHistory.create({
      data: {
        familyMemberId: transition.familyMemberId,
        donorProfileId: transition.previousDonorProfileId,
        changedById: adminId,
        fromStatus: transition.familyMember.status,
        toStatus: "NOT_A_MEMBER",
        internalNote: note,
        donorMessage: "Deze persoon staat niet als zelfstandig lid geregistreerd."
      }
    })
  ]);

  await writeAuditLog({
    actorId: adminId,
    action: "UPDATE",
    entityType: "AdultChildTransition",
    entityId: id,
    message: "18+ kandidaat gemarkeerd als geen lid",
    metadata: { note }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/family-transitions");
  revalidatePath(`/admin/donors/${transition.previousDonorProfileId}`);
  redirect(pagePath("18+ kandidaat gemarkeerd als geen lid."));
}

export async function linkAdultTransitionToDonor(formData: FormData) {
  const adminId = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const registrationNumber = String(formData.get("registrationNumber") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const transition = await prisma.adultChildTransition.findUnique({ where: { id }, include: { familyMember: true } });
  if (!transition) redirect(pagePath("18+ kandidaat niet gevonden."));
  if (!registrationNumber) redirect(pagePath("Vul het nieuwe zelfstandige lidnummer in."));

  const newDonor = await prisma.donorProfile.findUnique({ where: { registrationNumber } });
  if (!newDonor) redirect(pagePath(`Geen donateur gevonden met lidnummer ${registrationNumber}.`));

  await prisma.$transaction([
    prisma.familyMember.update({
      where: { id: transition.familyMemberId },
      data: { status: "REGISTERED_SEPARATELY", isActive: false }
    }),
    prisma.adultChildTransition.update({
      where: { id },
      data: {
        status: "REGISTERED",
        newDonorProfileId: newDonor.id,
        notes: note || `Gekoppeld aan zelfstandig lid ${registrationNumber}.`,
        resolvedById: adminId,
        resolvedAt: new Date()
      }
    }),
    prisma.familyMemberStatusHistory.create({
      data: {
        familyMemberId: transition.familyMemberId,
        donorProfileId: transition.previousDonorProfileId,
        changedById: adminId,
        fromStatus: transition.familyMember.status,
        toStatus: "REGISTERED_SEPARATELY",
        internalNote: note || `Gekoppeld aan zelfstandig lid ${registrationNumber}.`,
        donorMessage: "Deze persoon staat nu als zelfstandig lid geregistreerd."
      }
    })
  ]);

  await writeAuditLog({
    actorId: adminId,
    action: "UPDATE",
    entityType: "AdultChildTransition",
    entityId: id,
    message: "18+ kandidaat gekoppeld aan zelfstandige inschrijving",
    metadata: { registrationNumber, newDonorId: newDonor.id, note }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/family-transitions");
  revalidatePath(`/admin/donors/${transition.previousDonorProfileId}`);
  revalidatePath(`/admin/donors/${newDonor.id}`);
  redirect(pagePath("18+ kandidaat gekoppeld aan zelfstandig lid."));
}

export async function saveGuardianContact(formData: FormData) {
  const adminId = await requireSuperAdmin();
  const donorId = String(formData.get("donorId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const relation = String(formData.get("relation") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!name || !phone || !relation) redirect(pagePath("Vul naam, telefoon en relatie van de voogd/contactpersoon in."));

  const donor = await prisma.donorProfile.findUnique({ where: { id: donorId } });
  if (!donor) redirect(pagePath("Huishouden niet gevonden."));

  const guardianNote = [
    `Voogd/contactpersoon: ${name}`,
    `Telefoon: ${phone}`,
    `Relatie: ${relation}`,
    note ? `Notitie: ${note}` : null
  ]
    .filter(Boolean)
    .join("\n");

  await prisma.donorProfile.update({
    where: { id: donorId },
    data: {
      notes: [donor.notes, guardianNote].filter(Boolean).join("\n\n"),
      statusInternalNote: guardianNote,
      statusDonorMessage: "Er is een voogd/contactpersoon administratief vastgelegd voor dit huishouden."
    }
  });

  await writeAuditLog({
    actorId: adminId,
    action: "UPDATE",
    entityType: "DonorProfile",
    entityId: donorId,
    message: "Voogd/contactpersoon vastgelegd",
    metadata: { name, phone, relation, note }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/family-transitions");
  revalidatePath(`/admin/donors/${donorId}`);
  redirect(pagePath("Voogd/contactpersoon opgeslagen."));
}

export async function markPartnerPrimaryContact(formData: FormData) {
  const adminId = await requireSuperAdmin();
  const donorId = String(formData.get("donorId") ?? "");
  const familyMemberId = String(formData.get("familyMemberId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const partner = await prisma.familyMember.findUnique({ where: { id: familyMemberId } });
  if (!partner || partner.donorProfileId !== donorId || partner.type !== "PARTNER") {
    redirect(pagePath("Partner niet gevonden."));
  }

  const internalNote = `Partner ${partner.firstName} ${partner.lastName} gemarkeerd als primaire contactpersoon.${note ? `\n${note}` : ""}`;
  await prisma.$transaction([
    prisma.familyMember.update({
      where: { id: familyMemberId },
      data: {
        status: "ACTIVE_DEPENDENT",
        isActive: true,
        relationship: "Primaire contactpersoon"
      }
    }),
    prisma.donorProfile.update({
      where: { id: donorId },
      data: {
        statusInternalNote: internalNote,
        statusDonorMessage: "De partner is administratief vastgelegd als primaire contactpersoon voor het huishouden."
      }
    }),
    prisma.familyMemberStatusHistory.create({
      data: {
        familyMemberId,
        donorProfileId: donorId,
        changedById: adminId,
        fromStatus: partner.status,
        toStatus: "ACTIVE_DEPENDENT",
        internalNote,
        donorMessage: "Partner is primaire contactpersoon voor het huishouden."
      }
    })
  ]);

  await writeAuditLog({
    actorId: adminId,
    action: "UPDATE",
    entityType: "FamilyMember",
    entityId: familyMemberId,
    message: "Partner gemarkeerd als primaire contactpersoon",
    metadata: { donorId, note }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/family-transitions");
  revalidatePath(`/admin/donors/${donorId}`);
  redirect(pagePath("Partner gemarkeerd als primaire contactpersoon."));
}
