import { notFound } from "next/navigation";
import PublicSurveyPage from "@/app/enquete/[slug]/page";
import { prisma } from "@/lib/prisma";

export { metadata } from "@/app/enquete/[slug]/page";
export const dynamic = "force-dynamic";

export default async function MonthlyDonationPage() {
  const survey = await prisma.survey.findFirst({
    where: { templateKey: "DONOR_JOURNEY" },
    select: { slug: true }
  });
  if (!survey) notFound();
  return PublicSurveyPage({ params: Promise.resolve({ slug: survey.slug }) });
}
