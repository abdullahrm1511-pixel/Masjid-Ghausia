"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageDonors } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { prepareEmailLog } from "@/lib/email/templates";

type RequestedAccountData = {
  profile?: RequestedProfileData;
  familyMembers?: RequestedFamilyMemberData[];
  addressLine1?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  email?: string;
  iban?: string;
  accountHolderName?: string;
  pakistanContactName?: string;
  pakistanContactPhone?: string;
  funeralWishes?: string;
};

type RequestedProfileData = {
  firstName?: string;
  lastName?: string;
  gender?: "MALE" | "FEMALE" | null;
  dateOfBirth?: string | null;
  birthPlace?: string;
  phone?: string;
  email?: string;
  maritalStatus?: "SINGLE" | "MARRIED" | "WIDOWED" | "DIVORCED" | null;
  addressLine1?: string;
  addressLine2?: string | null;
  postalCode?: string;
  city?: string;
  country?: string;
  iban?: string;
  accountHolderName?: string;
  pakistanContactName?: string | null;
  pakistanContactPhone?: string | null;
  funeralWishes?: string | null;
  notes?: string | null;
};

type RequestedFamilyMemberData = {
  id?: string;
  firstName?: string;
  lastName?: string;
  gender?: "MALE" | "FEMALE" | null;
  dateOfBirth?: string | null;
  birthPlace?: string | null;
  relationship?: string | null;
};

async function requireAdmin() {
  const session = await auth();
  if (!canManageDonors(session?.user.role)) {
    throw new Error("Geen toegang");
  }
  return session.user.id;
}

export async function approveChangeRequest(formData: FormData) {
  const adminId = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const request = await prisma.changeRequest.findUnique({
    where: { id },
    include: { donorProfile: { include: { user: true } } }
  });

  if (!request) {
    redirect("/admin/change-requests");
  }

  const requestedData = request.requestedData as RequestedAccountData;
  const profileData: RequestedProfileData = requestedData.profile ?? {
    addressLine1: requestedData.addressLine1,
    postalCode: requestedData.postalCode,
    city: requestedData.city,
    phone: requestedData.phone,
    email: requestedData.email,
    iban: requestedData.iban,
    accountHolderName: requestedData.accountHolderName,
    pakistanContactName: requestedData.pakistanContactName ?? null,
    pakistanContactPhone: requestedData.pakistanContactPhone ?? null,
    funeralWishes: requestedData.funeralWishes ?? null
  };
  const familyMembers = requestedData.familyMembers ?? [];
  const familyMemberIds = familyMembers.map((member) => member.id).filter((id): id is string => Boolean(id));
  const existingFamilyMembers = familyMemberIds.length
    ? await prisma.familyMember.findMany({
        where: {
          donorProfileId: request.donorProfileId,
          id: { in: familyMemberIds }
        },
        select: { id: true }
      })
    : [];
  const existingFamilyMemberIds = new Set(existingFamilyMembers.map((member) => member.id));

  if (familyMemberIds.some((memberId) => !existingFamilyMemberIds.has(memberId))) {
    redirect(`/admin/change-requests/${id}`);
  }

  await prisma.$transaction([
    prisma.donorProfile.update({
      where: { id: request.donorProfileId },
      data: {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        gender: profileData.gender ?? null,
        dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : request.donorProfile.dateOfBirth,
        birthPlace: profileData.birthPlace,
        phone: profileData.phone,
        maritalStatus: profileData.maritalStatus ?? null,
        addressLine1: profileData.addressLine1,
        addressLine2: profileData.addressLine2 ?? null,
        postalCode: profileData.postalCode,
        city: profileData.city,
        country: profileData.country ?? "NL",
        iban: profileData.iban,
        accountHolderName: profileData.accountHolderName,
        pakistanContactName: profileData.pakistanContactName || null,
        pakistanContactPhone: profileData.pakistanContactPhone || null,
        funeralWishes: profileData.funeralWishes || null,
        notes: profileData.notes || null
      }
    }),
    prisma.user.update({
      where: { id: request.donorProfile.userId },
      data: { email: profileData.email }
    }),
    ...familyMembers.map((member) =>
      prisma.familyMember.update({
        where: { id: member.id },
        data: {
          firstName: member.firstName,
          lastName: member.lastName,
          gender: member.gender ?? null,
          dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth) : undefined,
          birthPlace: member.birthPlace || null,
          relationship: member.relationship || null
        }
      })
    ),
    prisma.changeRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedById: adminId,
        reviewedAt: new Date(),
        adminNote: String(formData.get("adminNote") ?? "").trim() || null,
        donorMessage: "Uw wijzigingsverzoek is goedgekeurd."
      }
    })
  ]);

  await writeAuditLog({
    actorId: adminId,
    action: "APPROVE",
    entityType: "ChangeRequest",
    entityId: id,
    message: "Wijzigingsverzoek goedgekeurd"
  });

  await prepareEmailLog({
    templateKey: "CHANGE_REQUEST_APPROVED",
    recipient: request.donorProfile.user.email,
    entityType: "ChangeRequest",
    entityId: id,
    data: {
      naam: `${request.donorProfile.firstName} ${request.donorProfile.lastName}`.trim(),
      voornaam: request.donorProfile.firstName,
      achternaam: request.donorProfile.lastName,
      lidnummer: request.donorProfile.registrationNumber ?? "",
      organisatie: "St. GBC Masjid Ghausia"
    }
  });

  redirect(`/admin/change-requests/${id}`);
}

export async function rejectChangeRequest(formData: FormData) {
  const adminId = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim();
  const donorMessage = String(formData.get("donorMessage") ?? "").trim();

  const request = await prisma.changeRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedById: adminId,
      reviewedAt: new Date(),
      adminNote,
      donorMessage
    },
    include: { donorProfile: { include: { user: true } } }
  });

  await writeAuditLog({
    actorId: adminId,
    action: "REJECT",
    entityType: "ChangeRequest",
    entityId: id,
    message: "Wijzigingsverzoek afgewezen"
  });

  await prepareEmailLog({
    templateKey: "CHANGE_REQUEST_REJECTED",
    recipient: request.donorProfile.user.email,
    entityType: "ChangeRequest",
    entityId: id,
    data: {
      naam: `${request.donorProfile.firstName} ${request.donorProfile.lastName}`.trim(),
      voornaam: request.donorProfile.firstName,
      achternaam: request.donorProfile.lastName,
      lidnummer: request.donorProfile.registrationNumber ?? "",
      reden: donorMessage || adminNote,
      organisatie: "St. GBC Masjid Ghausia"
    }
  });

  redirect(`/admin/change-requests/${id}`);
}
