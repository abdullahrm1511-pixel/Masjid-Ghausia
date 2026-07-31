import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";
import { formatCurrency, formatDate } from "@/lib/display";
import { surveyStatusLabel, type DonorSurveyAnswers } from "@/lib/survey";
import { deleteSurvey, updateSurvey } from "../actions";
import { CopySurveyLink, DeleteSurveyButton } from "../SurveyAdminControls";

export const dynamic = "force-dynamic";
function yesNo(value: boolean | null) { return value === null ? "-" : value ? "Ja" : "Nee"; }
function dateInput(value: Date | null) { return value ? value.toISOString().slice(0, 10) : ""; }

export default async function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const survey = await prisma.survey.findUnique({ where: { id }, include: { responses: { orderBy: { submittedAt: "desc" } } } });
  if (!survey) notFound();
  const url = absoluteUrl(`/enquete/${survey.slug}`);
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-[#0f766e]">Enquete beheren</p><h1 className="text-3xl font-bold text-slate-900">{survey.title}</h1><p className="mt-2 text-slate-700">Status: <strong>{surveyStatusLabel(survey)}</strong> · {survey.responses.length} antwoorden</p></div><div className="flex flex-wrap gap-3"><CopySurveyLink url={url} /><a className="rounded-md bg-[#1483d6] px-4 py-3 font-semibold text-white" download href={`/admin/settings/surveys/${survey.id}/qr`}>QR-code downloaden</a></div></div>
      <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">Unieke openbare link</p><a className="mt-1 block break-all font-semibold text-[#0f5f9f] underline" href={url} rel="noreferrer" target="_blank">{url}</a><p className="mt-2 text-sm text-emerald-800">De downloadknop gebruikt altijd deze volledige link, niet alleen het subdomein.</p></section>
      <form action={updateSurvey} className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><input name="id" type="hidden" value={survey.id} /><h2 className="text-xl font-bold">Instellingen</h2><label>Titel<input defaultValue={survey.title} name="title" required /></label><label>Toelichting<textarea defaultValue={survey.description ?? ""} name="description" rows={3} /></label><label className="flex grid-cols-none flex-row items-center gap-3"><input className="w-auto" defaultChecked={!survey.startsAt && !survey.endsAt} name="unlimited" type="checkbox" /> Onbeperkt beschikbaar</label><div className="grid gap-4 sm:grid-cols-2"><label>Begindatum<input defaultValue={dateInput(survey.startsAt)} name="startsAt" type="date" /></label><label>Einddatum<input defaultValue={dateInput(survey.endsAt)} name="endsAt" type="date" /></label></div><label className="flex grid-cols-none flex-row items-center gap-3"><input className="w-auto" defaultChecked={survey.isActive} name="isActive" type="checkbox" /> Enquete actief</label><button className="w-fit rounded-md bg-[#1483d6] px-4 py-3 font-semibold text-white" type="submit">Instellingen opslaan</button></form>
      <section className="mt-8"><h2 className="text-2xl font-bold text-slate-900">Antwoorden</h2>{survey.responses.length ? <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">Datum</th><th className="p-3">Voornaam</th><th className="p-3">Achternaam</th><th className="p-3">Mobiel</th><th className="p-3">E-mail</th><th className="p-3">Al donateur</th><th className="p-3">Wil donateur worden</th><th className="p-3">Maandelijks doneren</th><th className="p-3">Bedrag</th><th className="p-3">Toestemming</th></tr></thead><tbody>{survey.responses.map((response) => { const answers = response.answers as DonorSurveyAnswers; return <tr className="border-t border-slate-200" key={response.id}><td className="p-3">{formatDate(response.submittedAt)}</td><td className="p-3 font-semibold">{response.firstName}</td><td className="p-3 font-semibold">{response.lastName}</td><td className="p-3">{response.phone}</td><td className="p-3">{response.email}</td><td className="p-3">{yesNo(answers.isExistingDonor)}</td><td className="p-3">{yesNo(answers.wantsToBecomeDonor)}</td><td className="p-3">{yesNo(answers.wantsMonthlyDonation)}</td><td className="p-3">{answers.monthlyAmountCents === null ? "-" : formatCurrency(answers.monthlyAmountCents)}</td><td className="p-3">{answers.directDebitConsent ? "Ja" : "-"}</td></tr>; })}</tbody></table></div> : <div className="mt-4 rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">Er zijn nog geen antwoorden ontvangen.</div>}</section>
      <form action={deleteSurvey} className="mt-10 border-t border-slate-200 pt-6"><input name="id" type="hidden" value={survey.id} /><DeleteSurveyButton /></form>
    </main>
  );
}
