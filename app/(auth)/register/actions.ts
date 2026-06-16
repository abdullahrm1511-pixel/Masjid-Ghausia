"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { registrationSubmitSchema } from "@/lib/registration/schema";
import { writeAuditLog } from "@/lib/audit";
import { prepareEmailLog } from "@/lib/email/templates";

export type RegistrationState = {
  errors: string[];
  values: Record<string, string>;
};

const fieldLabels: Record<string, string> = {
  firstName: "Voornaam",
  lastName: "Achternaam",
  gender: "Geslacht",
  addressLine1: "Adres",
  postalCode: "Postcode",
  city: "Woonplaats",
  phone: "Telefoon",
  email: "E-mailadres",
  dateOfBirth: "Geboortedatum",
  birthPlace: "Geboorteplaats",
  iban: "IBAN",
  accountHolderName: "Naam rekeninghouder",
  maritalStatus: "Burgerlijke staat",
  password: "Wachtwoord",
  confirmPassword: "Wachtwoord bevestigen",
  partner: "Partner",
  children: "Kinderen",
  healthDeclaration: "Gezondheidsverklaring",
  legalResidence: "Verblijf in Nederland",
  termsAccepted: "Voorwaarden en privacy"
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function valuesFromFormData(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, input] of formData.entries()) {
    if (typeof input === "string") {
      values[key] = input;
    }
  }
  return values;
}

function formatIssue(path: PropertyKey[], message: string) {
  const key = String(path[0] ?? "formulier");
  const label = fieldLabels[key] ?? key;
  return `Fout ${label}: ${message}`;
}

function dateValue(input: string) {
  const date = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

export async function submitRegistration(_previous: RegistrationState, formData: FormData): Promise<RegistrationState> {
  const submittedValues = valuesFromFormData(formData);
  const childrenCount = Number(formData.get("childrenCount") ?? 0);
  const children = Array.from({ length: childrenCount }, (_, index) => ({
    type: "CHILD" as const,
    firstName: value(formData, `child.${index}.firstName`),
    lastName: value(formData, `child.${index}.lastName`),
    gender: value(formData, `child.${index}.gender`) as "MALE" | "FEMALE",
    dateOfBirth: value(formData, `child.${index}.dateOfBirth`),
    birthPlace: value(formData, `child.${index}.birthPlace`)
  })).filter((child) => child.firstName || child.lastName);

  const hasPartner = value(formData, "hasPartner") as "yes" | "no";
  const parsed = registrationSubmitSchema.safeParse({
    firstName: value(formData, "firstName"),
    lastName: value(formData, "lastName"),
    gender: value(formData, "gender"),
    addressLine1: value(formData, "addressLine1"),
    addressLine2: value(formData, "addressLine2"),
    postalCode: value(formData, "postalCode"),
    city: value(formData, "city"),
    phone: value(formData, "phone"),
    email: value(formData, "email").toLowerCase(),
    dateOfBirth: value(formData, "dateOfBirth"),
    birthPlace: value(formData, "birthPlace"),
    iban: value(formData, "iban"),
    accountHolderName: value(formData, "accountHolderName"),
    maritalStatus: value(formData, "maritalStatus"),
    password: value(formData, "password"),
    confirmPassword: value(formData, "confirmPassword"),
    hasPartner,
    partner:
      hasPartner === "yes"
        ? {
            type: "PARTNER",
            firstName: value(formData, "partner.firstName"),
            lastName: value(formData, "partner.lastName"),
            gender: value(formData, "partner.gender"),
            dateOfBirth: value(formData, "partner.dateOfBirth"),
            birthPlace: value(formData, "partner.birthPlace")
          }
        : undefined,
    hasChildren: value(formData, "hasChildren"),
    children,
    pakistanContactName: value(formData, "pakistanContactName"),
    pakistanContactPhone: value(formData, "pakistanContactPhone"),
    funeralWishes: value(formData, "funeralWishes"),
    healthDeclaration: formData.get("healthDeclaration") === "on",
    legalResidence: formData.get("legalResidence") === "on",
    termsAccepted: formData.get("termsAccepted") === "on"
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.issues.map((issue) => formatIssue(issue.path, issue.message)),
      values: submittedValues
    };
  }

  const data = parsed.data;
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    return {
      errors: ["Fout E-mailadres: Dit e-mailadres is al bekend"],
      values: submittedValues
    };
  }

  const passwordHash = await hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: `${data.firstName} ${data.lastName}`.trim(),
      email: data.email,
      passwordHash,
      role: "DONOR",
      isActive: true,
      donorProfile: {
        create: {
          status: "PENDING",
          firstName: data.firstName,
          lastName: data.lastName,
          gender: data.gender,
          phone: data.phone,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2 || null,
          postalCode: data.postalCode,
          city: data.city,
          dateOfBirth: dateValue(data.dateOfBirth),
          birthPlace: data.birthPlace,
          iban: data.iban,
          accountHolderName: data.accountHolderName,
          maritalStatus: data.maritalStatus,
          pakistanContactName: data.pakistanContactName || null,
          pakistanContactPhone: data.pakistanContactPhone || null,
          funeralWishes: data.funeralWishes || null,
          familyMembers: {
            create: [
              ...(data.partner
                ? [
                    {
                      type: "PARTNER" as const,
                      firstName: data.partner.firstName,
                      lastName: data.partner.lastName,
                      gender: data.partner.gender,
                      dateOfBirth: dateValue(data.partner.dateOfBirth),
                      birthPlace: data.partner.birthPlace || null
                    }
                  ]
                : []),
              ...data.children.map((child) => ({
                type: "CHILD" as const,
                firstName: child.firstName,
                lastName: child.lastName,
                gender: child.gender,
                dateOfBirth: dateValue(child.dateOfBirth),
                birthPlace: child.birthPlace || null
              }))
            ]
          }
        }
      }
    },
    include: { donorProfile: true }
  });

  const registrationRequest = await prisma.registrationRequest.create({
    data: {
      requestedById: user.id,
      donorProfileId: user.donorProfile?.id,
      status: "PENDING",
      submittedData: JSON.parse(JSON.stringify(data)),
      submittedAt: new Date()
    }
  });

  const templateData = {
    naam: `${data.firstName} ${data.lastName}`.trim(),
    voornaam: data.firstName,
    achternaam: data.lastName,
    status: "PENDING",
    loginlink: `${process.env.NEXTAUTH_URL ?? "http://localhost:3001"}/login`,
    organisatie: "St. GBC Masjid Ghausia"
  };

  await Promise.all([
    prepareEmailLog({
      templateKey: "REGISTRATION_RECEIVED",
      recipient: data.email,
      data: templateData,
      entityType: "RegistrationRequest",
      entityId: registrationRequest.id
    }),
    prepareEmailLog({
      templateKey: "REGISTRATION_ANSWERS_COPY",
      recipient: data.email,
      data: templateData,
      entityType: "RegistrationRequest",
      entityId: registrationRequest.id
    })
  ]);

  await writeAuditLog({
    actorId: user.id,
    action: "CREATE",
    entityType: "RegistrationRequest",
    entityId: user.donorProfile?.id,
    message: "Nieuwe registratie ingediend"
  });

  redirect("/login?registered=1");
}
