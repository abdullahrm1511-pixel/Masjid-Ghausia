"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { prepareEmailLog } from "@/lib/email/templates";
import { surveyAvailability, type DonorSurveyAnswers, type OneTimeDonationAnswers } from "@/lib/survey";
import { absoluteUrl } from "@/lib/seo";
import { createMolliePayment } from "@/lib/mollie";

export type SurveyState = { success: boolean; message: string; errors?: Record<string, string> };

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
const donorSchema = z.object({
  ...contactFields,
  isExistingDonor: z.enum(["yes", "no"]),
  wantsToBecomeDonor: z.enum(["yes", "no"]).optional(),
  wantsMonthlyDonation: z.enum(["yes", "no"]).optional(),
  monthlyAmount: z.string().optional(),
  directDebitConsent: z.string().optional()
}).superRefine((data, ctx) => {
  validatePhone(data.phone, ctx);
  if (data.isExistingDonor === "no" && !data.wantsToBecomeDonor) ctx.addIssue({ code: "custom", path: ["wantsToBecomeDonor"], message: "Kies ja of nee." });
  if (data.wantsToBecomeDonor === "yes" && !data.wantsMonthlyDonation) ctx.addIssue({ code: "custom", path: ["wantsMonthlyDonation"], message: "Kies ja of nee." });
  if (data.wantsMonthlyDonation === "yes") {
    const amount = Number(String(data.monthlyAmount ?? "").replace(",", "."));
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) ctx.addIssue({ code: "custom", path: ["monthlyAmount"], message: "Kies een bedrag vanaf € 1." });
    if (data.directDebitConsent !== "on") ctx.addIssue({ code: "custom", path: ["directDebitConsent"], message: "Uw toestemming is nodig." });
  }
});
const oneTimeSchema = z.object({
  surveyId: z.string().min(1),
  fullName: z.string().trim().min(2, "Vul uw naam in.").max(120, "Naam mag maximaal 120 tekens bevatten."),
  oneTimeAmount: z.string().min(1, "Vul een bedrag in.")
}).superRefine((data, ctx) => {
  const amount = Number(data.oneTimeAmount.replace(",", "."));
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) ctx.addIssue({ code: "custom", path: ["oneTimeAmount"], message: "Kies een bedrag vanaf € 1." });
});

export async function submitSurvey(_previous: SurveyState, formData: FormData): Promise<SurveyState> {
  const raw = Object.fromEntries(formData);
  const surveyId = String(formData.get("surveyId") ?? "");
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey || surveyAvailability(survey) !== "open") return { success: false, message: "Deze enquete is niet meer beschikbaar." };
  const isOneTime = survey.templateKey === "ONE_TIME_DONATION";
  const parsed = (isOneTime ? oneTimeSchema : donorSchema).safeParse(raw);
  if (!parsed.success) return { success: false, message: "Controleer de gemarkeerde antwoorden.", errors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])) };
  const requestHeaders = await headers();

  if (isOneTime) {
    const data = oneTimeSchema.parse(raw);
    const amountCents = Math.round(Number(data.oneTimeAmount.replace(",", ".")) * 100);
    const answers: OneTimeDonationAnswers = { wantsOneTimeDonation: true, oneTimeAmountCents: amountCents };
    const response = await prisma.surveyResponse.create({ data: { surveyId: survey.id, firstName: data.fullName, lastName: "", phone: "", email: "", answers, ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: requestHeaders.get("user-agent") } });
    try {
      const payment = await createMolliePayment({ amountCents, description: `${survey.title} - ${data.fullName}`, responseId: response.id, redirectUrl: absoluteUrl(`/enquete/${survey.slug}/betaling?response=${response.id}`), webhookUrl: absoluteUrl("/api/mollie/webhook") });
      await prisma.donationPayment.create({ data: { surveyResponseId: response.id, molliePaymentId: payment.id, amountCents, status: payment.status, checkoutUrl: payment.checkoutUrl } });
      redirect(payment.checkoutUrl);
    } catch (error) {
      if (error && typeof error === "object" && "digest" in error) throw error;
      return { success: false, message: error instanceof Error ? error.message : "De Mollie-betaalpagina kon niet worden geopend. Probeer het opnieuw." };
    }
  }

  const data = donorSchema.parse(raw);
  const common = { surveyId: survey.id, firstName: data.firstName, lastName: data.lastName, phone: data.phone, email: data.email.toLowerCase(), ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: requestHeaders.get("user-agent") };
  const isExistingDonor = data.isExistingDonor === "yes";
  const wantsToBecomeDonor = isExistingDonor ? null : data.wantsToBecomeDonor === "yes";
  const wantsMonthlyDonation = wantsToBecomeDonor === true ? data.wantsMonthlyDonation === "yes" : null;
  const amount = wantsMonthlyDonation ? Number(String(data.monthlyAmount).replace(",", ".")) : null;
  const answers: DonorSurveyAnswers = { isExistingDonor, wantsToBecomeDonor, wantsMonthlyDonation, monthlyAmountCents: amount === null ? null : Math.round(amount * 100), directDebitConsent: wantsMonthlyDonation === true && data.directDebitConsent === "on" };
  const response = await prisma.surveyResponse.create({ data: { ...common, answers } });
  const templateKey = isExistingDonor ? "SURVEY_EXISTING_DONOR_CONFIRMED" : wantsToBecomeDonor ? "SURVEY_MEMBERSHIP_INTEREST" : "SURVEY_NO_MEMBERSHIP";
  await prepareEmailLog({ templateKey, recipient: common.email, entityType: "SurveyResponse", entityId: response.id, data: { naam: `${common.firstName} ${common.lastName}` } });
  return { success: true, message: isExistingDonor ? "Dank voor uw bevestiging. U ontvangt ook een bevestiging per e-mail." : wantsToBecomeDonor ? "Dank voor uw interesse. Uw antwoorden zijn ontvangen; er wordt nu nog niets afgeschreven." : "Dank voor uw tijd en voor het invullen van de enquete." };
}
