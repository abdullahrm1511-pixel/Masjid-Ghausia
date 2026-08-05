"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { FuneralFormData } from "@/lib/funeral-application";
import { prepareEmailLog } from "@/lib/email/templates";
import { funeralApplicationFilename, generateFuneralApplicationPdf } from "@/lib/pdf/funeral-application";

export type FuneralState = { success: boolean; message: string; errors?: Record<string, string>; values?: Record<string, string> };
const required = (label: string, max = 120) => z.string().trim().min(1, `${label} is verplicht.`).max(max);
const optional = (max = 120) => z.string().trim().max(max).optional().default("");
const namePattern = /^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u;
const personName = (label: string) => required(label, 80).regex(namePattern, `${label} mag alleen letters, spaties, apostrofs en streepjes bevatten.`);
const schema = z.object({
  token: z.string().min(10), hasBsn: z.enum(["yes", "no"]), unbornUnder24Weeks: z.enum(["yes", "no"]).optional(), deceasedBsn: optional(9),
  deceasedLastName: personName("Achternaam overledene"), deceasedFirstName: personName("Voornaam overledene"), deceasedBirthDate: required("Geboortedatum overledene"), deceasedBirthPlace: required("Geboorteplaats overledene"), deceasedGender: required("Geslacht overledene"), deceasedStreet: required("Straat overledene"), deceasedHouseNumber: required("Huisnummer overledene", 20), deceasedPostalCode: required("Postcode overledene", 12), deceasedCity: required("Woonplaats overledene"), deceasedCountry: required("Land overledene"), deathPlace: required("Overlijdensplaats"), deathDate: required("Overlijdensdatum"), deathTime: required("Overlijdenstijd"), naturalDeath: z.enum(["Ja", "Nee"]), bodyFound: z.enum(["Ja", "Nee"]), maritalStatus: required("Burgerlijke staat"),
  partnerLastName: optional(), partnerFirstName: optional(), partnerBirthDate: optional(20),
  applicantLastName: personName("Achternaam aanvrager"), applicantFirstName: personName("Voornaam aanvrager"), applicantRelationship: personName("Relatie aanvrager"), applicantBirthDate: required("Geboortedatum aanvrager"), applicantBirthPlace: required("Geboorteplaats aanvrager"), applicantStreet: required("Straat aanvrager"), applicantHouseNumber: required("Huisnummer aanvrager", 20), applicantPostalCode: required("Postcode aanvrager", 12), applicantCity: required("Woonplaats aanvrager"), applicantCountry: required("Land aanvrager"), applicantBsn: required("BSN aanvrager", 9).regex(/^\d{9}$/, "BSN moet uit precies 9 cijfers bestaan."), applicantPhone: required("Telefoon aanvrager", 15).regex(/^\d{8,15}$/, "Telefoonnummer mag alleen uit 8 tot 15 cijfers bestaan."), applicantEmail: z.string().trim().email("Vul een geldig e-mailadres in.").max(200), burialLocation: required("Plaats van begraven"), gravePeriod: z.enum(["15 jaar", "30 jaar", "Onbepaalde tijd"]), graveType: z.enum(["Standaard graf", "Graf met kelder", "Graf met gesloten kelder"]), signatureName: personName("Digitale handtekening"), acceptedCosts: z.literal("on")
}).superRefine((data, ctx) => {
  if (data.hasBsn === "yes" && !/^\d{9}$/.test(data.deceasedBsn)) ctx.addIssue({ code: "custom", path: ["deceasedBsn"], message: "BSN moet uit precies 9 cijfers bestaan." });
  if (data.hasBsn === "no" && !data.unbornUnder24Weeks) ctx.addIssue({ code: "custom", path: ["unbornUnder24Weeks"], message: "Kies ja of nee." });
});

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif"]);
function validateFile(file: FormDataEntryValue | null, required: boolean, label: string) {
  if (!(file instanceof File) || file.size === 0) return required ? `${label} is verplicht.` : null;
  if (file.size > 8 * 1024 * 1024) return `${label} mag maximaal 8 MB zijn.`;
  if (!allowedTypes.has(file.type)) return `${label} moet een PDF-, JPG-, PNG- of HEIC-bestand zijn.`;
  return null;
}

export async function submitFuneralApplication(_previous: FuneralState, formData: FormData): Promise<FuneralState> {
  const submittedValues = Object.fromEntries(Array.from(formData.entries()).filter(([, value]) => typeof value === "string") as [string, string][]);
  const parsed = schema.safeParse(submittedValues);
  const errors: Record<string, string> = parsed.success ? {} : Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
  const hasBsn = submittedValues.hasBsn === "yes";
  const unborn = submittedValues.unbornUnder24Weeks === "yes";
  const identityFile = formData.get("identityDocument");
  const doctorFile = formData.get("doctorDeclaration");
  const identityError = validateFile(identityFile, hasBsn, "Identiteitsbewijs");
  const doctorError = validateFile(doctorFile, !hasBsn && unborn, "Doktersverklaring");
  if (identityError) errors.identityDocument = identityError;
  if (doctorError) errors.doctorDeclaration = doctorError;
  if (!parsed.success || Object.keys(errors).length) {
    const preservedValues = { ...submittedValues };
    for (const field of Object.keys(errors)) delete preservedValues[field];
    return { success: false, message: "Controleer de gemarkeerde gegevens. Uw overige antwoorden zijn bewaard.", errors, values: preservedValues };
  }
  const { token, acceptedCosts, hasBsn: hasBsnValue, unbornUnder24Weeks, ...values } = parsed.data;
  const application = await prisma.funeralApplication.findUnique({ where: { accessToken: token } });
  if (!application || application.status !== "OPEN") return { success: false, message: "Deze invullink is niet meer beschikbaar.", values: submittedValues };
  const data: FuneralFormData = { ...values, deceasedBsn: hasBsn ? values.deceasedBsn : "", hasBsn, unbornUnder24Weeks: hasBsn ? null : unbornUnder24Weeks === "yes", acceptedCosts: acceptedCosts === "on" };
  const documents: { kind: string; file: File }[] = [];
  if (identityFile instanceof File && identityFile.size) documents.push({ kind: "DECEASED_ID", file: identityFile });
  if (doctorFile instanceof File && doctorFile.size) documents.push({ kind: "DOCTOR_DECLARATION", file: doctorFile });
  const submittedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.funeralApplication.update({ where: { id: application.id }, data: { formData: data, signatureData: data.signatureName, status: "SUBMITTED", submittedAt } });
    for (const document of documents) await tx.funeralApplicationDocument.create({ data: { funeralApplicationId: application.id, kind: document.kind, filename: document.file.name.slice(0, 160), contentType: document.file.type, fileSize: document.file.size, data: Buffer.from(await document.file.arrayBuffer()) } });
  });
  const completedPdf = await generateFuneralApplicationPdf(data, submittedAt);
  await prepareEmailLog({
    templateKey: "FUNERAL_APPLICATION_RECEIVED",
    recipient: data.applicantEmail,
    entityType: "FuneralApplication",
    entityId: application.id,
    data: { naam: `${data.applicantFirstName} ${data.applicantLastName}` },
    attachments: [{ filename: funeralApplicationFilename(data), content: completedPdf }]
  });
  return { success: true, message: "De begrafenisaanvraag en documenten zijn veilig ontvangen. Een PDF-kopie is per e-mail verstuurd." };
}
