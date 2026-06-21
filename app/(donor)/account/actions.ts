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

function nullableValue(formData: FormData, key: string) {
  return value(formData, key) || null;
}

function nullableEnumValue(formData: FormData, key: string) {
  return value(formData, key) || null;
}

function dateValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  return raw ? new Date(`${raw}T00:00:00.000Z`).toISOString() : null;
}

export async function submitChangeRequest(formData: FormData) {
  const session = await auth();
  if (!session?.user.id) {
    redirect("/login");
  }

  const profile = await prisma.donorProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: true, familyMembers: { orderBy: [{ type: "asc" }, { dateOfBirth: "asc" }] } }
  });

  if (!profile) {
    redirect("/dashboard");
  }

  const familyMemberCount = Number(formData.get("familyMemberCount") ?? 0);
  const requestedFamilyMembers = Array.from({ length: familyMemberCount }, (_, index) => ({
    id: value(formData, `family.${index}.id`),
    firstName: value(formData, `family.${index}.firstName`),
    lastName: value(formData, `family.${index}.lastName`),
    gender: nullableEnumValue(formData, `family.${index}.gender`),
    dateOfBirth: dateValue(formData, `family.${index}.dateOfBirth`),
    birthPlace: nullableValue(formData, `family.${index}.birthPlace`),
    relationship: nullableValue(formData, `family.${index}.relationship`)
  }));

  const requestedData = {
    profile: {
      firstName: value(formData, "firstName"),
      lastName: value(formData, "lastName"),
      gender: nullableEnumValue(formData, "gender"),
      dateOfBirth: dateValue(formData, "dateOfBirth"),
      birthPlace: value(formData, "birthPlace"),
      phone: value(formData, "phone"),
      email: value(formData, "email").toLowerCase(),
      maritalStatus: nullableEnumValue(formData, "maritalStatus"),
      addressLine1: value(formData, "addressLine1"),
      addressLine2: nullableValue(formData, "addressLine2"),
      postalCode: value(formData, "postalCode"),
      city: value(formData, "city"),
      country: value(formData, "country"),
      iban: normalizeIban(value(formData, "iban")),
      accountHolderName: value(formData, "accountHolderName"),
      pakistanContactName: nullableValue(formData, "pakistanContactName"),
      pakistanContactPhone: nullableValue(formData, "pakistanContactPhone"),
      funeralWishes: nullableValue(formData, "funeralWishes"),
      notes: nullableValue(formData, "notes")
    },
    familyMembers: requestedFamilyMembers
  };

  if (!requestedData.profile.dateOfBirth) {
    redirect("/account?error=Vul een geldige geboortedatum in");
  }

  if (!requestedFamilyMembers.every((member) => member.id && member.firstName && member.lastName && member.dateOfBirth)) {
    redirect("/account?error=Vul alle verplichte gezinsvelden in");
  }

  if (!isValidIban(requestedData.profile.iban)) {
    redirect("/account?error=Vul een geldige Nederlandse IBAN in");
  }

  const currentData = {
    profile: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth.toISOString(),
      birthPlace: profile.birthPlace,
      phone: profile.phone,
      email: profile.user.email,
      maritalStatus: profile.maritalStatus,
      addressLine1: profile.addressLine1,
      addressLine2: profile.addressLine2,
      postalCode: profile.postalCode,
      city: profile.city,
      country: profile.country,
      iban: profile.iban,
      accountHolderName: profile.accountHolderName,
      pakistanContactName: profile.pakistanContactName,
      pakistanContactPhone: profile.pakistanContactPhone,
      funeralWishes: profile.funeralWishes,
      notes: profile.notes
    },
    familyMembers: profile.familyMembers.map((member) => ({
      id: member.id,
      type: member.type,
      firstName: member.firstName,
      lastName: member.lastName,
      gender: member.gender,
      dateOfBirth: member.dateOfBirth.toISOString(),
      birthPlace: member.birthPlace,
      relationship: member.relationship,
      isActive: member.isActive
    }))
  };

  const changeRequest = await prisma.changeRequest.create({
    data: {
      donorProfileId: profile.id,
      submittedById: session.user.id,
      status: "PENDING",
      changeType: "Volledige profielgegevens",
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
