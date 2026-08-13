import { notFound } from "next/navigation";
import MandateReturnPage from "@/app/enquete/[slug]/machtiging/page";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MonthlyMandateReturnPage({ searchParams }: { searchParams: Promise<{ donor?: string }> }) {
  const survey = await prisma.survey.findFirst({ where: { templateKey: "DONOR_JOURNEY" }, select: { slug: true } });
  if (!survey) notFound();
  return MandateReturnPage({ params: Promise.resolve({ slug: survey.slug }), searchParams });
}
