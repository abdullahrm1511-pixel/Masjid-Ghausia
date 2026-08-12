import { NewSurveyForm } from "./NewSurveyForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewSurveyPage() {
  const membershipExists = await prisma.survey.count({ where: { templateKey: "DONOR_JOURNEY" } });
  return <main className="mx-auto max-w-4xl px-4 py-10"><p className="text-sm font-bold text-[#0f766e]">Enquêtes</p><h1 className="text-3xl font-bold text-slate-900">Formulier aanmaken</h1><p className="mt-2 text-slate-700">Maak de vaste lidmaatschapsenquête of een eenmalige donatiecampagne.</p><NewSurveyForm canCreateMembership={membershipExists === 0} /></main>;
}
