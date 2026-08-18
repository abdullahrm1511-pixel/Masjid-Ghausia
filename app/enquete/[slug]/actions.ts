"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { prepareEmailLog } from "@/lib/email/templates";
import { CUSTOM_SURVEY_TEMPLATE_KEY, parseSurveyQuestions, surveyAvailability, visibleSurveyQuestions, type DonorSurveyAnswers, type OneTimeDonationAnswers } from "@/lib/survey";
import { absoluteUrl } from "@/lib/seo";
import { createMollieCustomer, createMollieFirstPayment, createMolliePayment } from "@/lib/mollie";
import { agreementTerms, getSepaConfig, sepaConfigComplete } from "@/lib/monthly-donation-agreement";
import { donationReturnPath } from "@/lib/donation-form-url";
import { randomBytes } from "crypto";
import { redirect } from "next/navigation";

export type SurveyState = { success: boolean; message: string; errors?: Record<string, string> };
const normalizeIdentityText = (value: string) => value.trim().toLocaleLowerCase("nl-NL").replace(/\s+/g, " ");

const namePattern = /^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u;
const phonePattern = /^\+?[0-9() .-]+$/;
const nameField = (label: string) => z.string().trim().min(2, `Vul uw ${label} in.`).max(60, `${label} mag maximaal 60 tekens bevatten.`).regex(namePattern, `${label} mag alleen letters, spaties, apostrofs en streepjes bevatten.`);
const contactFields = {
  surveyId: z.string().min(1),
  firstName: nameField("voornaam"),
  lastName: nameField("achternaam"),
  phone: z.string().trim().min(8, "Vul een geldig mobiel nummer in.").max(20, "Een mobiel nummer mag maximaal 20 tekens bevatten.").regex(phonePattern, "Een mobiel nummer mag geen letters bevatten."),
  email: z.string().trim().email("Vul een geldig e-mailadres in.").max(200)
};
function validatePhone(phone: string, ctx: z.RefinementCtx) {
  const digitCount = phone.replace(/\D/g, "").length;
  if (digitCount < 8 || digitCount > 15) ctx.addIssue({ code: "custom", path: ["phone"], message: "Vul een mobiel nummer in met 8 tot maximaal 15 cijfers." });
}
const ibanPattern = /^[A-Za-z]{2}\d{2}[A-Za-z0-9]{11,30}$/;
const donorSchema = z.object({
  ...contactFields,
  isExistingDonor: z.enum(["yes", "no"]),
  wantsToBecomeDonor: z.enum(["yes", "no"]).optional(),
  monthlyAmount: z.string().optional(),
  directDebitConsent: z.string().optional()
  ,termsAccepted: z.string().optional(), signatureAccepted: z.string().optional(), signerName: z.string().optional(), termsVersion: z.string().optional()
  ,existingBankAccount: z.string().optional(), existingAmount: z.string().optional()
}).superRefine((data, ctx) => {
  validatePhone(data.phone, ctx);
  if (data.isExistingDonor === "yes") {
    const iban = String(data.existingBankAccount ?? "").trim().replace(/\s+/g, "");
    if (!ibanPattern.test(iban)) ctx.addIssue({ code: "custom", path: ["existingBankAccount"], message: "Vul een geldig IBAN-rekeningnummer in." });
    const amount = Number(String(data.existingAmount ?? "").replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) ctx.addIssue({ code: "custom", path: ["existingAmount"], message: "Vul een geldig bedrag in." });
    else if (amount > 10000) ctx.addIssue({ code: "custom", path: ["existingAmount"], message: "Het bedrag mag maximaal € 10.000 zijn." });
  }
  if (data.isExistingDonor === "no" && !data.wantsToBecomeDonor) ctx.addIssue({ code: "custom", path: ["wantsToBecomeDonor"], message: "Kies ja of nee." });
  if (data.wantsToBecomeDonor === "yes") {
    const amount = Number(String(data.monthlyAmount ?? "").replace(",", "."));
    if (!Number.isFinite(amount)) ctx.addIssue({ code: "custom", path: ["monthlyAmount"], message: "Vul een geldig maandbedrag in." });
    else if (amount < 5) ctx.addIssue({ code: "custom", path: ["monthlyAmount"], message: "Het minimale maandbedrag is € 5." });
    else if (amount > 10000) ctx.addIssue({ code: "custom", path: ["monthlyAmount"], message: "Het maandbedrag mag maximaal € 10.000 zijn." });
    if (data.directDebitConsent !== "on") ctx.addIssue({ code: "custom", path: ["directDebitConsent"], message: "Uw toestemming is nodig." });
    if (data.termsAccepted !== "on") ctx.addIssue({ code: "custom", path: ["termsAccepted"], message: "Bevestig dat u de voorwaarden heeft gelezen." });
    if (data.signatureAccepted !== "on") ctx.addIssue({ code: "custom", path: ["signatureAccepted"], message: "Bevestig uw digitale ondertekening." });
    if (!data.signerName || !namePattern.test(data.signerName.trim())) ctx.addIssue({ code: "custom", path: ["signerName"], message: "Vul uw volledige naam als digitale ondertekening in." });
  }
});
const oneTimeSchema = z.object({
  surveyId: z.string().min(1),
  fullName: z.string().trim().max(120, "Naam mag maximaal 120 tekens bevatten.").optional().default(""),
  anonymousDonation: z.string().optional(),
  oneTimeAmount: z.string().min(1, "Vul een bedrag in.")
}).superRefine((data, ctx) => {
  if (data.anonymousDonation !== "on" && data.fullName.length < 2) ctx.addIssue({ code: "custom", path: ["fullName"], message: "Vul uw naam in of kies anoniem doneren." });
  if (data.fullName && !namePattern.test(data.fullName)) ctx.addIssue({ code: "custom", path: ["fullName"], message: "Naam mag alleen letters, spaties, apostrofs en streepjes bevatten." });
  const amount = Number(data.oneTimeAmount.replace(",", "."));
  if (!Number.isFinite(amount)) ctx.addIssue({ code: "custom", path: ["oneTimeAmount"], message: "Vul een geldig donatiebedrag in." });
  else if (amount < 5) ctx.addIssue({ code: "custom", path: ["oneTimeAmount"], message: "Het minimale donatiebedrag is € 5." });
  else if (amount > 100000) ctx.addIssue({ code: "custom", path: ["oneTimeAmount"], message: "Het donatiebedrag mag maximaal € 100.000 zijn." });
});

async function notifySurveyOwner(survey: { id: string; title: string; notificationEmail: string | null }, entityId: string, entityType = "SurveyResponse") {
  if (!survey.notificationEmail) return;
  await prepareEmailLog({
    templateKey: "ADMIN_NOTIFICATION",
    recipient: survey.notificationEmail,
    entityType,
    entityId,
    data: {
      naam: "beheerder",
      organisatie: "St. GBC Masjid Ghausia",
      status: `Nieuw antwoord op ${survey.title}`,
      loginlink: absoluteUrl(`/admin/settings/surveys/${survey.id}`),
      enquete_titel: survey.title,
      enquete_antwoord: "Er is een nieuw antwoord ontvangen."
    }
  });
}

export async function submitSurvey(_previous: SurveyState, formData: FormData): Promise<SurveyState> {
  const raw = Object.fromEntries(formData);
  const surveyId = String(formData.get("surveyId") ?? "");
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey || surveyAvailability(survey) !== "open") return { success: false, message: "Deze enquete is niet meer beschikbaar." };
  if (survey.maxResponses !== null && await prisma.surveyResponse.count({ where: { surveyId: survey.id } }) >= survey.maxResponses) return { success: false, message: "Deze enquête heeft het maximumaantal antwoorden bereikt." };
  const isOneTime = survey.templateKey === "ONE_TIME_DONATION";
  if (survey.templateKey === CUSTOM_SURVEY_TEMPLATE_KEY) {
    const questions = parseSurveyQuestions(survey.questions);
    const submittedAnswers: Record<string, string | string[]> = {};
    for (const question of questions) {
      const values = formData.getAll(`answer_${question.id}`).map((value) => value instanceof File ? value.name.trim() : String(value).trim()).filter(Boolean);
      submittedAnswers[question.id] = question.type === "CHECKBOXES" ? values : (values[0] ?? "");
    }
    const visibleQuestions = visibleSurveyQuestions(questions, submittedAnswers);
    const answers: Record<string, string | string[]> = {};
    const errors: Record<string, string> = {};
    const files: { questionId: string; file: File }[] = [];
    for (const question of visibleQuestions) {
      const answer = submittedAnswers[question.id];
      const empty = Array.isArray(answer) ? answer.length === 0 : !answer;
      if (question.required && empty) errors[question.id] = "Deze vraag is verplicht.";
      if (!empty && question.type === "EMAIL" && !z.string().email().safeParse(answer).success) errors[question.id] = "Vul een geldig e-mailadres in.";
      if (!empty && question.type === "PHONE") {
        const phone = String(answer);
        const digits = phone.replace(/\D/g, "").length;
        if (!phonePattern.test(phone) || digits < 8 || digits > 15) errors[question.id] = "Vul een geldig telefoonnummer in.";
      }
      if (!empty && question.type === "NUMBER" && !Number.isFinite(Number(answer))) errors[question.id] = "Vul een geldig getal in.";
      if (!empty && ["MULTIPLE_CHOICE", "DROPDOWN"].includes(question.type) && !question.options?.includes(String(answer))) errors[question.id] = "Kies een geldig antwoord.";
      if (!empty && question.type === "CHECKBOXES" && (answer as string[]).some((value) => !question.options?.includes(value))) errors[question.id] = "Kies alleen geldige antwoorden.";
      if (!empty && question.type === "YES_NO" && !["Ja", "Nee"].includes(String(answer))) errors[question.id] = "Kies ja of nee.";
      if (question.type === "FILE") {
        const file = formData.get(`answer_${question.id}`);
        if (file instanceof File && file.size > 0) {
          if (file.size > 8 * 1024 * 1024) errors[question.id] = "Het bestand mag maximaal 8 MB zijn.";
          else if (!["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif"].includes(file.type)) errors[question.id] = "Gebruik PDF, JPG, PNG of HEIC.";
          else files.push({ questionId: question.id, file });
        }
      }
      answers[question.id] = answer;
    }
    const identityMode = survey.identityMode;
    const firstName = String(formData.get("contactFirstName") ?? "").trim();
    const lastName = String(formData.get("contactLastName") ?? "").trim();
    const phone = String(formData.get("contactPhone") ?? "").trim();
    const email = String(formData.get("contactEmail") ?? "").trim().toLowerCase();
    if (identityMode === "REQUIRED") {
      if (!nameField("voornaam").safeParse(firstName).success) errors.contactFirstName = "Vul een geldige voornaam in.";
      if (!nameField("achternaam").safeParse(lastName).success) errors.contactLastName = "Vul een geldige achternaam in.";
      if (!z.string().email().safeParse(email).success) errors.contactEmail = "Vul een geldig e-mailadres in.";
      const digits = phone.replace(/\D/g, "").length;
      if (!phonePattern.test(phone) || digits < 8 || digits > 15) errors.contactPhone = "Vul een geldig telefoonnummer in.";
    } else if (identityMode === "OPTIONAL") {
      if (email && !z.string().email().safeParse(email).success) errors.contactEmail = "Vul een geldig e-mailadres in.";
      if (phone && (!phonePattern.test(phone) || phone.replace(/\D/g, "").length < 8)) errors.contactPhone = "Vul een geldig telefoonnummer in.";
    }
    if (Object.keys(errors).length) return { success: false, message: "Controleer de gemarkeerde antwoorden.", errors };
    const requestHeaders = await headers();
    const response = await prisma.$transaction(async (tx) => {
      const created = await tx.surveyResponse.create({ data: { surveyId: survey.id, firstName: identityMode === "ANONYMOUS" ? "" : firstName, lastName: identityMode === "ANONYMOUS" ? "" : lastName, phone: identityMode === "ANONYMOUS" ? "" : phone, email: identityMode === "ANONYMOUS" ? "" : email, answers, ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: requestHeaders.get("user-agent") } });
      for (const item of files) await tx.surveyResponseDocument.create({ data: { surveyResponseId: created.id, questionId: item.questionId, filename: item.file.name || "bestand", contentType: item.file.type, fileSize: item.file.size, data: Buffer.from(await item.file.arrayBuffer()) } });
      return created;
    }, { timeout: 120000 });
    await notifySurveyOwner(survey, response.id);
    return { success: true, message: survey.thankYouMessage || "Uw antwoorden zijn ontvangen." };
  }
  const parsed = (isOneTime ? oneTimeSchema : donorSchema).safeParse(raw);
  if (!parsed.success) return { success: false, message: "Controleer de gemarkeerde antwoorden.", errors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])) };
  const requestHeaders = await headers();

  if (isOneTime) {
    const data = oneTimeSchema.parse(raw);
    const amountCents = Math.round(Number(data.oneTimeAmount.replace(",", ".")) * 100);
    const isAnonymous = data.anonymousDonation === "on";
    const answers: OneTimeDonationAnswers = { wantsOneTimeDonation: true, oneTimeAmountCents: amountCents, isAnonymous };
    const response = await prisma.surveyResponse.create({ data: { surveyId: survey.id, firstName: isAnonymous ? "" : data.fullName, lastName: "", phone: "", email: "", answers, ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: requestHeaders.get("user-agent") } });
    let checkoutUrl: string;
    try {
      const payment = await createMolliePayment({
        amountCents,
        description: `Donatie ${survey.title}`,
        redirectUrl: absoluteUrl(`${donationReturnPath(survey.templateKey, survey.slug, "betaling")}?response=${response.id}`),
        webhookUrl: absoluteUrl("/api/mollie/webhook"),
        responseId: response.id
      });
      checkoutUrl = payment.checkoutUrl;
      await prisma.donationPayment.create({
        data: {
          surveyResponseId: response.id,
          molliePaymentId: payment.id,
          amountCents,
          status: payment.status,
          checkoutUrl
        }
      });
    } catch (error) {
      await prisma.surveyResponse.delete({ where: { id: response.id } }).catch(() => undefined);
      console.error("Eenmalige Mollie-donatie kon niet worden aangemaakt", error);
      return { success: false, message: "De betaalpagina kon niet worden geopend. Probeer het opnieuw.", errors: {} };
    }
    await notifySurveyOwner(survey, response.id);
    redirect(checkoutUrl);
  }

  const data = donorSchema.parse(raw);
  const common = { surveyId: survey.id, firstName: data.firstName, lastName: data.lastName, phone: data.phone, email: data.email.toLowerCase(), ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: requestHeaders.get("user-agent") };
  const isExistingDonor = data.isExistingDonor === "yes";
  const wantsToBecomeDonor = isExistingDonor ? null : data.wantsToBecomeDonor === "yes";
  const wantsMonthlyDonation = wantsToBecomeDonor === true ? true : null;
  const amount = wantsMonthlyDonation ? Number(String(data.monthlyAmount).replace(",", ".")) : null;
  const existingAmountCents = isExistingDonor ? Math.round(Number(String(data.existingAmount).replace(",", ".")) * 100) : null;
  const answers: DonorSurveyAnswers = {
    isExistingDonor,
    wantsToBecomeDonor,
    wantsMonthlyDonation,
    monthlyAmountCents: isExistingDonor ? existingAmountCents : (amount === null ? null : Math.round(amount * 100)),
    directDebitConsent: wantsMonthlyDonation === true && data.directDebitConsent === "on",
    existingBankAccount: isExistingDonor ? String(data.existingBankAccount).trim().toUpperCase().replace(/\s+/g, "") : null
  };
  const sepaConfig = await getSepaConfig();
  if (wantsToBecomeDonor && !sepaConfigComplete(sepaConfig)) return { success: false, message: "De officiële SEPA-gegevens worden nog ingesteld. Probeer het later opnieuw." };
  if (wantsToBecomeDonor && data.termsVersion !== sepaConfig.termsVersion) return { success: false, message: "De voorwaarden zijn gewijzigd. Vernieuw de pagina en lees de actuele versie." };
  if (wantsToBecomeDonor && normalizeIdentityText(data.signerName ?? "") !== normalizeIdentityText(`${common.firstName} ${common.lastName}`)) return { success: false, message: "De digitale ondertekening moet gelijk zijn aan uw ingevulde voor- en achternaam.", errors: { signerName: "Gebruik exact uw ingevulde voor- en achternaam." } };
  if (wantsToBecomeDonor) {
    const existingByEmail = await prisma.surveyDonor.findUnique({ where: { email: common.email } });
    if (existingByEmail?.status === "ACTIVE") return { success: false, message: "Er bestaat al een actief maanddonateurschap met dit e-mailadres. Kies bij de eerste vraag dat u al donateur bent." };
  }
  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.surveyResponse.create({ data: { ...common, answers } });
    const donor = wantsToBecomeDonor ? await tx.surveyDonor.upsert({
      where: { email: common.email },
      update: { firstName: common.firstName, lastName: common.lastName, phone: common.phone, monthlyAmountCents: answers.monthlyAmountCents, directDebitConsent: answers.directDebitConsent, status: "PENDING_MOLLIE", cancelledAt: null },
      create: { email: common.email, firstName: common.firstName, lastName: common.lastName, phone: common.phone, monthlyAmountCents: answers.monthlyAmountCents, directDebitConsent: answers.directDebitConsent, status: "PENDING_MOLLIE" }
    }) : null;
    const agreement = donor && answers.monthlyAmountCents ? await tx.monthlyDonationAgreement.create({ data: { agreementNumber: `MG-${new Date().getUTCFullYear()}-${randomBytes(6).toString("hex").toUpperCase()}`, surveyDonorId: donor.id, surveyResponseId: created.id, termsVersion: sepaConfig.termsVersion, termsText: agreementTerms(sepaConfig, answers.monthlyAmountCents), signerName: data.signerName!.trim(), amountCents: answers.monthlyAmountCents, mandateConsent: true, termsAccepted: true, signatureAccepted: true, acceptedAt: new Date(), ipAddress: common.ipAddress, userAgent: common.userAgent, creditorLegalName: sepaConfig.legalName, creditorIdentifier: sepaConfig.creditorIdentifier, creditorAddress: sepaConfig.address, creditorEmail: sepaConfig.email } }) : null;
    return { response: created, donor, agreement };
  });
  if (wantsToBecomeDonor && result.donor && answers.monthlyAmountCents) {
    try {
      let customerId = result.donor.mollieCustomerId;
      if (!customerId) {
        const customer = await createMollieCustomer({ name: `${common.firstName} ${common.lastName}`, email: common.email, donorId: result.donor.id });
        customerId = customer.id;
        await prisma.surveyDonor.update({ where: { id: result.donor.id }, data: { mollieCustomerId: customerId } });
        if (result.agreement) await prisma.monthlyDonationAgreement.update({ where: { id: result.agreement.id }, data: { mollieCustomerId: customerId } });
      }
      const payment = await createMollieFirstPayment({ customerId, amountCents: answers.monthlyAmountCents, redirectUrl: absoluteUrl(`${donationReturnPath(survey.templateKey, survey.slug, "machtiging")}?donor=${result.donor.id}`), webhookUrl: absoluteUrl("/api/mollie/webhook"), donorId: result.donor.id, responseId: result.response.id });
      await prisma.monthlyDonationPayment.create({ data: { surveyDonorId: result.donor.id, surveyResponseId: result.response.id, molliePaymentId: payment.id, amountCents: answers.monthlyAmountCents, sequenceType: "first", status: payment.status, checkoutUrl: payment.checkoutUrl } });
      redirect(payment.checkoutUrl);
    } catch (error) {
      if (error && typeof error === "object" && "digest" in error) throw error;
      console.error("Mollie-maandmachtiging starten mislukt", error);
      return { success: false, message: "De Mollie-machtiging kon niet worden geopend. Uw gegevens zijn bewaard; probeer het opnieuw.", errors: {} };
    }
  }
  await notifySurveyOwner(survey, result.response.id);
  await prepareEmailLog({ templateKey: isExistingDonor ? "SURVEY_EXISTING_DONOR_CONFIRMED" : "SURVEY_NO_MEMBERSHIP", recipient: common.email, entityType: "SurveyResponse", entityId: result.response.id, data: { naam: `${common.firstName} ${common.lastName}` } });
  return { success: true, message: survey.thankYouMessage || (isExistingDonor ? "Dank voor uw bevestiging. Uw gegevens zijn genoteerd; u hoeft niets te betalen. U ontvangt ook een bevestiging per e-mail." : wantsToBecomeDonor ? "Dank voor uw interesse. Uw antwoorden zijn ontvangen; er wordt nu nog niets afgeschreven." : "Dank voor uw tijd en voor het invullen van de enquête.") };
}
