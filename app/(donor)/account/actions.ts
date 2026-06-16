"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeIban, isValidIban } from "@/lib/iban";
import { writeAuditLog } from "@/lib/audit";
import { prepareEmailLog } from "@/lib/email/templates";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function submitChangeRequest(formData: FormData) {
  const session = await auth();
  if (!session?.user.id) {
    redirect("/login");
  }

  const profile = await prisma.donorProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: true }
  });

  if (!profile) {
    redirect("/dashboard");
  }

  const requestedData = {
    addressLine1: value(formData, "addressLine1"),
    postalCode: value(formData, "postalCode"),
    city: value(formData, "city"),
    phone: value(formData, "phone"),
    email: value(formData, "email").toLowerCase(),
    iban: normalizeIban(value(formData, "iban")),
    accountHolderName: value(formData, "accountHolderName"),
    pakistanContactName: value(formData, "pakistanContactName"),
    pakistanContactPhone: value(formData, "pakistanContactPhone"),
    funeralWishes: value(formData, "funeralWishes")
  };

  if (!isValidIban(requestedData.iban)) {
    redirect("/account?error=Vul een geldige Nederlandse IBAN in");
  }

  const currentData = {
    addressLine1: profile.addressLine1,
    postalCode: profile.postalCode,
    city: profile.city,
    phone: profile.phone,
    email: profile.user.email,
    iban: profile.iban,
    accountHolderName: profile.accountHolderName,
    pakistanContactName: profile.pakistanContactName,
    pakistanContactPhone: profile.pakistanContactPhone,
    funeralWishes: profile.funeralWishes
  };

  const changeRequest = await prisma.changeRequest.create({
    data: {
      donorProfileId: profile.id,
      submittedById: session.user.id,
      status: "PENDING",
      changeType: "Accountgegevens",
      currentData,
      requestedData,
      donorNote: value(formData, "donorNote") || null
    }
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "ChangeRequest",
    entityId: changeRequest.id,
    message: "Wijzigingsverzoek ingediend"
  });

  await prepareEmailLog({
    templateKey: "CHANGE_REQUEST_RECEIVED",
    recipient: profile.user.email,
    entityType: "ChangeRequest",
    entityId: changeRequest.id,
    data: {
      naam: `${profile.firstName} ${profile.lastName}`.trim(),
      voornaam: profile.firstName,
      achternaam: profile.lastName,
      lidnummer: profile.registrationNumber ?? "",
      organisatie: "St. GBC Masjid Ghausia"
    }
  });

  redirect("/dashboard");
}
