import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { auth } from "@/lib/auth";
import { displayEmail, formatCurrency, formatDate } from "@/lib/display";
import { formatIban } from "@/lib/iban";
import { donorStatusBadgeClass, donorStatusLabel, obligationTypeLabel, paymentStatusBadgeClass, paymentStatusLabel } from "@/lib/labels";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { updateDonorStatus } from "./actions";

export const dynamic = "force-dynamic";

const tabs = [
  ["Profiel", "profile"],
  ["Gezin", "family"],
  ["Betalingen", "payments"],
  ["Wijzigingen", "changes"],
  ["Statushistorie", "history"]
] as const;

type TabKey = (typeof tabs)[number][1];

export default async function DonorDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const [{ id }, query, session] = await Promise.all([params, searchParams, auth()]);
  const activeTab: TabKey = tabs.some(([, value]) => value === query.tab) ? (query.tab as TabKey) : "profile";
  const donor = await prisma.donorProfile.findUnique({
    where: { id },
    include: {
      user: true,
      familyMembers: { orderBy: [{ type: "asc" }, { dateOfBirth: "asc" }] },
      paymentObligations: { orderBy: { createdAt: "desc" } },
      changeRequests: { orderBy: { createdAt: "desc" }, take: 8 },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 12, include: { changedBy: true } }
    }
  });

  if (!donor) {
    notFound();
  }

  const paidTotal = donor.paymentObligations.filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.amountCents, 0);
  const dueTotal = donor.paymentObligations.filter((item) => item.status === "DUE").reduce((sum, item) => sum + item.amountCents, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <BackButton fallbackHref="/admin/donors" />
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">{donor.firstName} {donor.lastName} - {donor.registrationNumber ?? "geen lidnummer"}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-3 py-2 text-sm font-bold ${donorStatusBadgeClass(donor.status)}`}>
              {donorStatusLabel(donor.status)}
            </span>
            {dueTotal > 0 ? <span className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{formatCurrency(dueTotal)} open</span> : null}
            {paidTotal > 0 ? <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{formatCurrency(paidTotal)} ontvangen</span> : null}
          </div>
        </div>
        <Link className="inline-flex rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white" href={`/admin/donors/${donor.id}/financial`}>
          Financieel overzicht
        </Link>
      </div>

      {query.error ? <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 font-semibold text-red-800">{query.error}</p> : null}

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div>
          <nav className="flex flex-wrap gap-2">
            {tabs.map(([label, value]) => (
              <Link
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  activeTab === value ? "border-emerald-700 bg-emerald-700 text-white" : "border-stone-300 bg-white text-slate-800 hover:bg-stone-100"
                }`}
                href={`/admin/donors/${donor.id}?tab=${value}`}
                key={value}
              >
                {label}
              </Link>
            ))}
          </nav>

          {activeTab === "profile" ? (
            <section className="mt-4 grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-2">
              {donor.registrationNumber ? <p><strong>Lidnummer:</strong> {donor.registrationNumber}</p> : null}
              <p><strong>Status sinds:</strong> {formatDate(donor.statusChangedAt)}</p>
              <p><strong>Actief sinds:</strong> {formatDate(donor.activeSince)}</p>
              <p><strong>Inactief sinds:</strong> {formatDate(donor.inactiveSince)}</p>
              <p><strong>Overleden sinds:</strong> {formatDate(donor.deceasedAt)}</p>
              <p><strong>E-mail:</strong> {displayEmail(donor.user.email)}</p>
              <p><strong>Telefoon:</strong> {donor.phone}</p>
              <p><strong>IBAN:</strong> {formatIban(donor.iban)}</p>
              <p><strong>Rekeninghouder:</strong> {donor.accountHolderName}</p>
              <p><strong>Geboortedatum:</strong> {donor.dateOfBirth.toLocaleDateString("nl-NL")}</p>
              <p><strong>Geboorteplaats:</strong> {donor.birthPlace}</p>
              <p><strong>Geslacht:</strong> {donor.gender ?? "-"}</p>
              <p className="sm:col-span-2"><strong>Adres:</strong> {donor.addressLine1}, {donor.postalCode} {donor.city}</p>
              <p className="sm:col-span-2"><strong>Uitvaartwensen:</strong> {donor.funeralWishes || "-"}</p>
              {donor.statusDonorMessage ? <p className="sm:col-span-2"><strong>Laatste externe statusnotitie:</strong> {donor.statusDonorMessage}</p> : null}
              {donor.statusInternalNote ? <p className="sm:col-span-2"><strong>Laatste interne statusnotitie:</strong> {donor.statusInternalNote}</p> : null}
            </section>
          ) : null}

          {activeTab === "family" ? (
            <section className="mt-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Gezin</h2>
              <div className="mt-4 grid gap-3">
                {donor.familyMembers.length ? (
                  donor.familyMembers.map((member) => (
                    <div className="rounded-md border border-stone-200 p-3" key={member.id}>
                      <p className="font-semibold">{member.type === "PARTNER" ? "Partner" : "Kind"}: {member.firstName} {member.lastName}</p>
                      <p className="mt-1 text-sm text-slate-600">Geboren: {formatDate(member.dateOfBirth)} {member.isActive ? "" : "- niet actief"}</p>
                    </div>
                  ))
                ) : (
                  <p>Geen gezinsleden geregistreerd.</p>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === "payments" ? (
            <section className="mt-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">Betalingen en verplichtingen</h2>
                <Link className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white" href={`/admin/donors/${donor.id}/financial`}>
                  Beheren
                </Link>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-stone-100 text-slate-700">
                    <tr>
                      <th className="p-3">Soort</th>
                      <th className="p-3">Bedrag</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Datum</th>
                      <th className="p-3">Bron</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donor.paymentObligations.length ? donor.paymentObligations.map((item) => (
                      <tr className="border-t border-stone-200" key={item.id}>
                        <td className="p-3 font-semibold">{obligationTypeLabel(item.obligationType)}</td>
                        <td className="p-3">{formatCurrency(item.amountCents)}</td>
                        <td className="p-3"><span className={`rounded-md px-2 py-1 text-xs font-bold ${paymentStatusBadgeClass(item.status)}`}>{paymentStatusLabel(item.status)}</span></td>
                        <td className="p-3">{formatDate(item.paidAt ?? item.dueDate)}</td>
                        <td className="p-3">{item.source || "-"}</td>
                      </tr>
                    )) : (
                      <tr><td className="p-4 text-slate-600" colSpan={5}>Geen betalingen of verplichtingen geregistreerd.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {activeTab === "changes" ? (
            <section className="mt-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Laatste wijzigingsverzoeken</h2>
              <div className="mt-4 grid gap-2">
                {donor.changeRequests.length ? donor.changeRequests.map((request) => <p key={request.id}>{request.changeType}: {request.status}</p>) : <p>Geen wijzigingsverzoeken.</p>}
              </div>
            </section>
          ) : null}

          {activeTab === "history" ? (
            <section className="mt-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Statusgeschiedenis</h2>
              <div className="mt-4 grid gap-3">
                {donor.statusHistory.length ? (
                  donor.statusHistory.map((item) => (
                    <details className="rounded-md border border-stone-200 p-3" key={item.id}>
                      <summary className="cursor-pointer font-semibold">{formatDate(item.createdAt)}: {donorStatusLabel(item.fromStatus) ?? "-"} naar {donorStatusLabel(item.toStatus)}</summary>
                      <p className="mt-2 text-sm text-slate-700">Door: {item.changedBy?.name ?? "-"}</p>
                      <p className="mt-2 text-sm"><strong>Intern:</strong> {item.internalNote}</p>
                      <p className="text-sm"><strong>Extern:</strong> {item.donorMessage}</p>
                    </details>
                  ))
                ) : (
                  <p>Geen statuswijzigingen geregistreerd.</p>
                )}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="grid gap-4 self-start">
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Kort overzicht</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div><dt className="font-semibold text-slate-600">Status</dt><dd className="mt-1 font-bold text-slate-900">{donorStatusLabel(donor.status)}</dd></div>
              <div><dt className="font-semibold text-slate-600">Open bedrag</dt><dd className={dueTotal > 0 ? "mt-1 font-bold text-red-700" : "mt-1 font-bold text-slate-900"}>{formatCurrency(dueTotal)}</dd></div>
              <div><dt className="font-semibold text-slate-600">Ontvangen</dt><dd className="mt-1 font-bold text-slate-900">{formatCurrency(paidTotal)}</dd></div>
            </dl>
          </section>
          {canManageSettings(session?.user.role) ? (
            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Status aanpassen</h2>
              <form action={updateDonorStatus} className="mt-4 grid gap-4">
                <input name="donorId" type="hidden" value={donor.id} />
                <label>
                  Nieuwe status
                  <select name="status" defaultValue={donor.status}>
                    <option value="ACTIVE">Actief</option>
                    <option value="INACTIVE">Inactief</option>
                    <option value="DECEASED">Overleden</option>
                  </select>
                </label>
                <label>Interne notitie<textarea name="internalNote" rows={3} required /></label>
                <label>Externe notitie voor donateur<textarea name="donorMessage" rows={3} required /></label>
                <button className="rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">Status opslaan</button>
              </form>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
