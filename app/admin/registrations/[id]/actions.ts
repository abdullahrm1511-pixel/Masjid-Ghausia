"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRegistrationNumber } from "@/lib/registration/numbers";
import { writeAuditLog } from "@/lib/audit";
import { isAdminRole } from "@/lib/permissions";
import { prepareEmailLog } from "@/lib/email/templates";
import { ensurePrimaryMembership } from "@/lib/membership";
import { calculateCurrentAnnualAmount, calculateTotalOneTimeContribution, getPricingConfig, oneTimePaymentDeadline } from "@/lib/pricing";
import { syncFamilyActivityForDonorStatus } from "@/lib/household-activity";

async function requireAdmin() {
  const session = await auth();
  if (!isAdminRole(session?.user.role)) {
    throw new Error("Geen toegang");
  }
  return session.user.id;
}

export async function approveRegistration(formData: FormData) {
  const adminId = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const request = await prisma.registrationRequest.findUnique({
    where: { id },
    include: { donorProfile: { include: { familyMembers: true, paymentObligations: true } }, requestedBy: true }
  });

  if (!request?.donorProfile) {
    redirect("/admin/registrations");
  }

  const registrationNumber = request.donorProfile.registrationNumber ?? (await generateRegistrationNumber());
  const now = new Date();
  const pricing = await getPricingConfig();
  const currentYear = now.getFullYear();
  const annualAmountCents = calculateCurrentAnnualAmount(request.donorProfile, request.donorProfile.familyMembers, pricing, now) * 100;
  const oneTimeAmountCents = calculateTotalOneTimeContribution(request.donorProfile, request.donorProfile.familyMembers, pricing, now) * 100;
  const hasCurrentAnnualObligation = request.donorProfile.paymentObligations.some(
    (item) =>
      item.obligationType === "ANNUAL" &&
      ((item.dueDate ?? item.paidAt ?? item.createdAt).getFullYear() === currentYear || item.lidnummer === `${registrationNumber}-${currentYear}`)
  );
  const hasOneTimeObligation = request.donorProfile.paymentObligations.some((item) => item.obligationType === "ONE_TIME");

  await prisma.$transaction([
    prisma.donorProfile.update({
      where: { id: request.donorProfile.id },
      data: {
        registrationNumber,
        status: "INACTIVE",
        approvedAt: now,
        statusChangedAt: now,
        inactiveSince: now,
        statusInternalNote: "Registratie goedgekeurd, eerste betaling staat nog open.",
        statusDonorMessage: "Uw aanvraag is goedgekeurd. De eerste betaling moet nog bevestigd worden."
      }
    }),
    prisma.user.update({
      where: { id: request.requestedById },
      data: { isActive: true }
    }),
    prisma.registrationRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedById: adminId,
        reviewedAt: now,
        donorMessage: "Uw aanvraag is goedgekeurd."
      }
    }),
    ...(annualAmountCents > 0 && !hasCurrentAnnualObligation
      ? [
          prisma.paymentObligation.create({
            data: {
              donorProfileId: request.donorProfile.id,
              lidnummer: `${registrationNumber}-${currentYear}`,
              obligationType: "ANNUAL",
              amountCents: annualAmountCents,
              status: "DUE",
              dueDate: now,
              source: "REGISTRATION_APPROVAL_ANNUAL",
              notes: `Jaarlijkse bijdrage ${currentYear} aangemaakt bij registratiegoedkeuring.`
            }
          })
        ]
      : []),
    ...(oneTimeAmountCents > 0 && !hasOneTimeObligation
      ? [
          prisma.paymentObligation.create({
            data: {
              donorProfileId: request.donorProfile.id,
              lidnummer: registrationNumber,
              obligationType: "ONE_TIME",
              amountCents: oneTimeAmountCents,
              status: "DUE",
              dueDate: oneTimePaymentDeadline(now),
              source: "REGISTRATION_APPROVAL_ONE_TIME",
              notes: "Eenmalige bijdrage aangemaakt bij registratiegoedkeuring."
            }
          })
        ]
      : [])
  ]);

  await ensurePrimaryMembership({
    id: request.donorProfile.id,
    registrationNumber,
    status: "INACTIVE",
    approvedAt: now,
    activeSince: null,
    createdAt: request.donorProfile.createdAt,
    updatedAt: now
  });
  await syncFamilyActivityForDonorStatus(prisma, request.donorProfile.id, "INACTIVE");

  await writeAuditLog({
    actorId: adminId,
    action: "APPROVE",
    entityType: "RegistrationRequest",
    entityId: id,
    message: `Registratie goedgekeurd met lidnummer ${registrationNumber}`
  });

  await prepareEmailLog({
    templateKey: "REGISTRATION_APPROVED_PAYMENT_REQUIRED",
    recipient: request.requestedBy.email,
    entityType: "RegistrationRequest",
    entityId: id,
    data: {
      naam: `${request.donorProfile.firstName} ${request.donorProfile.lastName}`.trim(),
      voornaam: request.donorProfile.firstName,
      achternaam: request.donorProfile.lastName,
      lidnummer: registrationNumber,
      status: "INACTIVE",
      organisatie: "St. GBC Masjid Ghausia"
    }
  });

  redirect(`/admin/registrations/${id}`);
}

export async function rejectRegistration(formData: FormData) {
  const adminId = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim();
  const donorMessage = String(formData.get("donorMessage") ?? "").trim();

  const request = await prisma.registrationRequest.findUnique({ where: { id }, include: { donorProfile: true, requestedBy: true } });
  if (!request?.donorProfileId) {
    redirect("/admin/registrations");
  }

  await prisma.$transaction([
    prisma.donorProfile.update({ where: { id: request.donorProfileId }, data: { status: "REJECTED" } }),
    prisma.registrationRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNotes,
        donorMessage,
        rejectionReason: reviewNotes
      }
    })
  ]);

  await writeAuditLog({
    actorId: adminId,
    action: "REJECT",
    entityType: "RegistrationRequest",
    entityId: id,
    message: "Registratie afgewezen"
  });

  await prepareEmailLog({
    templateKey: "REGISTRATION_REJECTED",
    recipient: request.requestedBy.email,
    entityType: "RegistrationRequest",
    entityId: id,
    data: {
      naam: request.donorProfile ? `${request.donorProfile.firstName} ${request.donorProfile.lastName}`.trim() : request.requestedBy.name ?? "",
      voornaam: request.donorProfile?.firstName ?? "",
      achternaam: request.donorProfile?.lastName ?? "",
      reden: donorMessage || reviewNotes,
      organisatie: "St. GBC Masjid Ghausia"
    }
  });

  redirect(`/admin/registrations/${id}`);
}

export async function requestCorrection(formData: FormData) {
  const adminId = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim();
  const donorMessage = String(formData.get("donorMessage") ?? "").trim();

  const request = await prisma.registrationRequest.findUnique({ where: { id }, include: { donorProfile: true, requestedBy: true } });
  if (!request?.donorProfileId) {
    redirect("/admin/registrations");
  }

  await prisma.$transaction([
    prisma.donorProfile.update({ where: { id: request.donorProfileId }, data: { status: "ACTION_REQUIRED" } }),
    prisma.registrationRequest.update({
      where: { id },
      data: {
        status: "ACTION_REQUIRED",
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNotes,
        donorMessage
      }
    })
  ]);

  await writeAuditLog({
    actorId: adminId,
    action: "STATUS_CHANGE",
    entityType: "RegistrationRequest",
    entityId: id,
    message: "Correctie gevraagd"
  });

  await prepareEmailLog({
    templateKey: "CORRECTION_REQUIRED",
    recipient: request.requestedBy.email,
    entityType: "RegistrationRequest",
    entityId: id,
    data: {
      naam: request.donorProfile ? `${request.donorProfile.firstName} ${request.donorProfile.lastName}`.trim() : request.requestedBy.name ?? "",
      voornaam: request.donorProfile?.firstName ?? "",
      achternaam: request.donorProfile?.lastName ?? "",
      correctiebericht: donorMessage,
      loginlink: `${process.env.NEXTAUTH_URL ?? "http://localhost:3001"}/login`,
      organisatie: "St. GBC Masjid Ghausia"
    }
  });

  redirect(`/admin/registrations/${id}`);
}
