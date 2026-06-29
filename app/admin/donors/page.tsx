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
  ["Inactief", "INACTIVE"],
  ["Actie vereist", "ACTION_REQUIRED"],
  ["Afgewezen", "REJECTED"],
  ["Overleden", "DECEASED"]
] as const;

type StatusFilter = (typeof statusFilters)[number][1];

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getStatusWhere(status: StatusFilter | "INACTIVE_OR_PAYMENT_REQUIRED"): Prisma.DonorProfileWhereInput | undefined {
  if (status === "INACTIVE_OR_PAYMENT_REQUIRED") {
    return {
      OR: [
        { status: "INACTIVE" },
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

export default async function DonorsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; status?: string | string[] }> }) {
  const params = await searchParams;
  const q = firstParam(params.q).trim();
  const rawStatus = firstParam(params.status);
  const normalizedRawStatus = rawStatus === "INACTIVE_OR_PAYMENT_REQUIRED" ? "INACTIVE" : rawStatus;
  const selectedStatus = statusFilters.some(([, value]) => value === normalizedRawStatus) ? (normalizedRawStatus as StatusFilter) : "";
  const selectedLabel = statusFilters.find(([, value]) => value === selectedStatus)?.[0] ?? "Alle donateurs";
  const normalizedIban = normalizeIban(q);
  const typedStatus = Object.values(DonorStatus).find((item) => item === q.toUpperCase());
  const statusWhere = getStatusWhere(selectedStatus);
  const donorListWhere: Prisma.DonorProfileWhereInput = { registrationNumber: { not: null } };
  const searchWhere: Prisma.DonorProfileWhereInput | undefined = q
    ? {
        OR: [
          { registrationNumber: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { familyMembers: { some: { firstName: { contains: q, mode: "insensitive" } } } },
          { familyMembers: { some: { lastName: { contains: q, mode: "insensitive" } } } },
          { iban: { contains: normalizedIban, mode: "insensitive" } },
          ...(typedStatus ? [{ status: typedStatus }] : [])
        ]
      }
    : undefined;
  const where: Prisma.DonorProfileWhereInput =
    statusWhere && searchWhere
      ? { AND: [donorListWhere, statusWhere, searchWhere] }
      : statusWhere
        ? { AND: [donorListWhere, statusWhere] }
        : searchWhere
          ? { AND: [donorListWhere, searchWhere] }
          : donorListWhere;
  const donors = await prisma.donorProfile.findMany({
    where,
    include: { user: true, familyMembers: true, paymentObligations: true },
    orderBy: [{ registrationNumber: "asc" }, { createdAt: "desc" }]
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#1483d6]">Ledenbestand</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Donateurs</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">{selectedLabel}: {donors.length}</p>
        </div>
        <Link className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-800 hover:bg-slate-100" href="/admin">
          Terug naar dashboard
        </Link>
      </div>
      <form className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        {selectedStatus ? <input name="status" type="hidden" value={selectedStatus} /> : null}
        <input name="q" defaultValue={q} placeholder="Zoek op lidnummer, naam of IBAN" />
        <button className="rounded-lg bg-[#1483d6] px-5 py-3 font-bold text-white shadow-sm hover:bg-[#0f5f9f]" type="submit">Zoeken</button>
      </form>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        {statusFilters.map(([label, value]) => (
          <Link
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              value === selectedStatus
                ? "border-[#1483d6] bg-[#1483d6] text-white shadow-sm"
                : "border-slate-300 bg-white text-slate-800 hover:border-[#1483d6]/40 hover:bg-sky-50"
            }`}
            href={value ? `/admin/donors?status=${value}` : "/admin/donors"}
            key={value || "all"}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
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
              const primaryContact = donor.familyMembers.find((member) => member.relationship === "Primaire contactpersoon" && member.status === "ACTIVE_DEPENDENT");
              const displayName = primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : `${donor.firstName} ${donor.lastName}`;
              return (
                <tr className="border-t border-slate-200 align-top hover:bg-sky-50/40" key={donor.id}>
                  <td className="p-3 font-semibold">{donor.registrationNumber ?? "-"}</td>
                  <td className="p-3">
                    <p className="font-semibold">{displayName}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {primaryContact ? <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-bold text-teal-800">Primair contact</span> : null}
                      {primaryContact ? <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">Oorspronkelijk: {donor.firstName} {donor.lastName}</span> : null}
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
                      <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-bold text-[#0f5f9f]">
                        {formatCurrency(paidTotal)} ontvangen
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <Link className="font-bold text-[#0f5f9f] hover:text-[#0b1b33]" href={`/admin/donors/${donor.id}`}>Profiel</Link>
                      <Link className="font-bold text-[#0f5f9f] hover:text-[#0b1b33]" href={`/admin/donors/${donor.id}/financial`}>Financieel</Link>
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
