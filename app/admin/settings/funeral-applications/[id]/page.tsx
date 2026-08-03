import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";
import { formatDate } from "@/lib/display";
import type { FuneralFormData } from "@/lib/funeral-application";
import { CopyLink } from "../CopyLink";
import { deleteFuneralApplication } from "../actions";

export const dynamic = "force-dynamic";
export default async function FuneralApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const application = await prisma.funeralApplication.findUnique({ where: { id } });
  if (!application) notFound();
  const data = application.formData as FuneralFormData | null;
  const url = absoluteUrl(`/begrafenisaanvraag/${application.accessToken}`);
  return <main className="mx-auto max-w-5xl px-4 py-10"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-[#0f766e]">Begrafenisaanvraag</p><h1 className="text-3xl font-bold text-slate-900">{data ? `${data.deceasedFirstName} ${data.deceasedLastName}` : "Nieuwe invullink"}</h1><p className="mt-2 text-slate-700">Status: <strong>{application.status === "SUBMITTED" ? "Ingediend" : "Nog niet ingevuld"}</strong></p></div><CopyLink url={url} /></div><section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">Openbare invullink</p><a className="mt-1 block break-all font-semibold text-[#0f5f9f] underline" href={url} rel="noreferrer" target="_blank">{url}</a></section>{data ? <section className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Ingevulde gegevens</h2><p className="text-sm text-slate-600">Ingediend op {formatDate(application.submittedAt)}</p></div><a className="rounded-md bg-[#1483d6] px-4 py-3 font-semibold text-white" href={`/admin/settings/funeral-applications/${application.id}/pdf`}>Ingevulde PDF downloaden</a></div><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-sm text-slate-500">Overledene</dt><dd className="font-semibold">{data.deceasedFirstName} {data.deceasedLastName}</dd></div><div><dt className="text-sm text-slate-500">Aanvrager</dt><dd className="font-semibold">{data.applicantFirstName} {data.applicantLastName}</dd></div><div><dt className="text-sm text-slate-500">Telefoon</dt><dd>{data.applicantPhone}</dd></div><div><dt className="text-sm text-slate-500">E-mail</dt><dd>{data.applicantEmail}</dd></div><div><dt className="text-sm text-slate-500">Begraafplaats</dt><dd>{data.burialLocation}</dd></div><div><dt className="text-sm text-slate-500">Grafkeuze</dt><dd>{data.gravePeriod} - {data.graveType}</dd></div></dl></section> : null}<form action={deleteFuneralApplication} className="mt-8 border-t border-slate-200 pt-6"><input name="id" type="hidden" value={application.id} /><button className="rounded-md border border-red-300 px-4 py-3 font-semibold text-red-700" type="submit">Aanvraag en link verwijderen</button></form></main>;
}
