import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";
import { formatDate } from "@/lib/display";
import type { FuneralFormData } from "@/lib/funeral-application";
import { CopyLink } from "../CopyLink";
import { deleteFuneralApplication, updateFuneralPdfDetails } from "../actions";
import { ShareAvgMailPdf } from "./ShareAvgMailPdf";

export const dynamic = "force-dynamic";

export default async function FuneralApplicationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pdfDetails?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const application = await prisma.funeralApplication.findUnique({ where: { id }, include: { documents: { orderBy: { uploadedAt: "asc" } } } });
  if (!application) notFound();
  const data = application.formData as FuneralFormData | null;
  const url = absoluteUrl(`/begrafenisaanvraag/${application.accessToken}`);
  const documentLabel = (kind: string) => kind === "DECEASED_ID" ? "Identiteitsbewijs overledene" : "Doktersverklaring";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-bold text-[#0f766e]">Begrafenisaanvraag</p><h1 className="text-3xl font-bold text-slate-900">{data ? `${data.deceasedFirstName} ${data.deceasedLastName}` : "Nieuwe invullink"}</h1><p className="mt-2 text-slate-700">Status: <strong>{application.status === "SUBMITTED" ? "Ingediend" : "Nog niet ingevuld"}</strong></p></div>
        <CopyLink url={url} />
      </div>
      <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">Openbare invullink</p><a className="mt-1 block break-all font-semibold text-[#0f5f9f] underline" href={url} rel="noreferrer" target="_blank">{url}</a></section>
      {data ? (
        <section className="mt-6 grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-bold">Ingevulde gegevens</h2><p className="text-sm text-slate-600">Ingediend op {formatDate(application.submittedAt)}</p></div>
            <div className="grid w-full gap-3 sm:w-auto sm:min-w-64">
              <form action={updateFuneralPdfDetails} className="grid gap-4 rounded-lg border border-sky-200 bg-sky-50 p-4 sm:min-w-[28rem]">
                <input name="id" type="hidden" value={application.id} />
                <div>
                  <h3 className="font-bold text-slate-900">Gegevens voor de PDF-bestanden</h3>
                  <p className="mt-1 text-sm text-slate-600">Sla deze gegevens eerst op. De drie downloads hieronder worden daarna automatisch bijgewerkt.</p>
                </div>
                {query.pdfDetails === "saved" ? <p className="rounded-md bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">Opgeslagen. De PDF-bestanden zijn bijgewerkt.</p> : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">Datum begrafenis<input className="min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900" defaultValue={data.funeralDate ?? ""} name="funeralDate" type="date" /></label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">Tijd begrafenis<input className="min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900" defaultValue={data.funeralTime ?? ""} name="funeralTime" type="time" /></label>
                </div>
                <label className="grid gap-1 text-sm font-semibold text-slate-700">Kist registratienummer<input className="min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900" defaultValue={data.coffinRegistrationNumber ?? ""} name="coffinRegistrationNumber" placeholder="Bijvoorbeeld: 11-20261003-001" type="text" /></label>
                <button className="rounded-md bg-[#1483d6] px-4 py-3 font-semibold text-white" type="submit">Opslaan en PDF-bestanden bijwerken</button>
              </form>
              <a className="rounded-md bg-[#1483d6] px-4 py-3 text-center font-semibold text-white" href={`/admin/settings/funeral-applications/${application.id}/pdf?view=1`} rel="noreferrer" target="_blank">Gegevens-PDF openen / markeren</a>
              <a className="rounded-md bg-[#0f766e] px-4 py-3 text-center font-semibold text-white" href={`/admin/settings/funeral-applications/${application.id}/avg-pdf?view=1`} rel="noreferrer" target="_blank">AVG-PDF openen / markeren</a>
              <a className="rounded-md bg-[#0f5f9f] px-4 py-3 text-center font-semibold text-white" href={`/admin/settings/funeral-applications/${application.id}/avg-mail-pdf?view=1`} rel="noreferrer" target="_blank">AVG-mail-PDF openen / markeren</a>
              <ShareAvgMailPdf applicationId={application.id} filename={`AVG-${data.deceasedFirstName}-${data.deceasedLastName}-om-te-mailen.pdf`} />
              <p className="rounded-md bg-slate-100 p-3 text-xs leading-5 text-slate-600">Op iPhone: open de PDF en gebruik de deelknop of Markering om te schrijven, tekenen, ondertekenen en een bewerkte kopie in Bestanden te bewaren.</p>
              {application.documents.map(document => <a className="rounded-md border border-slate-300 bg-white px-4 py-3 text-center font-semibold text-[#0f5f9f]" href={`/admin/settings/funeral-applications/${application.id}/documents/${document.id}`} key={document.id}>{documentLabel(document.kind)} downloaden</a>)}
            </div>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div><dt className="text-sm text-slate-500">BSN aanwezig</dt><dd className="font-semibold">{data.hasBsn ? "Ja" : "Nee"}</dd></div>
            <div><dt className="text-sm text-slate-500">Ongeboren kind onder 24 weken</dt><dd className="font-semibold">{data.unbornUnder24Weeks === null ? "Niet van toepassing" : data.unbornUnder24Weeks ? "Ja" : "Nee"}</dd></div>
            <div><dt className="text-sm text-slate-500">Overledene</dt><dd className="font-semibold">{data.deceasedFirstName} {data.deceasedLastName}</dd></div>
            <div><dt className="text-sm text-slate-500">Aanvrager</dt><dd className="font-semibold">{data.applicantFirstName} {data.applicantLastName}</dd></div>
            <div><dt className="text-sm text-slate-500">Telefoon</dt><dd>{data.applicantPhone}</dd></div>
            <div><dt className="text-sm text-slate-500">E-mail</dt><dd>{data.applicantEmail}</dd></div>
            <div><dt className="text-sm text-slate-500">Begraafplaats</dt><dd>{data.burialLocation}</dd></div>
            <div><dt className="text-sm text-slate-500">Grafkeuze</dt><dd>{data.gravePeriod} - {data.graveType}</dd></div>
          </dl>
        </section>
      ) : null}
      <form action={deleteFuneralApplication} className="mt-8 border-t border-slate-200 pt-6"><input name="id" type="hidden" value={application.id} /><button className="rounded-md border border-red-300 px-4 py-3 font-semibold text-red-700" type="submit">Aanvraag en link verwijderen</button></form>
    </main>
  );
}
