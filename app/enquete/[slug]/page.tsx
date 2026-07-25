import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { surveyAvailability } from "@/lib/survey";
import { SurveyForm } from "./SurveyForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Enquete", description: "Enquete van Masjid Ghausia.", robots: { index: false, follow: false } };

export default async function PublicSurveyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const survey = await prisma.survey.findUnique({ where: { slug }, select: { id: true, title: true, description: true, isActive: true, startsAt: true, endsAt: true } });
  if (!survey) notFound();
  const availability = surveyAvailability(survey);
  if (availability !== "open") return <main className="survey-page"><section className="survey-card survey-finished"><p className="donor-eyebrow">Enquete niet beschikbaar</p><h1>{availability === "scheduled" ? "Deze enquete is nog niet geopend" : "Deze enquete is gesloten"}</h1><p>{availability === "scheduled" ? "Kom op een later moment terug via dezelfde link." : "Bedankt voor uw interesse."}</p></section></main>;
  return <main className="survey-page"><SurveyForm survey={survey} /></main>;
}
