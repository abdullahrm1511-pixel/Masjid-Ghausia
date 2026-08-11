"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { prepareEmailLog } from "@/lib/email/templates";
import { CUSTOM_SURVEY_TEMPLATE_KEY, parseSurveyQuestions, surveyAvailability, visibleSurveyQuestions, type DonorSurveyAnswers, type OneTimeDonationAnswers } from "@/lib/survey";
import { absoluteUrl } from "@/lib/seo";
import { createHash, randomBytes, randomInt } from "crypto";

export type SurveyState = { success: boolean; message: string; errors?: Record<string, string>; step?: "VERIFY_EXISTING" | "EXISTING_OPTIONS"; challengeId?: string; accessToken?: string; maskedEmail?: string };
const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");
const maskEmail = (email: string) => { const [name, domain] = email.split("@"); return `${name.slice(0, 2)}***@${domain}`; };
const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "").replace(/^00/, "");
  return digits.startsWith("31") ? `0${digits.slice(2)}` : digits;
};
const normalizeName = (value: string) => value.trim().toLocaleLowerCase("nl-NL").replace(/\s+/g, " ");
function legacyTelephone(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const memberDetails = (value as Record<string, unknown>).memberDetails;
  if (!memberDetails || typeof memberDetails !== "object" || Array.isArray(memberDetails)) return "";
  const entry = Object.entries(memberDetails as Record<string, unknown>).find(([key]) => key.replace(/[^a-z]/gi, "").toLowerCase() === "telephone");
  return typeof entry?.[1] === "string" || typeof entry?.[1] === "number" ? String(entry[1]) : "";
}

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
  monthlyAmount: z.string().optional(),
  directDebitConsent: z.string().optional()
}).superRefine((data, ctx) => {
  validatePhone(data.phone, ctx);
  if (data.isExistingDonor === "no" && !data.wantsToBecomeDonor) ctx.addIssue({ code: "custom", path: ["wantsToBecomeDonor"], message: "Kies ja of nee." });
  if (data.wantsToBecomeDonor === "yes") {
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

async function notifySurveyOwner(survey: { id: string; title: string; notificationEmail: string | null }, responseId: string) {
  if (!survey.notificationEmail) return;
  await prepareEmailLog({
    templateKey: "ADMIN_NOTIFICATION",
    recipient: survey.notificationEmail,
    entityType: "SurveyResponse",
    entityId: responseId,
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
  const mode = String(formData.get("mode") ?? "");
  if (mode === "VERIFY_EXISTING") {
    const challengeId = String(formData.get("challengeId") ?? "");
    const challenge = await prisma.surveyMemberAccess.findFirst({ where: { id: challengeId, surveyId: survey.id }, include: { donorProfile: { include: { user: true } } } });
    if (formData.get("intent") === "RESEND_CODE") {
      if (!challenge || challenge.verifiedAt) return { success: false, message: "Deze verificatie is niet meer geldig. Begin opnieuw." };
      const sentLogs = await prisma.emailLog.findMany({ where: { entityType: "SurveyMemberAccess", entityId: challenge.id, templateKey: "REGISTRATION_VERIFICATION_CODE" }, orderBy: { createdAt: "desc" }, take: 4, select: { createdAt: true } });
      if (sentLogs.length >= 4) return { success: false, step: "VERIFY_EXISTING", challengeId, maskedEmail: maskEmail(challenge.donorProfile.user.email), message: "Er zijn al meerdere codes verstuurd. Wacht vijftien minuten en begin daarna opnieuw." };
      if (sentLogs[0] && Date.now() - sentLogs[0].createdAt.getTime() < 60_000) return { success: false, step: "VERIFY_EXISTING", challengeId, maskedEmail: maskEmail(challenge.donorProfile.user.email), message: "Wacht minimaal één minuut voordat u opnieuw een code aanvraagt." };
      const newCode = String(randomInt(100000, 1000000));
      try {
        await prepareEmailLog({ templateKey: "REGISTRATION_VERIFICATION_CODE", recipient: challenge.donorProfile.user.email, entityType: "SurveyMemberAccess", entityId: challenge.id, data: { naam: challenge.donorProfile.firstName, verification_code: newCode }, throwOnSendError: true });
        await prisma.surveyMemberAccess.update({ where: { id: challenge.id }, data: { codeHash: hashValue(newCode), expiresAt: new Date(Date.now() + 15 * 60 * 1000), attempts: 0 } });
        return { success: false, step: "VERIFY_EXISTING", challengeId, maskedEmail: maskEmail(challenge.donorProfile.user.email), message: "Er is een nieuwe verificatiecode verstuurd. De vorige code werkt niet meer." };
      } catch (error) {
        console.error("Nieuwe verificatiecode kon niet worden verstuurd", error);
        return { success: false, step: "VERIFY_EXISTING", challengeId, maskedEmail: maskEmail(challenge.donorProfile.user.email), message: "De nieuwe code kon niet worden verstuurd. Probeer het later opnieuw." };
      }
    }
    const code = String(formData.get("verificationCode") ?? "").trim();
    if (!challenge || challenge.expiresAt < new Date() || challenge.attempts >= 5 || hashValue(code) !== challenge.codeHash) {
      if (challenge) await prisma.surveyMemberAccess.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      return { success: false, step: "VERIFY_EXISTING", challengeId, maskedEmail: challenge ? maskEmail(challenge.donorProfile.user.email) : undefined, message: "De code is ongeldig of verlopen." };
    }
    const token = randomBytes(32).toString("base64url");
    await prisma.surveyMemberAccess.update({ where: { id: challenge.id }, data: { verifiedAt: new Date(), tokenHash: hashValue(token) } });
    return { success: false, step: "EXISTING_OPTIONS", challengeId, accessToken: token, message: `Lidmaatschap van ${challenge.donorProfile.firstName} is veilig herkend.` };
  }
  if (mode === "MEMBER_REQUEST") {
    const challengeId = String(formData.get("challengeId") ?? "");
    const accessToken = String(formData.get("accessToken") ?? "");
    const requestType = String(formData.get("memberAction") ?? "CONFIRM");
    const challenge = await prisma.surveyMemberAccess.findFirst({ where: { id: challengeId, surveyId: survey.id, verifiedAt: { not: null }, tokenHash: hashValue(accessToken), expiresAt: { gt: new Date() } }, include: { donorProfile: { include: { user: true } } } });
    if (!challenge || !["CONFIRM", "INCREASE", "CANCEL"].includes(requestType)) return { success: false, message: "Uw beveiligde sessie is verlopen. Begin opnieuw." };
    const amount = requestType === "INCREASE" ? Number(String(formData.get("requestedAmount") ?? "").replace(",", ".")) : null;
    if (requestType === "INCREASE" && (!Number.isFinite(amount) || Number(amount) < 1 || Number(amount) > 10000)) return { success: false, step: "EXISTING_OPTIONS", challengeId, accessToken, message: "Vul een geldig nieuw maandbedrag in." };
    const response = await prisma.$transaction(async (tx) => {
      if (requestType !== "CONFIRM") await tx.surveyMemberRequest.create({ data: { surveyId: survey.id, donorProfileId: challenge.donorProfileId, requestType, requestedAmountCents: amount === null ? null : Math.round(Number(amount) * 100) } });
      return tx.surveyResponse.create({ data: { surveyId: survey.id, firstName: challenge.donorProfile.firstName, lastName: challenge.donorProfile.lastName, phone: challenge.donorProfile.phone, email: challenge.donorProfile.user.email, answers: { isExistingDonor: true, memberAction: requestType, requestedAmountCents: amount === null ? null : Math.round(Number(amount) * 100) } } });
    });
    await notifySurveyOwner(survey, response.id);
    return { success: true, message: survey.thankYouMessage || (requestType === "CANCEL" ? "Uw verzoek tot beëindiging is ontvangen en wordt door een beheerder gecontroleerd." : requestType === "INCREASE" ? "Uw verzoek om het maandbedrag te verhogen is ontvangen. Er is nog niets automatisch gewijzigd." : "Dank voor uw bevestiging.") };
  }
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
    const answers: OneTimeDonationAnswers = { wantsOneTimeDonation: true, oneTimeAmountCents: amountCents };
    const response = await prisma.surveyResponse.create({ data: { surveyId: survey.id, firstName: data.fullName, lastName: "", phone: "", email: "", answers, ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: requestHeaders.get("user-agent") } });
    await notifySurveyOwner(survey, response.id);
    return { success: true, message: survey.thankYouMessage || "Dank u. Uw naam en donatiebedrag zijn opgeslagen. De online betaling is tijdens deze test tijdelijk uitgeschakeld." };
  }

  const data = donorSchema.parse(raw);
  const common = { surveyId: survey.id, firstName: data.firstName, lastName: data.lastName, phone: data.phone, email: data.email.toLowerCase(), ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: requestHeaders.get("user-agent") };
  const isExistingDonor = data.isExistingDonor === "yes";
  if (isExistingDonor) {
    const candidate = await prisma.donorProfile.findFirst({ where: { user: { email: data.email.toLowerCase() } }, include: { user: true } });
    const donor = candidate
      && normalizeName(candidate.firstName) === normalizeName(data.firstName)
      && normalizeName(candidate.lastName) === normalizeName(data.lastName)
      && normalizePhone(candidate.phone || legacyTelephone(candidate.legacyData)) === normalizePhone(data.phone)
      ? candidate
      : null;
    if (!donor) return { success: false, step: "VERIFY_EXISTING", challengeId: randomBytes(12).toString("base64url"), message: "Als de gegevens bij ons bekend zijn, is een verificatiecode verstuurd." };
    const code = String(randomInt(100000, 1000000));
    const challenge = await prisma.surveyMemberAccess.create({ data: { surveyId: survey.id, donorProfileId: donor.id, codeHash: hashValue(code), expiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
    try {
      await prepareEmailLog({ templateKey: "REGISTRATION_VERIFICATION_CODE", recipient: donor.user.email, entityType: "SurveyMemberAccess", entityId: challenge.id, data: { naam: donor.firstName, verification_code: code }, throwOnSendError: true });
    } catch (error) {
      await prisma.surveyMemberAccess.delete({ where: { id: challenge.id } });
      console.error("Verificatiecode voor bestaande donateur kon niet worden verstuurd", error);
      return { success: false, message: "De verificatiecode kon niet worden verstuurd. Probeer het later opnieuw of neem contact op met de beheerder." };
    }
    return { success: false, step: "VERIFY_EXISTING", challengeId: challenge.id, maskedEmail: maskEmail(donor.user.email), message: "Vul de verificatiecode in die naar uw geregistreerde e-mailadres is gestuurd." };
  }
  const wantsToBecomeDonor = isExistingDonor ? null : data.wantsToBecomeDonor === "yes";
  const wantsMonthlyDonation = wantsToBecomeDonor === true ? true : null;
  const amount = wantsMonthlyDonation ? Number(String(data.monthlyAmount).replace(",", ".")) : null;
  const answers: DonorSurveyAnswers = { isExistingDonor, wantsToBecomeDonor, wantsMonthlyDonation, monthlyAmountCents: amount === null ? null : Math.round(amount * 100), directDebitConsent: wantsMonthlyDonation === true && data.directDebitConsent === "on" };
  const response = await prisma.surveyResponse.create({ data: { ...common, answers } });
  await notifySurveyOwner(survey, response.id);
  const templateKey = isExistingDonor ? "SURVEY_EXISTING_DONOR_CONFIRMED" : wantsToBecomeDonor ? "SURVEY_MEMBERSHIP_INTEREST" : "SURVEY_NO_MEMBERSHIP";
  await prepareEmailLog({ templateKey, recipient: common.email, entityType: "SurveyResponse", entityId: response.id, data: { naam: `${common.firstName} ${common.lastName}` } });
  return { success: true, message: survey.thankYouMessage || (isExistingDonor ? "Dank voor uw bevestiging. U ontvangt ook een bevestiging per e-mail." : wantsToBecomeDonor ? "Dank voor uw interesse. Uw antwoorden zijn ontvangen; er wordt nu nog niets afgeschreven." : "Dank voor uw tijd en voor het invullen van de enquête.") };
}
