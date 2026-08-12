import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { surveyAvailability } from "@/lib/survey";
import { SurveyForm } from "./SurveyForm";
import { DynamicSurveyForm } from "./DynamicSurveyForm";
import { CUSTOM_SURVEY_TEMPLATE_KEY, parseFixedSurveySettings, parseSurveyQuestions } from "@/lib/survey";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Donatieformulier", description: "Donatieformulier van Masjid Ghausia.", robots: { index: false, follow: false } };

export default async function PublicSurveyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const survey = await prisma.survey.findUnique({ where: { slug }, select: { id: true, title: true, description: true, templateKey: true, questions: true, identityMode: true, isActive: true, isDraft: true, startsAt: true, endsAt: true, maxResponses: true, _count: { select: { responses: true } } } });
  if (!survey) notFound();
  const availability = surveyAvailability(survey);
  const limitReached = survey.maxResponses !== null && survey._count.responses >= survey.maxResponses;
  if (availability !== "open" || limitReached) return <main className="survey-page"><section className="survey-card survey-finished"><p className="donor-eyebrow">Donatieformulier niet beschikbaar</p><h1>{availability === "scheduled" ? "Dit formulier is nog niet geopend" : availability === "draft" ? "Dit formulier is nog niet gepubliceerd" : "Dit formulier is gesloten"}</h1><p>{availability === "scheduled" ? "Kom op een later moment terug via dezelfde link." : "Bedankt voor uw interesse."}</p></section></main>;
  if (survey.templateKey === CUSTOM_SURVEY_TEMPLATE_KEY) return <main className="survey-page"><DynamicSurveyForm survey={{ ...survey, questions: parseSurveyQuestions(survey.questions) }} /></main>;
  return <main className="survey-page"><SurveyForm settings={parseFixedSurveySettings(survey.questions)} survey={survey} /></main>;
}
