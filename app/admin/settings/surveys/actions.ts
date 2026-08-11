"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createSurveySlug, CUSTOM_SURVEY_TEMPLATE_KEY, parseSurveyQuestions } from "@/lib/survey";
import { writeAuditLog } from "@/lib/audit";

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

export async function createSurvey(formData: FormData) {
  const adminId = await requireSettingsAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requestedTemplate = String(formData.get("templateKey") ?? "");
  const templateKey = requestedTemplate === "ONE_TIME_DONATION" ? "ONE_TIME_DONATION" : requestedTemplate === CUSTOM_SURVEY_TEMPLATE_KEY ? CUSTOM_SURVEY_TEMPLATE_KEY : "DONOR_JOURNEY";
  const questions = templateKey === CUSTOM_SURVEY_TEMPLATE_KEY ? parseSurveyQuestions(JSON.parse(String(formData.get("questionsJson") ?? "[]"))) : [];
  const unlimited = formData.get("unlimited") === "on";
  if (title.length < 3 || title.length > 140) throw new Error("Vul een geldige titel in");
  if (templateKey === CUSTOM_SURVEY_TEMPLATE_KEY && !questions.length) throw new Error("Voeg minimaal één geldige vraag toe");
  if (questions.some((question) => ["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(question.type) && !question.options?.length)) throw new Error("Iedere keuzevraag moet minimaal één antwoordoptie hebben");
  const startsAt = unlimited ? null : optionalDate(formData.get("startsAt"));
  const endsAt = unlimited ? null : optionalDate(formData.get("endsAt"), true);
  if (startsAt && endsAt && endsAt < startsAt) throw new Error("De einddatum moet na de begindatum liggen");

  const survey = await prisma.survey.create({
    data: { slug: createSurveySlug(), title, description: description || null, templateKey, questions, startsAt, endsAt, createdById: adminId }
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

export async function updateSurvey(formData: FormData) {
  const adminId = await requireSettingsAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unlimited = formData.get("unlimited") === "on";
  const startsAt = unlimited ? null : optionalDate(formData.get("startsAt"));
  const endsAt = unlimited ? null : optionalDate(formData.get("endsAt"), true);
  if (title.length < 3 || title.length > 140) throw new Error("Vul een geldige titel in");
  if (startsAt && endsAt && endsAt < startsAt) throw new Error("De einddatum moet na de begindatum liggen");
  await prisma.survey.update({ where: { id }, data: { title, description: description || null, startsAt, endsAt, isActive: formData.get("isActive") === "on" } });
  await writeAuditLog({ actorId: adminId, action: "UPDATE", entityType: "Survey", entityId: id, message: `Enquete aangepast: ${title}` });
  revalidatePath(`/admin/settings/surveys/${id}`);
  revalidatePath("/admin/settings/surveys");
}

export async function deleteSurvey(formData: FormData) {
  const adminId = await requireSettingsAdmin();
  const id = String(formData.get("id") ?? "");
  const survey = await prisma.survey.findUnique({ where: { id }, select: { title: true } });
  if (!survey) return;
  await prisma.survey.delete({ where: { id } });
  await writeAuditLog({ actorId: adminId, action: "DELETE", entityType: "Survey", entityId: id, message: `Enquete verwijderd: ${survey.title}` });
  redirect("/admin/settings/surveys");
}
