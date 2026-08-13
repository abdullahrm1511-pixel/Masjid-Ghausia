import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";
import { formatCurrency, formatDate } from "@/lib/display";
import { surveyStatusLabel, type DonorSurveyAnswers, type OneTimeDonationAnswers } from "@/lib/survey";
import { deleteSurveyResponse } from "../actions";
import { CopySurveyLink, DeleteSurveyButton } from "../SurveyAdminControls";
import { FixedSurveyEditor } from "../FixedSurveyEditor";
import { SurveySettingsForm } from "../SurveySettingsForm";
import { SurveySummary } from "../SurveySummary";
import { ResponseDeleteButton } from "../ResponseDeleteButton";
import { donationFormPath } from "@/lib/donation-form-url";

export const dynamic = "force-dynamic";

function yesNo(value: boolean | null) {
  return value === null ? "-" : value ? "Ja" : "Nee";
}

const paymentLabels: Record<string, { label: string; className: string }> = {
  paid: { label: "Betaald", className: "bg-emerald-100 text-emerald-800" },
  open: { label: "Openstaand", className: "bg-amber-100 text-amber-800" },
  pending: { label: "In verwerking", className: "bg-sky-100 text-sky-800" },
  failed: { label: "Mislukt", className: "bg-red-100 text-red-800" },
  canceled: { label: "Geannuleerd", className: "bg-slate-200 text-slate-700" },
  expired: { label: "Verlopen", className: "bg-slate-200 text-slate-700" }
};

function PaymentStatus({ status }: { status: string | null | undefined }) {
  const value = status ? paymentLabels[status] ?? { label: status, className: "bg-slate-100 text-slate-700" } : { label: "Niet gestart", className: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${value.className}`}>{value.label}</span>;
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>{hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}</article>;
}

export default async function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const survey = await prisma.survey.findUnique({
    where: { id },
    include: { responses: { orderBy: { submittedAt: "desc" }, include: { donationPayment: true, documents: true } } }
  });
  if (!survey || !["DONOR_JOURNEY", "ONE_TIME_DONATION"].includes(survey.templateKey)) notFound();

  const url = absoluteUrl(donationFormPath(survey.templateKey, survey.slug));
  const isOneTime = survey.templateKey === "ONE_TIME_DONATION";
  const monthlyDonors = isOneTime ? [] : await prisma.surveyDonor.findMany({ orderBy: { createdAt: "desc" } });
  const monthlyDonorByEmail = new Map(monthlyDonors.map((donor) => [donor.email.toLowerCase(), donor]));
  const typeLabel = isOneTime ? "Eenmalige donatiecampagne" : "Maandelijks donateurschap";
  const paidResponses = isOneTime ? survey.responses.filter((response) => response.donationPayment?.status === "paid") : [];
  const paidTotal = paidResponses.reduce((total, response) => total + (response.donationPayment?.amountCents ?? 0), 0);

  return <main className="mx-auto max-w-7xl px-4 py-10">
    <Link className="text-sm font-bold text-[#0f5f9f]" href="/admin/settings/surveys">← Terug naar Donatiebeheer</Link>
    <header className="mt-5 flex flex-wrap items-start justify-between gap-5">
      <div><p className="text-sm font-bold text-[#0f766e]">{typeLabel}</p><h1 className="mt-1 text-3xl font-bold text-slate-900">{survey.title}</h1><p className="mt-2 text-slate-600"><strong>{surveyStatusLabel(survey)}</strong> · {survey.responses.length} {isOneTime ? "betaalpogingen" : "inzendingen"}</p></div>
      <div className="flex flex-wrap gap-2"><CopySurveyLink url={url} /><a className="rounded-md border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700" href={`/admin/settings/surveys/${survey.id}/preview`} rel="noreferrer" target="_blank">Voorbeeld</a><a className="rounded-md border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700" download href={`/admin/settings/surveys/${survey.id}/qr`}>QR-code</a><a className="rounded-md border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700" href={`/admin/settings/surveys/${survey.id}/export`}>CSV</a></div>
    </header>

    <section className={`mt-6 rounded-xl border p-4 ${survey.isDraft ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold">{survey.isDraft ? "Concept – openbare link gesloten" : "Openbare donatielink"}</p><a className="mt-1 block break-all text-sm font-semibold text-[#0f5f9f] underline" href={url} rel="noreferrer" target="_blank">{url}</a></div>{!survey.isDraft ? <a className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-bold text-white" href={url} rel="noreferrer" target="_blank">Open formulier</a> : null}</div></section>

    {isOneTime ? <section className="mt-6 grid gap-4 sm:grid-cols-3"><StatCard label="Betaalpogingen" value={survey.responses.length} /><StatCard label="Geslaagde donaties" value={paidResponses.length} /><StatCard label="Totaal ontvangen" value={formatCurrency(paidTotal)} hint="Alleen betalingen met status Betaald" /></section> : null}

    <SurveySettingsForm survey={survey} />
    {isOneTime ? <FixedSurveyEditor id={survey.id} templateKey={survey.templateKey} value={survey.questions} /> : <section className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-5"><h2 className="font-bold text-sky-950">Vaste donateurslogica</h2><p className="mt-1 text-sm text-sky-900">Herkenning, verificatiecode, bedrag aanpassen en opzeggen worden automatisch geregeld.</p></section>}
    {!isOneTime ? <SurveySummary questions={[]} responses={survey.responses} templateKey={survey.templateKey} /> : null}

    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold">{isOneTime ? "Donaties" : "Aanmeldingen"}</h2><p className="mt-1 text-sm text-slate-600">{isOneTime ? "Alle betaalpogingen en hun actuele Mollie-status." : "Ingevulde donateursgegevens en gekozen maandbedragen."}</p></div><a className="font-bold text-emerald-800 underline" href={`/admin/settings/surveys/${survey.id}/export`}>Download als CSV</a></div>
      {survey.responses.length ? <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {isOneTime ? <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-4">Datum</th><th className="p-4">Naam</th><th className="p-4">Bedrag</th><th className="p-4">Betaalstatus</th><th className="p-4 text-right">Actie</th></tr></thead><tbody>{survey.responses.map((response) => { const answers = response.answers as OneTimeDonationAnswers; return <tr className="border-t border-slate-200" key={response.id}><td className="p-4 whitespace-nowrap">{formatDate(response.submittedAt)}</td><td className="p-4 font-semibold">{response.firstName || "Anoniem"}</td><td className="p-4 font-bold">{typeof answers.oneTimeAmountCents === "number" ? formatCurrency(answers.oneTimeAmountCents) : "-"}</td><td className="p-4"><PaymentStatus status={response.donationPayment?.status} /></td><td className="p-4 text-right"><form action={deleteSurveyResponse}><input name="surveyId" type="hidden" value={survey.id} /><input name="responseId" type="hidden" value={response.id} /><ResponseDeleteButton /></form></td></tr>; })}</tbody></table>
        : <table className="w-full min-w-[1150px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-4">Datum</th><th className="p-4">Donateur</th><th className="p-4">Contact</th><th className="p-4">Bestaand</th><th className="p-4">Aanmelden</th><th className="p-4">Maandbedrag</th><th className="p-4">Mollie-status</th><th className="p-4 text-right">Actie</th></tr></thead><tbody>{survey.responses.map((response) => { const answers = response.answers as DonorSurveyAnswers; const donor = monthlyDonorByEmail.get(response.email.toLowerCase()); const status = donor?.status === "ACTIVE" ? "Actief" : donor?.status === "CANCELLED" ? "Opgezegd" : donor?.status === "MANDATE_PENDING" ? "Mandaat verwerken" : donor ? "Machtiging open" : "Geen donateur"; return <tr className="border-t border-slate-200 align-top" key={response.id}><td className="p-4 whitespace-nowrap">{formatDate(response.submittedAt)}</td><td className="p-4 font-semibold">{response.firstName} {response.lastName}</td><td className="p-4">{response.email}<span className="block text-slate-500">{response.phone}</span></td><td className="p-4">{yesNo(answers.isExistingDonor)}</td><td className="p-4">{yesNo(answers.wantsToBecomeDonor)}</td><td className="p-4 font-bold">{typeof answers.monthlyAmountCents === "number" ? formatCurrency(answers.monthlyAmountCents) : "-"}</td><td className="p-4 font-semibold">{status}</td><td className="p-4 text-right"><form action={deleteSurveyResponse}><input name="surveyId" type="hidden" value={survey.id} /><input name="responseId" type="hidden" value={response.id} /><ResponseDeleteButton /></form></td></tr>; })}</tbody></table>}
      </div> : <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">Nog geen {isOneTime ? "donaties" : "aanmeldingen"} ontvangen.</div>}
    </section>

    {session?.user.role === "SUPER_ADMIN" ? <div className="mt-10 border-t border-slate-200 pt-6"><DeleteSurveyButton surveyId={survey.id} /></div> : null}
  </main>;
}
