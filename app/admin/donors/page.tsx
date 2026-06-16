import Link from "next/link";
import { DonorStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatIban, normalizeIban } from "@/lib/iban";
import { formatCurrency } from "@/lib/display";
import { donorStatusBadgeClass, donorStatusLabel } from "@/lib/labels";
import { isNearlyEighteen } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const statusFilters = [
  ["Alle donateurs", ""],
  ["Actieve donateurs", "ACTIVE"],
  ["Inactief / betaling afwachtend", "INACTIVE_OR_PAYMENT_REQUIRED"],
  ["Actie vereist", "ACTION_REQUIRED"],
  ["Afgewezen", "REJECTED"],
  ["Overleden", "DECEASED"]
] as const;

type StatusFilter = (typeof statusFilters)[number][1];

function getStatusWhere(status: StatusFilter): Prisma.DonorProfileWhereInput | undefined {
  if (status === "INACTIVE_OR_PAYMENT_REQUIRED") {
    return {
      OR: [
        { status: { in: ["INACTIVE", "PAYMENT_REQUIRED"] } },
        { paymentObligations: { some: { status: "DUE", obligationType: "ANNUAL" } } }
      ]
    };
  }
  if (status === "ACTIVE") {
    return { status: "ACTIVE", NOT: { paymentObligations: { some: { status: "DUE", obligationType: "ANNUAL" } } } };
  }
  if (status && Object.values(DonorStatus).includes(status as DonorStatus)) {
    return { status: status as DonorStatus };
  }
  return undefined;
}

export default async function DonorsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status: rawStatus = "" } = await searchParams;
  const selectedStatus = statusFilters.some(([, value]) => value === rawStatus) ? (rawStatus as StatusFilter) : "";
  const selectedLabel = statusFilters.find(([, value]) => value === selectedStatus)?.[0] ?? "Alle donateurs";
  const normalizedIban = normalizeIban(q);
  const typedStatus = Object.values(DonorStatus).find((item) => item === q.toUpperCase());
  const statusWhere = getStatusWhere(selectedStatus);
  const searchWhere: Prisma.DonorProfileWhereInput | undefined = q
    ? {
        OR: [
          { registrationNumber: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { iban: { contains: normalizedIban, mode: "insensitive" } },
          ...(typedStatus ? [{ status: typedStatus }] : [])
        ]
      }
    : undefined;
  const where: Prisma.DonorProfileWhereInput | undefined =
    statusWhere && searchWhere ? { AND: [statusWhere, searchWhere] } : statusWhere ?? searchWhere;
  const donors = await prisma.donorProfile.findMany({
    where,
    include: { user: true, familyMembers: true, paymentObligations: true },
    orderBy: [{ registrationNumber: "asc" }, { createdAt: "desc" }]
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Ledenbestand</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Donateurs</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">{selectedLabel}: {donors.length}</p>
        </div>
        <Link className="rounded-md border border-slate-300 px-4 py-2 font-bold text-slate-800 hover:bg-slate-100" href="/admin">
          Terug naar dashboard
        </Link>
      </div>
      <form className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        {selectedStatus ? <input name="status" type="hidden" value={selectedStatus} /> : null}
        <input name="q" defaultValue={q} placeholder="Zoek op lidnummer, naam of IBAN" />
        <button className="rounded-md bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800" type="submit">Zoeken</button>
      </form>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        {statusFilters.map(([label, value]) => (
          <Link
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${
              value === selectedStatus
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
            }`}
            href={value ? `/admin/donors?status=${value}` : "/admin/donors"}
            key={value || "all"}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3">Lidnummer</th>
              <th className="p-3">Naam</th>
              <th className="p-3">IBAN</th>
              <th className="p-3">Status</th>
              <th className="p-3">Betaalstatus</th>
              <th className="p-3">Acties</th>
            </tr>
          </thead>
          <tbody>
            {donors.map((donor) => {
              const dueItems = donor.paymentObligations.filter((item) => item.status === "DUE");
              const paidTotal = donor.paymentObligations
                .filter((item) => item.status === "PAID")
                .reduce((sum, item) => sum + item.amountCents, 0);
              const hasNearlyAdultChild = donor.familyMembers.some((member) => member.type === "CHILD" && member.isActive && isNearlyEighteen(member.dateOfBirth));
              return (
                <tr className="border-t border-slate-200 align-top hover:bg-slate-50" key={donor.id}>
                  <td className="p-3 font-semibold">{donor.registrationNumber ?? "-"}</td>
                  <td className="p-3">
                    <p className="font-semibold">{donor.firstName} {donor.lastName}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {hasNearlyAdultChild ? <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">Kind bijna 18</span> : null}
                      {dueItems.some((item) => item.obligationType === "ANNUAL") ? <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-800">Jaarbetaling open</span> : null}
                    </div>
                  </td>
                  <td className="p-3">{formatIban(donor.iban)}</td>
                  <td className="p-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-bold ${donorStatusBadgeClass(donor.status)}`}>
                      {donorStatusLabel(donor.status)}
                    </span>
                  </td>
                  <td className="p-3">
                    {dueItems.length ? (
                      <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-800">
                        {formatCurrency(dueItems.reduce((sum, item) => sum + item.amountCents, 0))} open
                      </span>
                    ) : donor.paymentObligations.length ? (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">
                        {formatCurrency(paidTotal)} ontvangen
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <Link className="font-bold text-emerald-800 hover:text-emerald-950" href={`/admin/donors/${donor.id}`}>Profiel</Link>
                      <Link className="font-bold text-emerald-800 hover:text-emerald-950" href={`/admin/donors/${donor.id}/financial`}>Financieel</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {donors.length === 0 ? (
              <tr>
                <td className="p-6 text-center text-slate-600" colSpan={6}>
                  Geen donateurs gevonden.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
