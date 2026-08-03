"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { FuneralFormData } from "@/lib/funeral-application";

export type FuneralState = { success: boolean; message: string; errors?: Record<string, string>; values?: Record<string, string> };
const required = (label: string, max = 120) => z.string().trim().min(1, `${label} is verplicht.`).max(max);
const optional = (max = 120) => z.string().trim().max(max).optional().default("");
const schema = z.object({
  token: z.string().min(10), deceasedBsn: required("BSN overledene", 9).regex(/^\d{9}$/, "BSN moet uit 9 cijfers bestaan."), deceasedLastName: required("Achternaam overledene"), deceasedFirstName: required("Voornaam overledene"), deceasedBirthDate: required("Geboortedatum overledene"), deceasedBirthPlace: required("Geboorteplaats overledene"), deceasedGender: required("Geslacht overledene"), deceasedStreet: required("Straat overledene"), deceasedHouseNumber: required("Huisnummer overledene", 20), deceasedPostalCode: required("Postcode overledene", 12), deceasedCity: required("Woonplaats overledene"), deceasedCountry: required("Land overledene"), deathPlace: required("Overlijdensplaats"), deathDate: required("Overlijdensdatum"), deathTime: required("Overlijdenstijd"), naturalDeath: z.enum(["Ja", "Nee"]), bodyFound: z.enum(["Ja", "Nee"]), maritalStatus: required("Burgerlijke staat"),
  partnerLastName: optional(), partnerFirstName: optional(), partnerBirthDate: optional(20),
  applicantLastName: required("Achternaam aanvrager"), applicantFirstName: required("Voornaam aanvrager"), applicantRelationship: required("Relatie aanvrager"), applicantBirthDate: required("Geboortedatum aanvrager"), applicantBirthPlace: required("Geboorteplaats aanvrager"), applicantStreet: required("Straat aanvrager"), applicantHouseNumber: required("Huisnummer aanvrager", 20), applicantPostalCode: required("Postcode aanvrager", 12), applicantCity: required("Woonplaats aanvrager"), applicantCountry: required("Land aanvrager"), applicantBsn: required("BSN aanvrager", 9).regex(/^\d{9}$/, "BSN moet uit 9 cijfers bestaan."), applicantPhone: required("Telefoon aanvrager", 20).regex(/^\+?[0-9() .-]{8,20}$/, "Vul een geldig telefoonnummer in."), applicantEmail: z.string().trim().email("Vul een geldig e-mailadres in.").max(200), burialLocation: required("Plaats van begraven"), gravePeriod: z.enum(["15 jaar", "30 jaar", "Onbepaalde tijd"]), graveType: z.enum(["Standaard graf", "Graf met kelder", "Graf met gesloten kelder"]), signatureName: required("Digitale handtekening"), acceptedCosts: z.literal("on")
});

export async function submitFuneralApplication(_previous: FuneralState, formData: FormData): Promise<FuneralState> {
  const submittedValues = Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, typeof value === "string" ? value : ""]));
  const parsed = schema.safeParse(submittedValues);
  if (!parsed.success) {
    const errors = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    const preservedValues = { ...submittedValues };
    for (const field of Object.keys(errors)) delete preservedValues[field];
    return { success: false, message: "Controleer de gemarkeerde gegevens. Uw overige antwoorden zijn bewaard.", errors, values: preservedValues };
  }
  const { token, acceptedCosts, ...values } = parsed.data;
  const application = await prisma.funeralApplication.findUnique({ where: { accessToken: token } });
  if (!application || application.status !== "OPEN") return { success: false, message: "Deze invullink is niet meer beschikbaar.", values: submittedValues };
  const data: FuneralFormData = { ...values, acceptedCosts: acceptedCosts === "on" };
  await prisma.funeralApplication.update({ where: { id: application.id }, data: { formData: data, signatureData: data.signatureName, status: "SUBMITTED", submittedAt: new Date() } });
  return { success: true, message: "De begrafenisaanvraag is veilig ontvangen. Het bestuur kan de ingevulde PDF nu bekijken." };
}
