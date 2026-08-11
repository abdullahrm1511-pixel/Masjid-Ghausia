"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createSurveySlug, CUSTOM_SURVEY_TEMPLATE_KEY, parseFixedSurveySettings, parseSurveyQuestions } from "@/lib/survey";
import { writeAuditLog } from "@/lib/audit";
import { compare } from "bcryptjs";

export type DeleteSurveyState = { error: string };

async function requireSettingsAdmin() {
  const session = await auth();
  if (!session?.user.id || !canManageSettings(session.user.role)) throw new Error("Geen toegang");
  return session.user.id;
}

function optionalDate(value: FormDataEntryValue | null, endOfDay = false) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(`${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  if (Number.isNaN(date.getTime())) throw new Error("Ongeldige datum");
  return date;
}

function optionalPositiveInt(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const number = Number(text);
  if (!Number.isInteger(number) || number < 1 || number > 1000000) throw new Error("Vul een geldig maximumaantal antwoorden in");
  return number;
}

function identityMode(value: FormDataEntryValue | null, templateKey: string) {
  if (templateKey === "DONOR_JOURNEY") return "REQUIRED";
  const mode = String(value ?? "REQUIRED");
  return ["ANONYMOUS", "OPTIONAL", "REQUIRED"].includes(mode) ? mode : "REQUIRED";
}

export async function createSurvey(formData: FormData) {
  const adminId = await requireSettingsAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requestedTemplate = String(formData.get("templateKey") ?? "");
  const templateKey = requestedTemplate === "ONE_TIME_DONATION" ? "ONE_TIME_DONATION" : requestedTemplate === CUSTOM_SURVEY_TEMPLATE_KEY ? CUSTOM_SURVEY_TEMPLATE_KEY : "DONOR_JOURNEY";
  const questions = templateKey === CUSTOM_SURVEY_TEMPLATE_KEY ? parseSurveyQuestions(JSON.parse(String(formData.get("questionsJson") ?? "[]"))) : [];
  const unlimited = formData.get("unlimited") === "on";
  const thankYouMessage = String(formData.get("thankYouMessage") ?? "").trim().slice(0, 1000);
  const notificationEmail = String(formData.get("notificationEmail") ?? "").trim().toLowerCase().slice(0, 200);
  if (notificationEmail && !/^\S+@\S+\.\S+$/.test(notificationEmail)) throw new Error("Vul een geldig notificatie-e-mailadres in");
  const maxResponses = templateKey === "DONOR_JOURNEY" ? null : optionalPositiveInt(formData.get("maxResponses"));
  if (title.length < 3 || title.length > 140) throw new Error("Vul een geldige titel in");
  if (templateKey === CUSTOM_SURVEY_TEMPLATE_KEY && !questions.length) throw new Error("Voeg minimaal één geldige vraag toe");
  if (questions.some((question) => ["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(question.type) && !question.options?.length)) throw new Error("Iedere keuzevraag moet minimaal één antwoordoptie hebben");
  const startsAt = unlimited ? null : optionalDate(formData.get("startsAt"));
  const endsAt = unlimited ? null : optionalDate(formData.get("endsAt"), true);
  if (startsAt && endsAt && endsAt < startsAt) throw new Error("De einddatum moet na de begindatum liggen");

  const survey = await prisma.survey.create({
    data: { slug: createSurveySlug(), title, description: description || null, templateKey, questions, startsAt, endsAt, createdById: adminId, isDraft: true, thankYouMessage: thankYouMessage || null, notificationEmail: notificationEmail || null, maxResponses, identityMode: identityMode(formData.get("identityMode"), templateKey) }
  });
  await writeAuditLog({ actorId: adminId, action: "CREATE", entityType: "Survey", entityId: survey.id, message: `Enquete aangemaakt: ${title}` });
  redirect(`/admin/settings/surveys/${survey.id}`);
}

export async function updateSurveyQuestions(formData: FormData) {
  const adminId = await requireSettingsAdmin();
  const id = String(formData.get("id") ?? "");
  const survey = await prisma.survey.findUnique({ where: { id }, select: { templateKey: true, title: true } });
  if (!survey || survey.templateKey !== CUSTOM_SURVEY_TEMPLATE_KEY) throw new Error("Dit formulier gebruikt geen vrije vragenlijst");
  const questions = parseSurveyQuestions(JSON.parse(String(formData.get("questionsJson") ?? "[]")));
  if (!questions.length) throw new Error("Voeg minimaal één geldige vraag toe");
  if (questions.some((question) => ["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(question.type) && !question.options?.length)) throw new Error("Iedere keuzevraag moet minimaal één antwoordoptie hebben");
  await prisma.survey.update({ where: { id }, data: { questions } });
  await writeAuditLog({ actorId: adminId, action: "UPDATE", entityType: "Survey", entityId: id, message: `Vragen aangepast: ${survey.title}` });
  revalidatePath(`/admin/settings/surveys/${id}`);
  revalidatePath(`/enquete`);
}

export async function updateFixedSurveySettings(formData: FormData) {
  const adminId = await requireSettingsAdmin();
  const id = String(formData.get("id") ?? "");
  const survey = await prisma.survey.findUnique({ where: { id }, select: { templateKey: true, title: true } });
  if (!survey || survey.templateKey === CUSTOM_SURVEY_TEMPLATE_KEY) throw new Error("Dit formulier gebruikt geen vast sjabloon");
  const settings = parseFixedSurveySettings(Object.fromEntries(formData));
  await prisma.survey.update({ where: { id }, data: { questions: settings } });
  await writeAuditLog({ actorId: adminId, action: "UPDATE", entityType: "Survey", entityId: id, message: `Vaste enquêteteksten aangepast: ${survey.title}` });
  revalidatePath(`/admin/settings/surveys/${id}`);
  revalidatePath(`/enquete`);
}

export async function updateSurvey(formData: FormData) {
  const adminId = await requireSettingsAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const survey = await prisma.survey.findUnique({ where: { id }, select: { templateKey: true } });
  if (!survey) throw new Error("Enquête niet gevonden");
  const unlimited = formData.get("unlimited") === "on";
  const startsAt = unlimited ? null : optionalDate(formData.get("startsAt"));
  const endsAt = unlimited ? null : optionalDate(formData.get("endsAt"), true);
  if (title.length < 3 || title.length > 140) throw new Error("Vul een geldige titel in");
  if (startsAt && endsAt && endsAt < startsAt) throw new Error("De einddatum moet na de begindatum liggen");
  const thankYouMessage = String(formData.get("thankYouMessage") ?? "").trim().slice(0, 1000);
  const notificationEmail = String(formData.get("notificationEmail") ?? "").trim().toLowerCase().slice(0, 200);
  if (notificationEmail && !/^\S+@\S+\.\S+$/.test(notificationEmail)) throw new Error("Vul een geldig notificatie-e-mailadres in");
  await prisma.survey.update({ where: { id }, data: { title, description: description || null, startsAt, endsAt, isActive: formData.get("isActive") === "on", isDraft: formData.get("publicationStatus") !== "PUBLISHED", thankYouMessage: thankYouMessage || null, notificationEmail: notificationEmail || null, maxResponses: survey.templateKey === "DONOR_JOURNEY" ? null : optionalPositiveInt(formData.get("maxResponses")), identityMode: identityMode(formData.get("identityMode"), survey.templateKey) } });
  await writeAuditLog({ actorId: adminId, action: "UPDATE", entityType: "Survey", entityId: id, message: `Enquete aangepast: ${title}` });
  revalidatePath(`/admin/settings/surveys/${id}`);
  revalidatePath("/admin/settings/surveys");
}

export async function deleteSurvey(_previous: DeleteSurveyState, formData: FormData): Promise<DeleteSurveyState> {
  const session = await auth();
  if (!session?.user.id || session.user.role !== "SUPER_ADMIN") return { error: "Alleen een superadmin kan een enquête verwijderen." };
  const adminId = session.user.id;
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("superAdminPassword") ?? "");
  const superAdmin = await prisma.user.findFirst({ where: { id: adminId, role: "SUPER_ADMIN", isActive: true }, select: { passwordHash: true } });
  if (!superAdmin?.passwordHash || !password || !(await compare(password, superAdmin.passwordHash))) return { error: "Het superadmin-wachtwoord is onjuist." };
  const survey = await prisma.survey.findUnique({ where: { id }, select: { title: true, templateKey: true } });
  if (!survey) return { error: "De enquête bestaat niet meer." };
  await prisma.survey.delete({ where: { id } });
  await writeAuditLog({ actorId: adminId, action: "DELETE", entityType: "Survey", entityId: id, message: `Enquete verwijderd: ${survey.title}` });
  redirect("/admin/settings/surveys");
}

export async function deleteSurveyResponse(formData: FormData) {
  const adminId = await requireSettingsAdmin();
  const surveyId = String(formData.get("surveyId") ?? "");
  const responseId = String(formData.get("responseId") ?? "");
  const response = await prisma.surveyResponse.findFirst({ where: { id: responseId, surveyId }, select: { id: true } });
  if (!response) return;
  await prisma.surveyResponse.delete({ where: { id: response.id } });
  await writeAuditLog({ actorId: adminId, action: "DELETE", entityType: "SurveyResponse", entityId: response.id, message: "Enquêteantwoord handmatig verwijderd", metadata: { surveyId } });
  revalidatePath(`/admin/settings/surveys/${surveyId}`);
}

export async function updateSurveyMemberRequest(formData: FormData) {
  const adminId = await requireSettingsAdmin();
  const surveyId = String(formData.get("surveyId") ?? "");
  const requestId = String(formData.get("requestId") ?? "");
  const status = formData.get("decision") === "APPROVE" ? "APPROVED_MANUAL_ACTION_REQUIRED" : "REJECTED";
  const request = await prisma.surveyMemberRequest.findFirst({ where: { id: requestId, surveyId } });
  if (!request) return;
  await prisma.surveyMemberRequest.update({ where: { id: request.id }, data: { status } });
  await writeAuditLog({ actorId: adminId, action: status.startsWith("APPROVED") ? "APPROVE" : "REJECT", entityType: "SurveyMemberRequest", entityId: request.id, message: status.startsWith("APPROVED") ? "Ledenverzoek goedgekeurd; handmatige/Mollie-verwerking vereist" : "Ledenverzoek afgewezen", metadata: { surveyId, requestType: request.requestType } });
  revalidatePath(`/admin/settings/surveys/${surveyId}`);
}
