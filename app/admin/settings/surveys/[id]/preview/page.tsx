import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CUSTOM_SURVEY_TEMPLATE_KEY, parseFixedSurveySettings, parseSurveyQuestions } from "@/lib/survey";
import { getSepaConfig } from "@/lib/monthly-donation-agreement";
import { DynamicSurveyForm } from "@/app/enquete/[slug]/DynamicSurveyForm";
import { SurveyForm } from "@/app/enquete/[slug]/SurveyForm";

export const dynamic = "force-dynamic";

export default async function SurveyPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const survey = await prisma.survey.findUnique({ where: { id } });
  if (!survey) notFound();
  return <main className="survey-page"><div className="mx-auto mb-4 flex w-full max-w-[46rem] items-center justify-between gap-3"><a className="font-bold text-[#0f5f9f] underline" href={`/admin/settings/surveys/${survey.id}`}>← Terug naar beheer</a><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Preview</span></div>{survey.templateKey === CUSTOM_SURVEY_TEMPLATE_KEY ? <DynamicSurveyForm preview survey={{ id: survey.id, title: survey.title, description: survey.description, questions: parseSurveyQuestions(survey.questions), identityMode: survey.identityMode }} /> : <SurveyForm preview sepaConfig={await getSepaConfig()} settings={parseFixedSurveySettings(survey.questions)} survey={survey} />}</main>;
}
