import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CUSTOM_SURVEY_TEMPLATE_KEY, parseSurveyQuestions } from "@/lib/survey";

function csv(value: unknown) {
  const text = Array.isArray(value) ? value.join("; ") : value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.id || !canManageSettings(session.user.role)) return new NextResponse("Geen toegang", { status: 403 });
  const { id } = await params;
  const survey = await prisma.survey.findUnique({ where: { id }, include: { responses: { orderBy: { submittedAt: "desc" }, include: { donationPayment: true, documents: true } } } });
  if (!survey) return new NextResponse("Niet gevonden", { status: 404 });
  const questions = parseSurveyQuestions(survey.questions);
  const dynamic = survey.templateKey === CUSTOM_SURVEY_TEMPLATE_KEY;
  const headers = dynamic ? ["Datum", "Voornaam", "Achternaam", "Telefoon", "E-mail", ...questions.map((question) => question.title), "Bestanden"] : ["Datum", "Voornaam", "Achternaam", "Telefoon", "E-mail", "Antwoorden", "Betaalstatus"];
  const rows = survey.responses.map((response) => {
    const answers = response.answers as Record<string, unknown>;
    return dynamic
      ? [response.submittedAt.toISOString(), response.firstName, response.lastName, response.phone, response.email, ...questions.map((question) => answers[question.id]), response.documents.map((document) => document.filename).join("; ")]
      : [response.submittedAt.toISOString(), response.firstName, response.lastName, response.phone, response.email, JSON.stringify(answers), response.donationPayment?.status ?? ""];
  });
  const content = `\uFEFF${[headers, ...rows].map((row) => row.map(csv).join(",")).join("\r\n")}`;
  const filename = survey.title.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "enquete";
  return new NextResponse(content, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}-antwoorden.csv"` } });
}
