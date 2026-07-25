import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/display";
import { surveyStatusLabel } from "@/lib/survey";

export const dynamic = "force-dynamic";

export default async function SurveysPage() {
  const surveys = await prisma.survey.findMany({ include: { _count: { select: { responses: true } } }, orderBy: { createdAt: "desc" } });
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-bold text-[#0f766e]">Instellingen</p><h1 className="text-3xl font-bold text-slate-900">Enquetes</h1><p className="mt-2 text-slate-700">Maak deelbare enquetes en bekijk de binnengekomen antwoorden.</p></div>
        <Link className="rounded-md bg-[#1483d6] px-4 py-3 font-semibold text-white" href="/admin/settings/surveys/new">Nieuwe enquete</Link>
      </div>
      <section className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {surveys.length ? <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="p-4">Enquete</th><th className="p-4">Status</th><th className="p-4">Looptijd</th><th className="p-4">Antwoorden</th><th className="p-4"></th></tr></thead><tbody>{surveys.map((survey) => <tr className="border-t border-slate-200" key={survey.id}><td className="p-4"><strong>{survey.title}</strong><p className="mt-1 text-xs text-slate-500">/enquete/{survey.slug}</p></td><td className="p-4">{surveyStatusLabel(survey)}</td><td className="p-4 text-sm">{survey.startsAt || survey.endsAt ? `${formatDate(survey.startsAt)} t/m ${formatDate(survey.endsAt)}` : "Onbeperkt"}</td><td className="p-4 font-bold">{survey._count.responses}</td><td className="p-4 text-right"><Link className="font-bold text-[#0f5f9f]" href={`/admin/settings/surveys/${survey.id}`}>Beheren</Link></td></tr>)}</tbody></table></div> : <div className="p-8 text-center text-slate-600">Nog geen enquetes. Maak uw eerste enquete aan.</div>}
      </section>
    </main>
  );
}
