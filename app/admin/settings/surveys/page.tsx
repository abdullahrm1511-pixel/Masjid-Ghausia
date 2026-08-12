import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/display";
import { surveyStatusLabel } from "@/lib/survey";

export const dynamic = "force-dynamic";

export default async function SurveysPage() {
  const forms = await prisma.survey.findMany({
    where: { templateKey: { in: ["DONOR_JOURNEY", "ONE_TIME_DONATION"] } },
    include: { _count: { select: { responses: true } } },
    orderBy: [{ templateKey: "asc" }, { createdAt: "desc" }]
  });
  const membership = forms.find((form) => form.templateKey === "DONOR_JOURNEY");
  const campaigns = forms.filter((form) => form.templateKey === "ONE_TIME_DONATION");

  return <main className="mx-auto max-w-6xl px-4 py-10">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-[#0f766e]">Instellingen</p><h1 className="text-3xl font-bold text-slate-900">Donatiebeheer</h1><p className="mt-2 text-slate-600">Beheer het vaste donateursformulier en tijdelijke donatiecampagnes.</p></div><Link className="rounded-md bg-[#1483d6] px-5 py-3 font-semibold text-white" href="/admin/settings/surveys/new">Nieuw donatieformulier</Link></header>

    <section className="mt-8"><h2 className="text-xl font-bold text-slate-900">Maandelijks donateurschap</h2>{membership ? <Link className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sky-200 bg-sky-50 p-5 transition hover:border-sky-400" href={`/admin/settings/surveys/${membership.id}`}><div><p className="font-bold text-slate-900">{membership.title}</p><p className="mt-1 text-sm text-slate-600">Permanent formulier · {membership._count.responses} aanmeldingen</p></div><span className="font-bold text-[#0f5f9f]">Beheren →</span></Link> : <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-6"><p className="text-slate-600">Het vaste donateursformulier is nog niet aangemaakt.</p><Link className="mt-3 inline-block font-bold text-[#0f5f9f]" href="/admin/settings/surveys/new?type=membership">Nu aanmaken →</Link></div>}</section>

    <section className="mt-8"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-slate-900">Eenmalige donatiecampagnes</h2><span className="text-sm text-slate-500">{campaigns.length} totaal</span></div>{campaigns.length ? <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-4">Campagne</th><th className="p-4">Status</th><th className="p-4">Looptijd</th><th className="p-4">Betalingen</th><th className="p-4 text-right"></th></tr></thead><tbody>{campaigns.map((form) => <tr className="border-t border-slate-200" key={form.id}><td className="p-4 font-bold">{form.title}</td><td className="p-4">{surveyStatusLabel(form)}</td><td className="p-4">{form.startsAt || form.endsAt ? `${formatDate(form.startsAt)} t/m ${formatDate(form.endsAt)}` : "Geen einddatum"}</td><td className="p-4 font-bold">{form._count.responses}</td><td className="p-4 text-right"><Link className="font-bold text-[#0f5f9f]" href={`/admin/settings/surveys/${form.id}`}>Beheren →</Link></td></tr>)}</tbody></table></div></div> : <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">Nog geen eenmalige campagnes.</div>}</section>
  </main>;
}
