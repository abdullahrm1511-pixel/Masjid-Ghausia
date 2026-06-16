"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageDonors } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { prepareEmailLog } from "@/lib/email/templates";

type RequestedAccountData = {
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

  await prisma.$transaction([
    prisma.donorProfile.update({
      where: { id: request.donorProfileId },
      data: {
        addressLine1: requestedData.addressLine1,
        postalCode: requestedData.postalCode,
        city: requestedData.city,
        phone: requestedData.phone,
        iban: requestedData.iban,
        accountHolderName: requestedData.accountHolderName,
        pakistanContactName: requestedData.pakistanContactName || null,
        pakistanContactPhone: requestedData.pakistanContactPhone || null,
        funeralWishes: requestedData.funeralWishes || null
      }
    }),
    prisma.user.update({
      where: { id: request.donorProfile.userId },
      data: { email: requestedData.email }
    }),
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
