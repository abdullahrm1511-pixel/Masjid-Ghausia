import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { syncAdultChildTransitions } from "@/lib/adult-child-transitions";
import { auth } from "@/lib/auth";
import { displayEmail, formatCurrency, formatDate } from "@/lib/display";
import { familyMemberStatusBadgeClass, familyMemberStatusLabel } from "@/lib/family-status";
import { formatIban } from "@/lib/iban";
import { donorStatusBadgeClass, donorStatusLabel, obligationTypeLabel, paymentStatusBadgeClass, paymentStatusLabel } from "@/lib/labels";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { updateHouseholdStatuses } from "./actions";

export const dynamic = "force-dynamic";

const tabs = [
  ["Profiel", "profile"],
  ["Personalia", "personal"],
  ["Gezin", "family"],
  ["Betalingen", "payments"],
  ["Wijzigingen", "changes"],
  ["Statushistorie", "history"],
  ["Status aanpassen", "status"]
] as const;

type TabKey = (typeof tabs)[number][1];

function ageLabel(dateOfBirth: Date) {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const hasHadBirthday =
    today.getMonth() > dateOfBirth.getMonth() ||
    (today.getMonth() === dateOfBirth.getMonth() && today.getDate() >= dateOfBirth.getDate());
  if (!hasHadBirthday) age -= 1;
  return `${age} jaar`;
}

export default async function DonorDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const [{ id }, query, session] = await Promise.all([params, searchParams, auth()]);
  if (canManageSettings(session?.user.role)) await syncAdultChildTransitions();
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
  const dueTotal = donor.paymentObligations
    .filter((item) => item.status === "DUE" && item.amountCents > 0)
    .reduce((sum, item) => sum + item.amountCents, 0);
  const latestPayment = donor.paymentObligations.find((item) => item.status === "PAID" && item.paidAt);
  const paymentStatusText = dueTotal > 0 ? "Openstaand" : paidTotal > 0 ? "Betaald" : "Geen betaling";
  const isCancelledForNonPayment = donor.status === "INACTIVE" && /geannuleerd|niet betalen/i.test(donor.statusInternalNote ?? "");
  const partners = donor.familyMembers.filter((member) => member.type === "PARTNER");
  const children = donor.familyMembers.filter((member) => member.type === "CHILD");
  const visibleTabs = canManageSettings(session?.user.role) ? tabs : tabs.filter(([, value]) => value !== "status");
  const safeActiveTab: TabKey = visibleTabs.some(([, value]) => value === activeTab) ? activeTab : "profile";
  const displayedAmount = dueTotal > 0 ? dueTotal : paidTotal;
  const displayedAmountLabel = dueTotal > 0 ? "Open bedrag" : "Ontvangen";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <BackButton fallbackHref="/admin/donors" />
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Lidmaatschap</p>
          <h1 className="mt-1 text-4xl font-bold text-slate-900">{donor.registrationNumber ?? "Geen lidnummer"}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-3 py-2 text-sm font-bold ${donorStatusBadgeClass(donor.status)}`}>
              {donorStatusLabel(donor.status)}
            </span>
            {isCancelledForNonPayment ? <span className="rounded-md bg-red-100 px-3 py-2 text-sm font-bold text-red-900">Geannuleerd</span> : null}
            {dueTotal > 0 ? <span className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{formatCurrency(dueTotal)} open</span> : null}
            {paidTotal > 0 ? <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{formatCurrency(paidTotal)} ontvangen</span> : null}
          </div>
        </div>
        <Link className="inline-flex rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white" href={`/admin/donors/${donor.id}/financial`}>
          Financieel overzicht
        </Link>
      </div>

      <section className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Primair</p>
          <p className="mt-1 font-black text-slate-950">{donor.firstName} {donor.lastName}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Betaalstatus</p>
          <p className={`mt-1 font-black ${dueTotal > 0 ? "text-red-700" : paidTotal > 0 ? "text-emerald-800" : "text-slate-950"}`}>{paymentStatusText}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{displayedAmountLabel}</p>
          <p className={`mt-1 font-black ${dueTotal > 0 ? "text-red-700" : "text-slate-950"}`}>{formatCurrency(displayedAmount)}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Laatste betaling</p>
          <p className="mt-1 font-black text-slate-950">{formatDate(latestPayment?.paidAt)}</p>
        </div>
      </section>

      {query.error ? <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 font-semibold text-red-800">{query.error}</p> : null}

      <div className="mt-8">
        <div>
          <nav className="flex flex-wrap gap-2">
            {visibleTabs.map(([label, value]) => (
              <Link
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  safeActiveTab === value ? "border-emerald-700 bg-emerald-700 text-white" : "border-stone-300 bg-white text-slate-800 hover:bg-stone-100"
                }`}
                href={`/admin/donors/${donor.id}?tab=${value}`}
                key={value}
              >
                {label}
              </Link>
            ))}
          </nav>

          {safeActiveTab === "profile" ? (
            <section className="mt-4">
              <article className="grid gap-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_1.15fr_280px]">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-emerald-700">Primair</p>
                      <h2 className="mt-1 text-2xl font-black text-slate-950">{donor.firstName} {donor.lastName}</h2>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-xs font-bold ${donorStatusBadgeClass(donor.status)}`}>{donorStatusLabel(donor.status)}</span>
                  </div>
                  <dl className="mt-4 grid gap-2 text-sm">
                    <div><dt className="font-semibold text-slate-600">E-mail</dt><dd>{displayEmail(donor.user.email)}</dd></div>
                    <div><dt className="font-semibold text-slate-600">Telefoon</dt><dd>{donor.phone || "-"}</dd></div>
                    <div>
                      <dt className="font-semibold text-slate-600">Adres</dt>
                      <dd>{donor.addressLine1 || "-"}, {donor.postalCode || "-"} {donor.city || ""}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-md bg-slate-50 p-4">
                  {partners.length ? (
                    <div>
                      <h3 className="text-sm font-black uppercase text-sky-800">Partner</h3>
                      <div className="mt-2 grid gap-2">
                        {partners.map((partner) => (
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm" key={partner.id}>
                            <p className="font-bold text-slate-950">{partner.firstName} {partner.lastName} <span className="font-semibold text-slate-500">({ageLabel(partner.dateOfBirth)})</span></p>
                            <span className={`rounded-md px-2 py-1 text-xs font-bold ${familyMemberStatusBadgeClass(partner.status)}`}>
                              {familyMemberStatusLabel(partner.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className={partners.length ? "mt-5" : ""}>
                    <h3 className="text-sm font-black uppercase text-amber-800">Kinderen</h3>
                    {children.length ? (
                      <div className="mt-2 grid gap-2">
                        {children.map((child) => (
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm" key={child.id}>
                            <p className="font-bold text-slate-950">{child.firstName} {child.lastName} <span className="font-semibold text-slate-500">({ageLabel(child.dateOfBirth)})</span></p>
                            <span className={`rounded-md px-2 py-1 text-xs font-bold ${familyMemberStatusBadgeClass(child.status)}`}>
                              {familyMemberStatusLabel(child.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-slate-500">Geen kinderen gekoppeld.</p>
                    )}
                    {!partners.length && !children.length ? <p className="mt-3 text-sm font-semibold text-slate-500">Geen gezinsleden gekoppeld.</p> : null}
                  </div>
                </div>

                <dl className="grid content-start gap-3 rounded-md bg-emerald-50 p-4 text-sm">
                  <div><dt className="font-semibold text-slate-600">Betaalstatus</dt><dd className={dueTotal > 0 ? "font-bold text-red-700" : paidTotal > 0 ? "font-bold text-emerald-800" : "font-bold text-slate-950"}>{paymentStatusText}</dd></div>
                  <div><dt className="font-semibold text-slate-600">{displayedAmountLabel}</dt><dd className="text-xl font-black text-slate-950">{formatCurrency(displayedAmount)}</dd></div>
                  <div><dt className="font-semibold text-slate-600">Laatste betaling</dt><dd className="font-bold text-slate-950">{formatDate(latestPayment?.paidAt)}</dd></div>
                </dl>
              </article>
              {isCancelledForNonPayment ? <p className="mt-4 rounded-md bg-red-50 p-4 font-semibold text-red-800">Administratieve status: geannuleerd wegens niet betalen.</p> : null}
            </section>
          ) : null}

          {safeActiveTab === "personal" ? (
            <section className="mt-4 grid gap-4 md:grid-cols-2">
              <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-emerald-700">Personalia primair</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{donor.firstName} {donor.lastName}</h2>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div><dt className="font-semibold text-slate-600">Lidnummer</dt><dd className="font-bold text-slate-950">{donor.registrationNumber ?? "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-600">Geboortedatum</dt><dd>{donor.dateOfBirth.toLocaleDateString("nl-NL")}</dd></div>
                  <div><dt className="font-semibold text-slate-600">Geboorteplaats</dt><dd>{donor.birthPlace || "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-600">Geslacht</dt><dd>{donor.gender ?? "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-600">Actief sinds</dt><dd>{formatDate(donor.activeSince)}</dd></div>
                  <div><dt className="font-semibold text-slate-600">Inactief sinds</dt><dd>{formatDate(donor.inactiveSince)}</dd></div>
                  <div><dt className="font-semibold text-slate-600">Overleden sinds</dt><dd>{formatDate(donor.deceasedAt)}</dd></div>
                  <div><dt className="font-semibold text-slate-600">Status sinds</dt><dd>{formatDate(donor.statusChangedAt)}</dd></div>
                </dl>
              </article>

              {partners.map((partner) => (
                <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={partner.id}>
                  <p className="text-xs font-bold uppercase text-sky-700">Personalia partner</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{partner.firstName} {partner.lastName}</h2>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div><dt className="font-semibold text-slate-600">Lidnummerweergave</dt><dd className="font-bold text-slate-950">{donor.registrationNumber ? `${donor.registrationNumber}-P` : "-"}</dd></div>
                    <div><dt className="font-semibold text-slate-600">Geboortedatum</dt><dd>{formatDate(partner.dateOfBirth)}</dd></div>
                    <div><dt className="font-semibold text-slate-600">Geboorteplaats</dt><dd>{partner.birthPlace || "-"}</dd></div>
                    <div><dt className="font-semibold text-slate-600">Geslacht</dt><dd>{partner.gender ?? "-"}</dd></div>
                    <div><dt className="font-semibold text-slate-600">Status</dt><dd>{familyMemberStatusLabel(partner.status)}</dd></div>
                  </dl>
                </article>
              ))}

              {children.map((child) => (
                <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={child.id}>
                  <p className="text-xs font-bold uppercase text-amber-700">Personalia kind</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{child.firstName} {child.lastName}</h2>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div><dt className="font-semibold text-slate-600">Geboortedatum</dt><dd>{formatDate(child.dateOfBirth)}</dd></div>
                    <div><dt className="font-semibold text-slate-600">Geboorteplaats</dt><dd>{child.birthPlace || "-"}</dd></div>
                    <div><dt className="font-semibold text-slate-600">Geslacht</dt><dd>{child.gender ?? "-"}</dd></div>
                    <div><dt className="font-semibold text-slate-600">Status</dt><dd>{familyMemberStatusLabel(child.status)}</dd></div>
                  </dl>
                </article>
              ))}
            </section>
          ) : null}

          {safeActiveTab === "family" ? (
            <section className="mt-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Gezinsgegevens</h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="font-semibold text-slate-600">Adres</dt><dd className="mt-1 font-bold text-slate-950">{donor.addressLine1 || "-"}, {donor.postalCode || "-"} {donor.city || ""}</dd></div>
                <div><dt className="font-semibold text-slate-600">Land</dt><dd className="mt-1 font-bold text-slate-950">{donor.country || "-"}</dd></div>
                <div><dt className="font-semibold text-slate-600">IBAN / rekeningnummer</dt><dd className="mt-1 font-bold text-slate-950">{formatIban(donor.iban)}</dd></div>
                <div><dt className="font-semibold text-slate-600">Naam rekeninghouder</dt><dd className="mt-1 font-bold text-slate-950">{donor.accountHolderName || "-"}</dd></div>
                <div><dt className="font-semibold text-slate-600">Contact Pakistan</dt><dd className="mt-1 font-bold text-slate-950">{donor.pakistanContactName || "-"}</dd></div>
                <div><dt className="font-semibold text-slate-600">Telefoon Pakistan</dt><dd className="mt-1 font-bold text-slate-950">{donor.pakistanContactPhone || "-"}</dd></div>
                <div><dt className="font-semibold text-slate-600">Burgerlijke staat</dt><dd className="mt-1 font-bold text-slate-950">{donor.maritalStatus ?? "-"}</dd></div>
                <div><dt className="font-semibold text-slate-600">Uitvaartwensen</dt><dd className="mt-1 font-bold text-slate-950">{donor.funeralWishes || "-"}</dd></div>
              </dl>
              {donor.statusDonorMessage || donor.statusInternalNote ? (
                <div className="mt-5 grid gap-3 rounded-md bg-slate-100 p-4 text-sm">
                  {donor.statusDonorMessage ? <p><strong>Laatste externe statusnotitie:</strong> {donor.statusDonorMessage}</p> : null}
                  {donor.statusInternalNote ? <p><strong>Laatste interne statusnotitie:</strong> {donor.statusInternalNote}</p> : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {safeActiveTab === "payments" ? (
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

          {safeActiveTab === "changes" ? (
            <section className="mt-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Laatste wijzigingsverzoeken</h2>
              <div className="mt-4 grid gap-2">
                {donor.changeRequests.length ? donor.changeRequests.map((request) => <p key={request.id}>{request.changeType}: {request.status}</p>) : <p>Geen wijzigingsverzoeken.</p>}
              </div>
            </section>
          ) : null}

          {safeActiveTab === "history" ? (
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

          {safeActiveTab === "status" && canManageSettings(session?.user.role) ? (
            <section className="mt-4 rounded-lg border border-red-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Status aanpassen</h2>
              <p className="mt-2 text-sm font-semibold text-red-700">Gebruik dit alleen na bestuurlijke of administratieve controle.</p>
              <form action={updateHouseholdStatuses} className="mt-4 grid gap-4">
                <input name="donorId" type="hidden" value={donor.id} />
                <div className="grid gap-3">
                  <div className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_220px] sm:items-center">
                    <div>
                      <p className="text-xs font-bold uppercase text-emerald-700">Primair</p>
                      <p className="font-black text-slate-950">{donor.firstName} {donor.lastName}</p>
                    </div>
                    <label className="grid gap-1 text-sm font-semibold">
                      Status
                      <select name="primaryStatus" defaultValue={donor.status}>
                        <option value="ACTIVE">Actief</option>
                        <option value="INACTIVE">Inactief</option>
                        <option value="DECEASED">Overleden</option>
                      </select>
                    </label>
                    <details className="rounded-md bg-slate-50 p-3 sm:col-span-2">
                      <summary className="cursor-pointer text-sm font-bold text-slate-700">Notitie toevoegen</summary>
                      <div className="mt-3 grid gap-3">
                        <label className="grid gap-1 text-sm font-semibold">
                          Interne notitie
                          <textarea name="primaryInternalNote" rows={3} />
                        </label>
                        <label className="grid gap-1 text-sm font-semibold">
                          Externe notitie voor donateur
                          <textarea name="primaryDonorMessage" rows={3} />
                        </label>
                      </div>
                    </details>
                  </div>

                  {partners.map((partner) => (
                    <div className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_220px] sm:items-center" key={partner.id}>
                      <div>
                        <p className="text-xs font-bold uppercase text-sky-700">Partner</p>
                        <p className="font-black text-slate-950">{partner.firstName} {partner.lastName} <span className="font-semibold text-slate-500">({ageLabel(partner.dateOfBirth)})</span></p>
                      </div>
                      <label className="grid gap-1 text-sm font-semibold">
                        Status
                        <select name={`familyStatus:${partner.id}`} defaultValue={partner.status}>
                          <option value="ACTIVE_DEPENDENT">Gezinslid</option>
                          <option value="REGISTERED_SEPARATELY">Zelfstandig lid</option>
                          <option value="NOT_A_MEMBER">Geen lid</option>
                          <option value="DECEASED">Overleden</option>
                        </select>
                      </label>
                      <details className="rounded-md bg-slate-50 p-3 sm:col-span-2">
                        <summary className="cursor-pointer text-sm font-bold text-slate-700">Notitie toevoegen</summary>
                        <div className="mt-3 grid gap-3">
                          <label className="grid gap-1 text-sm font-semibold">
                            Interne notitie
                            <textarea name={`familyInternalNote:${partner.id}`} rows={3} />
                          </label>
                          <label className="grid gap-1 text-sm font-semibold">
                            Externe notitie voor donateur
                            <textarea name={`familyDonorMessage:${partner.id}`} rows={3} />
                          </label>
                        </div>
                      </details>
                    </div>
                  ))}

                  {children.map((child) => (
                    <div className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_220px] sm:items-center" key={child.id}>
                      <div>
                        <p className="text-xs font-bold uppercase text-amber-700">Kind</p>
                        <p className="font-black text-slate-950">{child.firstName} {child.lastName} <span className="font-semibold text-slate-500">({ageLabel(child.dateOfBirth)})</span></p>
                      </div>
                      <label className="grid gap-1 text-sm font-semibold">
                        Status
                        <select name={`familyStatus:${child.id}`} defaultValue={child.status}>
                          <option value="UNDER_18">Onder 18</option>
                          <option value="ADULT_NEEDS_REGISTRATION">18+ / geen lid</option>
                          <option value="REGISTERED_SEPARATELY">Zelfstandig lid</option>
                          <option value="NOT_A_MEMBER">Geen lid</option>
                          <option value="DECEASED">Overleden</option>
                        </select>
                      </label>
                      <details className="rounded-md bg-slate-50 p-3 sm:col-span-2">
                        <summary className="cursor-pointer text-sm font-bold text-slate-700">Notitie toevoegen</summary>
                        <div className="mt-3 grid gap-3">
                          <label className="grid gap-1 text-sm font-semibold">
                            Interne notitie
                            <textarea name={`familyInternalNote:${child.id}`} rows={3} />
                          </label>
                          <label className="grid gap-1 text-sm font-semibold">
                            Externe notitie voor donateur
                            <textarea name={`familyDonorMessage:${child.id}`} rows={3} />
                          </label>
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
                <button className="rounded-md bg-red-700 px-4 py-3 font-semibold text-white" type="submit">Status opslaan</button>
              </form>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
