import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { syncAdultChildTransitions } from "@/lib/adult-child-transitions";
import { formatCurrency, formatDate } from "@/lib/display";
import { donorStatusBadgeClass, donorStatusLabel } from "@/lib/labels";
import { canManageDonors } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { oneTimePaymentDaysRemaining } from "@/lib/pricing";

export const dynamic = "force-dynamic";

type Priority = "danger" | "warning" | "success" | "neutral";

function priorityClass(priority: Priority) {
  if (priority === "danger") return "border-red-200 bg-red-50 text-red-950";
  if (priority === "warning") return "border-amber-200 bg-amber-50 text-amber-950";
  if (priority === "success") return "border-teal-200 bg-teal-50 text-teal-950";
  return "border-slate-200 bg-white text-slate-950";
}

function badgeClass(priority: Priority) {
  if (priority === "danger") return "bg-red-700 text-white";
  if (priority === "warning") return "bg-amber-500 text-amber-950";
  if (priority === "success") return "bg-[#0f766e] text-white";
  return "bg-slate-200 text-slate-800";
}

function noteValue(notes: string | null, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return notes?.match(new RegExp(`^${escaped}:\\s*(.+)$`, "im"))?.[1]?.trim() ?? "";
}

function paymentAccount(notes: string | null) {
  return noteValue(notes, "Betaalrekening") || noteValue(notes, "IBAN betaler");
}

function paymentYear(item: { paidAt: Date | null; dueDate: Date | null; createdAt: Date; notes: string | null }) {
  const yearFromNotes = item.notes?.match(/\bContributiejaar:\s*(20\d{2})\b/i)?.[1];
  if (yearFromNotes) return Number(yearFromNotes);
  return (item.paidAt ?? item.dueDate ?? item.createdAt).getFullYear();
}

function Section({
  title,
  count,
  priority,
  children,
  href
}: {
  title: string;
  count: number;
  priority: Priority;
  children: ReactNode;
  href?: string;
}) {
  return (
    <details className={`group rounded-xl border p-5 shadow-sm ${priorityClass(priority)}`} open={count > 0}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="text-lg font-black transition group-open:rotate-90">›</span>
          <span className="text-xl font-black">{title}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className={`rounded-md px-3 py-1 text-sm font-black ${badgeClass(priority)}`}>{count}</span>
          {href ? (
            <Link className="rounded-md border border-current px-3 py-1 text-sm font-bold hover:bg-white/70" href={href}>
              Openen
            </Link>
          ) : null}
        </span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export default async function ControlCenterPage() {
  const session = await auth();
  if (!canManageDonors(session?.user.role)) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-black text-slate-950">Geen toegang</h1>
      </main>
    );
  }

  await syncAdultChildTransitions();

  const currentYear = new Date().getFullYear();
  const [
    pendingRegistrations,
    actionRegistrations,
    donorsWithDuePayments,
    donorsWithActionStatus,
    adultTransitions,
    guardianNeeded,
    oneTimeDueDonors,
    importedBankPayments,
    deceasedWithoutFamilyNote
  ] = await Promise.all([
    prisma.registrationRequest.count({ where: { status: "PENDING" } }),
    prisma.registrationRequest.count({ where: { status: "ACTION_REQUIRED" } }),
    prisma.donorProfile.findMany({
      where: {
        registrationNumber: { not: null },
        paymentObligations: { some: { status: "DUE", amountCents: { gt: 0 } } }
      },
      include: { paymentObligations: true },
      orderBy: [{ status: "asc" }, { registrationNumber: "asc" }],
      take: 25
    }),
    prisma.donorProfile.findMany({
      where: { registrationNumber: { not: null }, status: { in: ["ACTION_REQUIRED", "INACTIVE"] } },
      orderBy: [{ status: "asc" }, { registrationNumber: "asc" }],
      take: 20
    }),
    prisma.adultChildTransition.findMany({
      where: { status: { in: ["NEEDS_REGISTRATION", "INVITED"] } },
      include: { familyMember: true, previousDonorProfile: true },
      orderBy: { turned18At: "asc" },
      take: 20
    }),
    prisma.donorProfile.findMany({
      where: {
        status: "DECEASED",
        familyMembers: { some: { type: "CHILD", status: "UNDER_18" } },
        NOT: { familyMembers: { some: { type: "PARTNER", status: "ACTIVE_DEPENDENT" } } }
      },
      include: { familyMembers: true },
      orderBy: { updatedAt: "desc" },
      take: 20
    }),
    prisma.donorProfile.findMany({
      where: {
        registrationNumber: { not: null },
        paymentObligations: { some: { status: "DUE", obligationType: "ONE_TIME", amountCents: { gt: 0 } } }
      },
      include: { paymentObligations: true },
      orderBy: { approvedAt: "asc" },
      take: 25
    }),
    prisma.paymentObligation.findMany({
      where: { source: "IMPORT_BANK_EXCEL", status: "PAID" },
      include: { donorProfile: true },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 250
    }),
    prisma.donorProfile.findMany({
      where: {
        registrationNumber: { not: null },
        status: "DECEASED",
        statusInternalNote: null
      },
      orderBy: { updatedAt: "desc" },
      take: 20
    })
  ]);

  const duePaymentRows = donorsWithDuePayments.map((donor) => {
    const dueItems = donor.paymentObligations.filter((item) => item.status === "DUE" && item.amountCents > 0);
    const annualDue = dueItems.filter((item) => item.obligationType === "ANNUAL" && paymentYear(item) === currentYear).reduce((sum, item) => sum + item.amountCents, 0);
    return {
      donor,
      total: dueItems.reduce((sum, item) => sum + item.amountCents, 0),
      annualDue
    };
  });

  const oneTimeWatch = oneTimeDueDonors
    .map((donor) => {
      const daysRemaining = oneTimePaymentDaysRemaining(donor.approvedAt);
      const due = donor.paymentObligations.filter((item) => item.status === "DUE" && item.obligationType === "ONE_TIME").reduce((sum, item) => sum + item.amountCents, 0);
      return { donor, daysRemaining, due };
    })
    .filter((item) => item.daysRemaining === null || item.daysRemaining <= 90);

  const seenPayments = new Map<string, typeof importedBankPayments[number]>();
  const duplicateBankPayments: typeof importedBankPayments = [];
  for (const item of importedBankPayments) {
    const payerIban = paymentAccount(item.notes).replace(/\s/g, "").toUpperCase();
    const key = [item.lidnummer ?? item.donorProfile.registrationNumber ?? "", item.amountCents, item.paidAt?.toISOString().slice(0, 10) ?? "", payerIban].join("|");
    if (seenPayments.has(key)) duplicateBankPayments.push(item);
    else seenPayments.set(key, item);
  }

  const totalCritical =
    pendingRegistrations +
    actionRegistrations +
    duePaymentRows.filter((item) => item.total > 0).length +
    adultTransitions.length +
    guardianNeeded.length +
    oneTimeWatch.filter((item) => item.daysRemaining !== null && item.daysRemaining <= 0).length +
    duplicateBankPayments.length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-[#1483d6]">Dagelijkse controle</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-950">Controlecentrum</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Een centrale werklijst voor registraties, betalingen, importsignalen en gezinswijzigingen.
            </p>
          </div>
          <div className={`rounded-md px-4 py-3 text-sm font-black ${totalCritical > 0 ? "bg-red-50 text-red-800" : "bg-teal-50 text-[#0f5f9f]"}`}>
            {totalCritical} aandachtspunt(en)
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-[#1483d6]/40" href="/admin/registrations">
          <p className="text-sm font-bold text-slate-600">Registraties</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{pendingRegistrations + actionRegistrations}</p>
        </Link>
        <Link className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-[#1483d6]/40" href="/admin/donors?status=INACTIVE">
          <p className="text-sm font-bold text-slate-600">Betalingen open</p>
          <p className="mt-2 text-3xl font-black text-red-700">{duePaymentRows.length}</p>
        </Link>
        <Link className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-[#1483d6]/40" href="/admin/family-transitions">
          <p className="text-sm font-bold text-slate-600">Gezinswijzigingen</p>
          <p className="mt-2 text-3xl font-black text-amber-700">{adultTransitions.length + guardianNeeded.length}</p>
        </Link>
        <Link className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-[#1483d6]/40" href="/admin/import">
          <p className="text-sm font-bold text-slate-600">Importcontrole</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{duplicateBankPayments.length}</p>
        </Link>
      </section>

      <div className="mt-6 grid gap-5">
        <Section count={pendingRegistrations + actionRegistrations} href="/admin/registrations" priority={pendingRegistrations + actionRegistrations ? "danger" : "success"} title="Registraties en correcties">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link className="rounded-md border border-current bg-white/60 p-4 font-bold" href="/admin/registrations">
              Nieuwe aanvragen: {pendingRegistrations}
            </Link>
            <Link className="rounded-md border border-current bg-white/60 p-4 font-bold" href="/admin/registrations">
              Correcties nodig: {actionRegistrations}
            </Link>
          </div>
        </Section>

        <Section count={duePaymentRows.length} href="/admin/donors?status=INACTIVE" priority={duePaymentRows.length ? "danger" : "success"} title="Open betalingen">
          {duePaymentRows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-white/70 text-slate-700">
                  <tr>
                    <th className="p-3">Lid</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Open totaal</th>
                    <th className="p-3">Jaarbetaling {currentYear}</th>
                    <th className="p-3">Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {duePaymentRows.map(({ donor, total, annualDue }) => (
                    <tr className="border-t border-red-200" key={donor.id}>
                      <td className="p-3 font-bold">{donor.firstName} {donor.lastName} - {donor.registrationNumber}</td>
                      <td className="p-3">
                        <span className={`rounded-md px-2 py-1 text-xs font-bold ${donorStatusBadgeClass(donor.status)}`}>{donorStatusLabel(donor.status)}</span>
                      </td>
                      <td className="p-3 font-black text-red-800">{formatCurrency(total)}</td>
                      <td className="p-3">{annualDue > 0 ? formatCurrency(annualDue) : "-"}</td>
                      <td className="p-3">
                        <Link className="font-black text-[#0f5f9f] underline" href={`/admin/donors/${donor.id}/financial`}>Financieel openen</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-md bg-white/70 p-4 text-sm font-semibold">Geen open betalingsposten gevonden.</p>
          )}
        </Section>

        <Section count={oneTimeWatch.length} priority={oneTimeWatch.some((item) => item.daysRemaining !== null && item.daysRemaining <= 0) ? "danger" : oneTimeWatch.length ? "warning" : "success"} title="Eenmalige bijdrage termijn">
          {oneTimeWatch.length ? (
            <div className="grid gap-3">
              {oneTimeWatch.map(({ donor, daysRemaining, due }) => (
                <Link className="rounded-md border border-current bg-white/60 p-4 hover:bg-white" href={`/admin/donors/${donor.id}/financial`} key={donor.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black">{donor.firstName} {donor.lastName} - {donor.registrationNumber}</p>
                    <p className={daysRemaining !== null && daysRemaining <= 0 ? "font-black text-red-800" : "font-black text-amber-800"}>
                      {daysRemaining === null ? "Geen goedkeurdatum" : daysRemaining <= 0 ? `${Math.abs(daysRemaining)} dagen verlopen` : `${daysRemaining} dagen over`}
                    </p>
                  </div>
                  <p className="mt-1 text-sm">Open eenmalig: {formatCurrency(due)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-white/70 p-4 text-sm font-semibold">Geen eenmalige bijdragen die binnen 90 dagen aandacht vragen.</p>
          )}
        </Section>

        <Section count={adultTransitions.length + guardianNeeded.length} href="/admin/family-transitions" priority={adultTransitions.length + guardianNeeded.length ? "warning" : "success"} title="Gezinswijzigingen">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-current bg-white/60 p-4">
              <p className="font-black">18+ inschrijving nodig: {adultTransitions.length}</p>
              <div className="mt-3 grid gap-2 text-sm">
                {adultTransitions.slice(0, 5).map((item) => (
                  <p key={item.id}>
                    {item.familyMember.firstName} {item.familyMember.lastName}, oud gezin {item.previousDonorProfile.registrationNumber}, 18 op {formatDate(item.turned18At)}
                  </p>
                ))}
                {!adultTransitions.length ? <p>Geen open 18+ inschrijvingen.</p> : null}
              </div>
            </div>
            <div className="rounded-md border border-current bg-white/60 p-4">
              <p className="font-black">Voogd/contact nodig: {guardianNeeded.length}</p>
              <div className="mt-3 grid gap-2 text-sm">
                {guardianNeeded.slice(0, 5).map((donor) => (
                  <Link className="underline" href={`/admin/donors/${donor.id}?tab=family`} key={donor.id}>
                    {donor.firstName} {donor.lastName} - {donor.registrationNumber}
                  </Link>
                ))}
                {!guardianNeeded.length ? <p>Geen huishoudens zonder actieve ouder.</p> : null}
              </div>
            </div>
          </div>
        </Section>

        <Section count={duplicateBankPayments.length} href="/admin/import" priority={duplicateBankPayments.length ? "warning" : "success"} title="Bankimport controle">
          <p className="rounded-md bg-white/70 p-4 text-sm font-semibold">
            Importregels zonder lidnummer of met onbekend lidnummer worden in de importpreview tegengehouden. Deze lijst toont alleen blijvende signalen uit verwerkte bankbetalingen.
          </p>
          {duplicateBankPayments.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-white/70 text-slate-700">
                  <tr>
                    <th className="p-3">Lid</th>
                    <th className="p-3">Datum</th>
                    <th className="p-3">Bedrag</th>
                    <th className="p-3">Betaalrekening</th>
                    <th className="p-3">Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicateBankPayments.slice(0, 20).map((item) => (
                    <tr className="border-t border-amber-200" key={item.id}>
                      <td className="p-3 font-bold">{item.donorProfile.registrationNumber} - {item.donorProfile.firstName} {item.donorProfile.lastName}</td>
                      <td className="p-3">{formatDate(item.paidAt)}</td>
                      <td className="p-3 font-bold">{formatCurrency(item.amountCents)}</td>
                      <td className="p-3">{paymentAccount(item.notes) || "-"}</td>
                      <td className="p-3">
                        <Link className="font-black text-[#0f5f9f] underline" href={`/admin/donors/${item.donorProfileId}/financial`}>Historie bekijken</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Section>

        <Section count={donorsWithActionStatus.length + deceasedWithoutFamilyNote.length} href="/admin/donors?status=ACTION_REQUIRED" priority={donorsWithActionStatus.length + deceasedWithoutFamilyNote.length ? "warning" : "success"} title="Statuscontrole">
          <div className="grid gap-3">
            {donorsWithActionStatus.slice(0, 12).map((donor) => (
              <Link className="rounded-md border border-current bg-white/60 p-4 hover:bg-white" href={`/admin/donors/${donor.id}`} key={donor.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-black">{donor.firstName} {donor.lastName} - {donor.registrationNumber}</p>
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${donorStatusBadgeClass(donor.status)}`}>{donorStatusLabel(donor.status)}</span>
                </div>
              </Link>
            ))}
            {deceasedWithoutFamilyNote.slice(0, 8).map((donor) => (
              <Link className="rounded-md border border-current bg-white/60 p-4 hover:bg-white" href={`/admin/donors/${donor.id}`} key={donor.id}>
                <p className="font-black">{donor.firstName} {donor.lastName} - {donor.registrationNumber}</p>
                <p className="mt-1 text-sm">Overleden zonder interne verwerkingsnotitie. Controleer gezin/contactpersoon.</p>
              </Link>
            ))}
            {!donorsWithActionStatus.length && !deceasedWithoutFamilyNote.length ? (
              <p className="rounded-md bg-white/70 p-4 text-sm font-semibold">Geen statuspunten gevonden.</p>
            ) : null}
          </div>
        </Section>
      </div>
    </main>
  );
}
