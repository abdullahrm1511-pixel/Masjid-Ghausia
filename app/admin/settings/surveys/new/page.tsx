import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewSurveyForm } from "./NewSurveyForm";

export const dynamic = "force-dynamic";

export default async function NewSurveyPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const membershipExists = await prisma.survey.count({ where: { templateKey: "DONOR_JOURNEY" } });
  if (type === "membership" && membershipExists === 0) return <Shell title="Maandelijks donateurschap"><NewSurveyForm type="DONOR_JOURNEY" /></Shell>;
  if (type === "campaign") return <Shell title="Eenmalige donatiecampagne"><NewSurveyForm type="ONE_TIME_DONATION" /></Shell>;

  return <Shell title="Nieuw donatieformulier"><div className="mt-8 grid gap-4 sm:grid-cols-2">
    {membershipExists === 0 ? <Link className="rounded-xl border border-sky-200 bg-sky-50 p-6 transition hover:border-sky-500" href="?type=membership"><h2 className="text-xl font-bold">Maandelijks donateurschap</h2><p className="mt-2 text-sm text-slate-600">Het vaste formulier voor aanmelden, verifiëren, aanpassen en opzeggen.</p><span className="mt-5 block font-bold text-[#0f5f9f]">Kiezen →</span></Link> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6"><h2 className="text-xl font-bold">Maandelijks donateurschap</h2><p className="mt-2 text-sm text-emerald-900">Het vaste formulier bestaat al en kan via het overzicht worden beheerd.</p></div>}
    <Link className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-500" href="?type=campaign"><h2 className="text-xl font-bold">Eenmalige donatiecampagne</h2><p className="mt-2 text-sm text-slate-600">Voor een tijdelijk doel zoals Fitranah of een inzamelingsactie.</p><span className="mt-5 block font-bold text-[#0f5f9f]">Kiezen →</span></Link>
  </div></Shell>;
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="mx-auto max-w-4xl px-4 py-10"><Link className="text-sm font-bold text-[#0f5f9f]" href="/admin/settings/surveys">← Terug naar Donatiebeheer</Link><h1 className="mt-4 text-3xl font-bold text-slate-900">{title}</h1>{children}</main>;
}
