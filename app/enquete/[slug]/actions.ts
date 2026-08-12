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
const normalizeIdentityText = (value: string) => value.trim().toLocaleLowerCase("nl-NL").replace(/\s+/g, " ");
const normalizePhone = (value: string) => value.replace(/\D/g, "").replace(/^00/, "");
const identityMatches = (
  submitted: { firstName: string; lastName: string; phone: string; email: string },
  stored: { firstName: string; lastName: string; phone: string; email: string }
) => normalizeIdentityText(submitted.firstName) === normalizeIdentityText(stored.firstName)
  && normalizeIdentityText(submitted.lastName) === normalizeIdentityText(stored.lastName)
  && normalizePhone(submitted.phone) === normalizePhone(stored.phone)
  && submitted.email.trim().toLowerCase() === stored.email.trim().toLowerCase();

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
    if (!Number.isFinite(amount)) ctx.addIssue({ code: "custom", path: ["monthlyAmount"], message: "Vul een geldig maandbedrag in." });
    else if (amount < 5) ctx.addIssue({ code: "custom", path: ["monthlyAmount"], message: "Het minimale maandbedrag is € 5." });
    else if (amount > 10000) ctx.addIssue({ code: "custom", path: ["monthlyAmount"], message: "Het maandbedrag mag maximaal € 10.000 zijn." });
    if (data.directDebitConsent !== "on") ctx.addIssue({ code: "custom", path: ["directDebitConsent"], message: "Uw toestemming is nodig." });
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

function accessIdentity(challenge: {
  donorProfile: ({ firstName: string; lastName: string; phone: string; user: { email: string } } | null);
  surveyDonor: ({ firstName: string; lastName: string; phone: string; email: string } | null);
}) {
  if (challenge.surveyDonor) return challenge.surveyDonor;
  if (challenge.donorProfile) return { firstName: challenge.donorProfile.firstName, lastName: challenge.donorProfile.lastName, phone: challenge.donorProfile.phone, email: challenge.donorProfile.user.email };
  return null;
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
    const challenge = await prisma.surveyMemberAccess.findFirst({ where: { id: challengeId, surveyId: survey.id }, include: { donorProfile: { include: { user: true } }, surveyDonor: true } });
    const person = challenge ? accessIdentity(challenge) : null;
    if (formData.get("intent") === "RESEND_CODE") {
      if (!challenge || !person || challenge.verifiedAt) return { success: false, message: "Deze verificatie is niet meer geldig. Begin opnieuw." };
      const sentLogs = await prisma.emailLog.findMany({ where: { entityType: "SurveyMemberAccess", entityId: challenge.id, templateKey: "REGISTRATION_VERIFICATION_CODE" }, orderBy: { createdAt: "desc" }, take: 4, select: { createdAt: true } });
      if (sentLogs.length >= 4) return { success: false, step: "VERIFY_EXISTING", challengeId, maskedEmail: maskEmail(person.email), message: "Er zijn al meerdere codes verstuurd. Wacht vijftien minuten en begin daarna opnieuw." };
      if (sentLogs[0] && Date.now() - sentLogs[0].createdAt.getTime() < 60_000) return { success: false, step: "VERIFY_EXISTING", challengeId, maskedEmail: maskEmail(person.email), message: "Wacht minimaal één minuut voordat u opnieuw een code aanvraagt." };
      const newCode = String(randomInt(100000, 1000000));
      try {
        await prepareEmailLog({ templateKey: "REGISTRATION_VERIFICATION_CODE", recipient: person.email, entityType: "SurveyMemberAccess", entityId: challenge.id, data: { naam: person.firstName, verification_code: newCode }, throwOnSendError: true });
        await prisma.surveyMemberAccess.update({ where: { id: challenge.id }, data: { codeHash: hashValue(newCode), expiresAt: new Date(Date.now() + 15 * 60 * 1000), attempts: 0 } });
        return { success: false, step: "VERIFY_EXISTING", challengeId, maskedEmail: maskEmail(person.email), message: "Er is een nieuwe verificatiecode verstuurd. De vorige code werkt niet meer." };
      } catch (error) {
        console.error("Nieuwe verificatiecode kon niet worden verstuurd", error);
        return { success: false, step: "VERIFY_EXISTING", challengeId, maskedEmail: maskEmail(person.email), message: "De nieuwe code kon niet worden verstuurd. Probeer het later opnieuw." };
      }
    }
    const code = String(formData.get("verificationCode") ?? "").trim();
    if (!challenge || challenge.expiresAt < new Date() || challenge.attempts >= 5 || hashValue(code) !== challenge.codeHash) {
      if (challenge) await prisma.surveyMemberAccess.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      return { success: false, step: "VERIFY_EXISTING", challengeId, maskedEmail: person ? maskEmail(person.email) : undefined, message: "De code is ongeldig of verlopen." };
    }
    const token = randomBytes(32).toString("base64url");
    await prisma.surveyMemberAccess.update({ where: { id: challenge.id }, data: { verifiedAt: new Date(), tokenHash: hashValue(token) } });
    return { success: false, step: "EXISTING_OPTIONS", challengeId, accessToken: token, message: `Donateurschap van ${person?.firstName ?? "u"} is veilig herkend.` };
  }
  if (mode === "MEMBER_REQUEST") {
    const challengeId = String(formData.get("challengeId") ?? "");
    const accessToken = String(formData.get("accessToken") ?? "");
    const requestType = String(formData.get("memberAction") ?? "CONFIRM");
    const challenge = await prisma.surveyMemberAccess.findFirst({ where: { id: challengeId, surveyId: survey.id, verifiedAt: { not: null }, tokenHash: hashValue(accessToken), expiresAt: { gt: new Date() } }, include: { donorProfile: { include: { user: true } }, surveyDonor: true } });
    const person = challenge ? accessIdentity(challenge) : null;
    if (!challenge || !person || !["CONFIRM", "CHANGE_AMOUNT", "CANCEL"].includes(requestType)) return { success: false, message: "Uw beveiligde sessie is verlopen. Begin opnieuw." };
    const amount = requestType === "CHANGE_AMOUNT" ? Number(String(formData.get("requestedAmount") ?? "").replace(",", ".")) : null;
    if (requestType === "CHANGE_AMOUNT" && !Number.isFinite(amount)) return { success: false, step: "EXISTING_OPTIONS", challengeId, accessToken, message: "Vul een geldig maandbedrag in." };
    if (requestType === "CHANGE_AMOUNT" && Number(amount) < 5) return { success: false, step: "EXISTING_OPTIONS", challengeId, accessToken, message: "Het minimale maandbedrag is € 5." };
    if (requestType === "CHANGE_AMOUNT" && Number(amount) > 10000) return { success: false, step: "EXISTING_OPTIONS", challengeId, accessToken, message: "Het maandbedrag mag maximaal € 10.000 zijn." };
    if (requestType !== "CONFIRM" && !challenge.surveyDonorId) return { success: false, step: "EXISTING_OPTIONS", challengeId, accessToken, message: "Dit donateurschap kan hier nog niet automatisch worden aangepast." };
    if (requestType === "CHANGE_AMOUNT" && challenge.surveyDonorId) await prisma.surveyDonor.update({ where: { id: challenge.surveyDonorId }, data: { monthlyAmountCents: Math.round(Number(amount) * 100), status: challenge.surveyDonor?.status === "CANCELLED" ? "PENDING_MOLLIE" : challenge.surveyDonor?.status } });
    if (requestType === "CANCEL" && challenge.surveyDonorId) await prisma.surveyDonor.update({ where: { id: challenge.surveyDonorId }, data: { status: "CANCELLED" } });
    return { success: true, message: requestType === "CANCEL" ? "Uw donateurschap is opgezegd." : requestType === "CHANGE_AMOUNT" ? `Uw maandbedrag is aangepast naar € ${Number(amount).toFixed(2).replace(".", ",")}.` : "Dank voor uw bevestiging." };
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
    const isAnonymous = data.anonymousDonation === "on";
    const answers: OneTimeDonationAnswers = { wantsOneTimeDonation: true, oneTimeAmountCents: amountCents, isAnonymous };
    const response = await prisma.surveyResponse.create({ data: { surveyId: survey.id, firstName: isAnonymous ? "" : data.fullName, lastName: "", phone: "", email: "", answers, ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: requestHeaders.get("user-agent") } });
    await notifySurveyOwner(survey, response.id);
    return { success: true, message: survey.thankYouMessage || "Dank u. Uw naam en donatiebedrag zijn opgeslagen. De online betaling is tijdens deze test tijdelijk uitgeschakeld." };
  }

  const data = donorSchema.parse(raw);
  const common = { surveyId: survey.id, firstName: data.firstName, lastName: data.lastName, phone: data.phone, email: data.email.toLowerCase(), ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: requestHeaders.get("user-agent") };
  const isExistingDonor = data.isExistingDonor === "yes";
  if (isExistingDonor) {
    const submittedIdentity = { firstName: data.firstName, lastName: data.lastName, phone: data.phone, email: data.email.toLowerCase() };
    const surveyDonorCandidate = await prisma.surveyDonor.findUnique({ where: { email: submittedIdentity.email } });
    const surveyDonor = surveyDonorCandidate
      && ["ACTIVE", "PENDING_MOLLIE"].includes(surveyDonorCandidate.status)
      && identityMatches(submittedIdentity, surveyDonorCandidate)
      ? surveyDonorCandidate
      : null;
    const donor = await prisma.donorProfile.findFirst({
      where: { status: "ACTIVE", user: { email: submittedIdentity.email, isActive: true } },
      include: { user: true }
    });
    const matchedDonor = donor && identityMatches(submittedIdentity, { firstName: donor.firstName, lastName: donor.lastName, phone: donor.phone, email: donor.user.email }) ? donor : null;
    if (!surveyDonor && !matchedDonor) return { success: false, message: "Deze gegevens zijn niet herkend als een actief donateurschap. Controleer uw naam, mobiele nummer en e-mailadres, of kies dat u nog geen donateur bent." };
    const person = surveyDonor ?? { firstName: matchedDonor!.firstName, lastName: matchedDonor!.lastName, phone: matchedDonor!.phone, email: matchedDonor!.user.email };
    const code = String(randomInt(100000, 1000000));
    const challenge = await prisma.surveyMemberAccess.create({ data: { surveyId: survey.id, donorProfileId: matchedDonor?.id, surveyDonorId: surveyDonor?.id, codeHash: hashValue(code), expiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
    try {
      await prepareEmailLog({ templateKey: "REGISTRATION_VERIFICATION_CODE", recipient: person.email, entityType: "SurveyMemberAccess", entityId: challenge.id, data: { naam: person.firstName, verification_code: code }, throwOnSendError: true });
    } catch (error) {
      await prisma.surveyMemberAccess.delete({ where: { id: challenge.id } });
      console.error("Verificatiecode voor bestaande donateur kon niet worden verstuurd", error);
      return { success: false, message: "De verificatiecode kon niet worden verstuurd. Probeer het later opnieuw of neem contact op met de beheerder." };
    }
    return { success: false, step: "VERIFY_EXISTING", challengeId: challenge.id, maskedEmail: maskEmail(person.email), message: "Vul de verificatiecode in die naar uw geregistreerde e-mailadres is gestuurd." };
  }
  const wantsToBecomeDonor = isExistingDonor ? null : data.wantsToBecomeDonor === "yes";
  const wantsMonthlyDonation = wantsToBecomeDonor === true ? true : null;
  const amount = wantsMonthlyDonation ? Number(String(data.monthlyAmount).replace(",", ".")) : null;
  const answers: DonorSurveyAnswers = { isExistingDonor, wantsToBecomeDonor, wantsMonthlyDonation, monthlyAmountCents: amount === null ? null : Math.round(amount * 100), directDebitConsent: wantsMonthlyDonation === true && data.directDebitConsent === "on" };
  const response = await prisma.$transaction(async (tx) => {
    const created = await tx.surveyResponse.create({ data: { ...common, answers } });
    if (wantsToBecomeDonor) await tx.surveyDonor.upsert({
      where: { email: common.email },
      update: { firstName: common.firstName, lastName: common.lastName, phone: common.phone, monthlyAmountCents: answers.monthlyAmountCents, directDebitConsent: answers.directDebitConsent, status: "PENDING_MOLLIE" },
      create: { email: common.email, firstName: common.firstName, lastName: common.lastName, phone: common.phone, monthlyAmountCents: answers.monthlyAmountCents, directDebitConsent: answers.directDebitConsent, status: "PENDING_MOLLIE" }
    });
    return created;
  });
  await notifySurveyOwner(survey, response.id);
  const templateKey = isExistingDonor ? "SURVEY_EXISTING_DONOR_CONFIRMED" : wantsToBecomeDonor ? "SURVEY_MEMBERSHIP_INTEREST" : "SURVEY_NO_MEMBERSHIP";
  await prepareEmailLog({ templateKey, recipient: common.email, entityType: "SurveyResponse", entityId: response.id, data: { naam: `${common.firstName} ${common.lastName}` } });
  return { success: true, message: survey.thankYouMessage || (isExistingDonor ? "Dank voor uw bevestiging. U ontvangt ook een bevestiging per e-mail." : wantsToBecomeDonor ? "Dank voor uw interesse. Uw antwoorden zijn ontvangen; er wordt nu nog niets afgeschreven." : "Dank voor uw tijd en voor het invullen van de enquête.") };
}
