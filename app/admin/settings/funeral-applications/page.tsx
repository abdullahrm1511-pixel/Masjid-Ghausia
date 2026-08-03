import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/display";
import { createFuneralApplication } from "./actions";
import type { FuneralFormData } from "@/lib/funeral-application";

export const dynamic = "force-dynamic";

export default async function FuneralApplicationsPage() {
  const applications = await prisma.funeralApplication.findMany({ orderBy: { createdAt: "desc" } });
  return <main className="mx-auto max-w-6xl px-4 py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-[#0f766e]">Instellingen</p><h1 className="text-3xl font-bold text-slate-900">Begrafenisaanvragen</h1><p className="mt-2 text-slate-700">Maak een unieke link die op een telefoon kan worden ingevuld.</p></div><form action={createFuneralApplication}><button className="rounded-md bg-[#1483d6] px-4 py-3 font-semibold text-white">Nieuwe invullink maken</button></form></div><section className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">{applications.length ? <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="p-4">Aanvraag</th><th className="p-4">Status</th><th className="p-4">Aangemaakt</th><th className="p-4">Ingediend</th><th className="p-4"></th></tr></thead><tbody>{applications.map((item) => { const data = item.formData as FuneralFormData | null; return <tr className="border-t border-slate-200" key={item.id}><td className="p-4 font-semibold">{data ? `${data.deceasedFirstName} ${data.deceasedLastName}` : "Nog niet ingevuld"}</td><td className="p-4">{item.status === "SUBMITTED" ? "Ingediend" : "Open"}</td><td className="p-4">{formatDate(item.createdAt)}</td><td className="p-4">{formatDate(item.submittedAt)}</td><td className="p-4 text-right"><Link className="font-bold text-[#0f5f9f]" href={`/admin/settings/funeral-applications/${item.id}`}>Bekijken</Link></td></tr>; })}</tbody></table></div> : <div className="p-8 text-center text-slate-600">Er zijn nog geen aanvraaglinks aangemaakt.</div>}</section></main>;
}
