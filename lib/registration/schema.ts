import { z } from "zod";
import { isValidIban, normalizeIban } from "@/lib/iban";

const requiredText = z.string().trim().min(1, "Dit veld is verplicht");
const optionalText = z.string().trim().optional().or(z.literal(""));

export const familyMemberSchema = z.object({
  type: z.enum(["PARTNER", "CHILD"]),
  firstName: requiredText,
  lastName: requiredText,
  gender: z.enum(["MALE", "FEMALE"]),
  dateOfBirth: requiredText,
  birthPlace: optionalText
});

export const registrationBaseSchema = z.object({
  firstName: requiredText,
  lastName: requiredText,
  gender: z.enum(["MALE", "FEMALE"]),
  addressLine1: requiredText,
  addressLine2: optionalText,
  postalCode: requiredText,
  city: requiredText,
  phone: requiredText,
  email: z.string().trim().email("Vul een geldig e-mailadres in"),
  dateOfBirth: requiredText,
  birthPlace: requiredText,
  iban: requiredText.transform(normalizeIban),
  accountHolderName: requiredText,
  maritalStatus: z.enum(["SINGLE", "MARRIED", "WIDOWED", "DIVORCED"]),
  password: z.string().min(8, "Gebruik minimaal 8 tekens"),
  confirmPassword: z.string().min(8, "Bevestig het wachtwoord"),
  hasPartner: z.enum(["yes", "no"]),
  partner: familyMemberSchema.optional(),
  hasChildren: z.enum(["yes", "no"]),
  children: z.array(familyMemberSchema).default([]),
  pakistanContactName: optionalText,
  pakistanContactPhone: optionalText,
  funeralWishes: optionalText,
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
