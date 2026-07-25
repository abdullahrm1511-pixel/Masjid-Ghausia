"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { prepareEmailLog } from "@/lib/email/templates";
import { surveyAvailability, type DonorSurveyAnswers } from "@/lib/survey";

export type SurveyState = { success: boolean; message: string; errors?: Record<string, string> };
const schema = z.object({ surveyId: z.string().min(1), name: z.string().trim().min(2, "Vul uw naam in.").max(120), phone: z.string().trim().min(8, "Vul een geldig mobiel nummer in.").max(30), email: z.string().trim().email("Vul een geldig e-mailadres in.").max(200), isExistingDonor: z.enum(["yes", "no"]), wantsToBecomeDonor: z.enum(["yes", "no"]).optional(), wantsMonthlyDonation: z.enum(["yes", "no"]).optional(), monthlyAmount: z.string().optional(), directDebitConsent: z.string().optional() }).superRefine((data, ctx) => { if (data.isExistingDonor === "no" && !data.wantsToBecomeDonor) ctx.addIssue({ code: "custom", path: ["wantsToBecomeDonor"], message: "Kies ja of nee." }); if (data.wantsToBecomeDonor === "yes" && !data.wantsMonthlyDonation) ctx.addIssue({ code: "custom", path: ["wantsMonthlyDonation"], message: "Kies ja of nee." }); if (data.wantsMonthlyDonation === "yes") { const amount = Number(String(data.monthlyAmount ?? "").replace(",", ".")); if (!Number.isFinite(amount) || amount < 1 || amount > 10000) ctx.addIssue({ code: "custom", path: ["monthlyAmount"], message: "Kies een bedrag vanaf € 1." }); if (data.directDebitConsent !== "on") ctx.addIssue({ code: "custom", path: ["directDebitConsent"], message: "Uw toestemming is nodig." }); } });

export async function submitSurvey(_previous: SurveyState, formData: FormData): Promise<SurveyState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Controleer de gemarkeerde antwoorden.", errors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])) };
  const data = parsed.data;
  const survey = await prisma.survey.findUnique({ where: { id: data.surveyId } });
  if (!survey || surveyAvailability(survey) !== "open") return { success: false, message: "Deze enquete is niet meer beschikbaar." };
  const isExistingDonor = data.isExistingDonor === "yes";
  const wantsToBecomeDonor = isExistingDonor ? null : data.wantsToBecomeDonor === "yes";
  const wantsMonthlyDonation = wantsToBecomeDonor === true ? data.wantsMonthlyDonation === "yes" : null;
  const amount = wantsMonthlyDonation ? Number(String(data.monthlyAmount).replace(",", ".")) : null;
  const answers: DonorSurveyAnswers = { isExistingDonor, wantsToBecomeDonor, wantsMonthlyDonation, monthlyAmountCents: amount === null ? null : Math.round(amount * 100), directDebitConsent: wantsMonthlyDonation === true && data.directDebitConsent === "on" };
  const requestHeaders = await headers();
  const response = await prisma.surveyResponse.create({ data: { surveyId: survey.id, name: data.name, phone: data.phone, email: data.email.toLowerCase(), answers, ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: requestHeaders.get("user-agent") } });
  const templateKey = isExistingDonor ? "SURVEY_EXISTING_DONOR_CONFIRMED" : wantsToBecomeDonor ? "SURVEY_MEMBERSHIP_INTEREST" : "SURVEY_NO_MEMBERSHIP";
  await prepareEmailLog({ templateKey, recipient: data.email.toLowerCase(), entityType: "SurveyResponse", entityId: response.id, data: { naam: data.name } });
  return { success: true, message: isExistingDonor ? "Dank voor uw bevestiging. U ontvangt ook een bevestiging per e-mail." : wantsToBecomeDonor ? "Dank voor uw interesse. Uw antwoorden zijn ontvangen; er wordt nu nog niets afgeschreven." : "Dank voor uw tijd en voor het invullen van de enquete." };
}
