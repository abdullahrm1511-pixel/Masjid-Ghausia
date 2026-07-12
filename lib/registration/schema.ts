import { z } from "zod";
import { isValidIban, normalizeIban } from "@/lib/iban";

const requiredText = z.string().trim().min(1, "Dit veld is verplicht");
const optionalText = z.string().trim().optional().or(z.literal(""));
const nameText = requiredText.regex(/^[\p{L}\s'.-]+$/u, "Gebruik alleen letters");
const optionalNameText = optionalText.refine((value) => !value || /^[\p{L}\s'.-]+$/u.test(value), "Gebruik alleen letters");
const fullNameText = nameText.refine(
  (value) => (value.match(/\p{L}/gu) ?? []).length >= 2,
  "Vul de volledige naam in, geen voorletter"
);
const optionalFullNameText = optionalNameText.refine(
  (value) => !value || (value.match(/\p{L}/gu) ?? []).length >= 2,
  "Vul de volledige naam in, geen voorletter"
);
const dutchMobilePhone = requiredText.regex(/^06\d{8}$/, "Vul een geldig telefoonnummer in: 06 gevolgd door 8 cijfers");
const dutchPostalCode = requiredText
  .transform((value) => value.toUpperCase().replace(/\s+/g, ""))
  .refine((value) => /^\d{4}[A-Z]{2}$/.test(value), "Vul een geldige postcode in, bijvoorbeeld 3061 AB");
const optionalDigits = optionalText.refine((value) => !value || /^\d+$/.test(value), "Gebruik alleen cijfers");
const strongPassword = z
  .string()
  .min(8, "Gebruik minimaal 8 tekens")
  .regex(/[A-Z]/, "Gebruik minimaal 1 hoofdletter")
  .regex(/[a-z]/, "Gebruik minimaal 1 kleine letter")
  .regex(/[^A-Za-z0-9]/, "Gebruik minimaal 1 speciaal teken");
const optionalAmount = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((value) => {
    if (!value) return 0;
    return Number(value.replace(",", "."));
  });

export const familyMemberSchema = z.object({
  type: z.enum(["PARTNER", "CHILD"]),
  firstName: fullNameText,
  lastName: fullNameText,
  gender: z.enum(["MALE", "FEMALE"]),
  dateOfBirth: requiredText,
  birthPlace: optionalNameText
});

export const registrationBaseSchema = z.object({
  firstName: fullNameText,
  lastName: fullNameText,
  gender: z.enum(["MALE", "FEMALE"]),
  addressLine1: requiredText,
  addressLine2: optionalText,
  postalCode: dutchPostalCode,
  city: nameText,
  phone: dutchMobilePhone,
  email: z.string().trim().email("Vul een geldig e-mailadres in"),
  dateOfBirth: requiredText,
  birthPlace: nameText,
  iban: requiredText.transform(normalizeIban),
  accountHolderName: fullNameText,
  maritalStatus: z.enum(["SINGLE", "MARRIED", "WIDOWED", "DIVORCED"]),
  password: strongPassword,
  confirmPassword: z.string().min(8, "Bevestig het wachtwoord"),
  hasPartner: z.enum(["yes", "no"]),
  partner: familyMemberSchema.optional(),
  hasChildren: z.enum(["yes", "no"]),
  children: z.array(familyMemberSchema).default([]),
  pakistanContactName: optionalFullNameText,
  pakistanContactPhone: optionalDigits,
  funeralWishes: optionalText,
  donationAmount: optionalAmount,
  donationMandateAccepted: z.boolean().default(false),
  healthDeclaration: z.boolean().default(false),
  legalResidence: z.boolean().default(false),
  termsAccepted: z.boolean().default(false)
});

export const registrationDraftSchema = registrationBaseSchema.omit({
  password: true,
  confirmPassword: true,
  healthDeclaration: true,
  legalResidence: true,
  termsAccepted: true
});

export const registrationSubmitSchema = registrationBaseSchema.superRefine((data, ctx) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateValue = (input: string) => {
    const date = new Date(`${input}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const isFutureDate = (input: string) => {
    const date = dateValue(input);
    return date ? date > today : false;
  };
  const ageOnToday = (input: string) => {
    const date = dateValue(input);
    if (!date) return null;
    let age = today.getUTCFullYear() - date.getUTCFullYear();
    const monthDiff = today.getUTCMonth() - date.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < date.getUTCDate())) {
      age -= 1;
    }
    return age;
  };

  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Wachtwoorden komen niet overeen"
    });
  }
  if (!isValidIban(data.iban)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["iban"],
      message: "Vul een geldige Nederlandse IBAN in"
    });
  }
  if (isFutureDate(data.dateOfBirth)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dateOfBirth"],
      message: "Geboortedatum mag niet in de toekomst liggen"
    });
  }
  const applicantAge = ageOnToday(data.dateOfBirth);
  if (applicantAge !== null && applicantAge < 18) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dateOfBirth"],
      message: "U moet minimaal 18 jaar zijn om zelf in te schrijven"
    });
  }
  if (data.partner?.dateOfBirth && isFutureDate(data.partner.dateOfBirth)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["partner"],
      message: "Geboortedatum van partner mag niet in de toekomst liggen"
    });
  }
  data.children.forEach((child, index) => {
    if (isFutureDate(child.dateOfBirth)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["children", index, "dateOfBirth"],
        message: "Geboortedatum van kind mag niet in de toekomst liggen"
      });
    }
  });
  if (!Number.isFinite(data.donationAmount) || data.donationAmount < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["donationAmount"],
      message: "Vul een geldig donatiebedrag in"
    });
  }
  if (data.donationAmount > 0 && data.donationAmount < 5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["donationAmount"],
      message: "Het minimum donatiebedrag is €5"
    });
  }
  if (data.hasPartner === "yes" && !data.partner) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["partner"],
      message: "Vul partnergegevens in"
    });
  }
  if (data.hasChildren === "yes" && data.children.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["children"],
      message: "Voeg minimaal een kind toe of kies Nee"
    });
  }
  if (data.donationAmount > 0 && !data.donationMandateAccepted) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["donationMandateAccepted"],
      message: "Bevestig de maandelijkse betaling naar de moskee"
    });
  }
  for (const field of ["healthDeclaration", "legalResidence", "termsAccepted"] as const) {
    if (!data[field]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: "Bevestiging is verplicht"
      });
    }
  }
});

export type RegistrationSubmitInput = z.infer<typeof registrationSubmitSchema>;
