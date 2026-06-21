import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { formatCurrency, formatDate } from "@/lib/display";
import { renderEmailTemplate } from "@/lib/email/templates";
import { formatIban } from "@/lib/iban";
import { donorStatusBadgeClass, donorStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { activateDonorManually, markAnnualPaymentDue, registerBankPayment, resetRegisteredPayments } from "./actions";

export const dynamic = "force-dynamic";

function paymentYear(item: { paidAt: Date | null; dueDate: Date | null; createdAt: Date; notes: string | null }) {
  const yearFromNotes = item.notes?.match(/\bContributiejaar:\s*(20\d{2})\b/i)?.[1];
  if (yearFromNotes) return Number(yearFromNotes);
  return (item.paidAt ?? item.dueDate ?? item.createdAt).getFullYear();
}

function noteValue(notes: string | null, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return notes?.match(new RegExp(`^${escaped}:\\s*(.+)$`, "im"))?.[1]?.trim() ?? "";
}

export default async function FinancialPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const donor = await prisma.donorProfile.findUnique({
    where: { id },
    include: {
      user: true,
      familyMembers: true,
      paymentObligations: { orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }] }
    }
  });

  if (!donor) notFound();

  const paidItems = donor.paymentObligations.filter((item) => item.status === "PAID");
  const dueItems = donor.paymentObligations.filter((item) => item.status === "DUE" && item.amountCents > 0);
  const receivedTotal = paidItems.filter((item) => item.amountCents > 0).reduce((sum, item) => sum + item.amountCents, 0);
  const deductionTotal = Math.abs(paidItems.filter((item) => item.amountCents < 0).reduce((sum, item) => sum + item.amountCents, 0));
  const paidTotal = receivedTotal - deductionTotal;
  const currentYear = new Date().getFullYear();
  const annualDueItems = dueItems.filter((item) => item.obligationType === "ANNUAL" && paymentYear(item) === currentYear);
  const annualDueTotal = annualDueItems.reduce((sum, item) => sum + item.amountCents, 0);
  const annualPaidItems = paidItems.filter((item) => item.obligationType === "ANNUAL" && paymentYear(item) === currentYear);
  const annualPaidTotal = Math.max(annualPaidItems.reduce((sum, item) => sum + item.amountCents, 0), 0);
  const latestAnnualPaid = annualPaidItems.find((item) => item.amountCents > 0);
  const latestPaid = paidItems.find((item) => item.amountCents > 0);
  const paymentHistory = donor.paymentObligations
    .filter((item) => item.status === "PAID" && item.amountCents !== 0)
    .slice(0, 50);
  const paidOneTimeTotal = paidItems
    .filter((item) => item.obligationType === "ONE_TIME")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const oneTimeDueTotal = dueItems
    .filter((item) => item.obligationType === "ONE_TIME")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const extraReceivedTotal = Math.max(paidItems.filter((item) => item.obligationType === "MANUAL" && item.amountCents > 0).reduce((sum, item) => sum + item.amountCents, 0), 0);

  const oneTimeTotal = paidOneTimeTotal + oneTimeDueTotal;
  const annualTotal = annualPaidTotal + annualDueTotal;
  const annualRemaining = annualDueTotal;
  const annualIsPaid = annualTotal > 0 && annualDueTotal === 0;
  const annualIsPartial = annualPaidTotal > 0 && annualRemaining > 0;
  const penaltyTotal = 0;
  const remainingOneTime = oneTimeDueTotal;
  const displayedOneTimePaid = Math.max(0, Math.min(paidOneTimeTotal, oneTimeTotal));
  const remainingTotal = dueItems.reduce((sum, item) => sum + item.amountCents, 0);
  const creditTotal = remainingTotal === 0 ? Math.max(paidTotal - oneTimeTotal - annualTotal, 0) : 0;
  const canActivate = donor.status === "PAYMENT_REQUIRED" && remainingTotal === 0 && annualIsPaid;
  const paymentPreview = latestPaid
    ? await renderEmailTemplate("PAYMENT_CONFIRMED", {
        naam: `${donor.firstName} ${donor.lastName}`.trim(),
        voornaam: donor.firstName,
        achternaam: donor.lastName,
        lidnummer: donor.registrationNumber ?? "",
        bedrag: formatCurrency(latestPaid.amountCents),
        betaaldatum: formatDate(latestPaid.paidAt),
        organisatie: "St. GBC Masjid Ghausia"
      })
    : null;
  const todayInput = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <BackButton fallbackHref={`/admin/donors/${donor.id}`} />
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financieel beheer</h1>
          <p className="mt-3 text-2xl font-bold text-slate-900">{donor.firstName} {donor.lastName} - {donor.registrationNumber ?? "geen lidnummer"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-md px-3 py-2 text-sm font-bold ${donorStatusBadgeClass(donor.status)}`}>
            {donorStatusLabel(donor.status)}
          </span>
          <span className={`rounded-md px-3 py-2 text-sm font-bold ${annualIsPaid ? "bg-emerald-50 text-emerald-800" : annualIsPartial ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"}`}>
            {annualIsPaid ? "Jaarbetaling betaald" : annualIsPartial ? "Jaarbetaling gedeeltelijk betaald" : "Jaarbetaling open"}
          </span>
        </div>
      </div>

      {query.error ? <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 font-semibold text-red-800">{query.error}</p> : null}

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div>
            <div>
              <h2 className="text-xl font-black text-slate-950">Totaal bedrag</h2>
              <p className="mt-1 text-sm text-slate-600">De berekende bijdrage voor deze donateur.</p>
            </div>
            <div className="mt-5">
              <div className="rounded-md border border-red-200 bg-red-50 p-5">
                <p className="text-sm font-bold text-slate-600">Nog te betalen</p>
                <p className="mt-1 text-4xl font-black text-red-800">
                  {formatCurrency(remainingTotal)}
                </p>
                  <p className="mt-2 text-sm font-bold text-red-800">
                  Alleen geregistreerde open posten worden als schuld getoond
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-slate-100 p-3">
                  <dt className="text-sm font-bold text-slate-600">Jaarlijks</dt>
                  <dd className={`mt-1 text-lg font-black ${annualIsPaid ? "text-slate-900" : annualTotal > 0 ? "text-red-700" : "text-slate-900"}`}>{formatCurrency(annualTotal)}</dd>
                  <p className="mt-1 text-xs text-slate-600">
                    {annualIsPaid
                      ? `Betaald: ${formatCurrency(annualPaidTotal)}${latestAnnualPaid ? `, laatste betaling ${formatDate(latestAnnualPaid.paidAt)}` : ""}`
                      : annualIsPartial
                        ? `Gedeeltelijk betaald: ${formatCurrency(annualPaidTotal)}, restant ${formatCurrency(annualRemaining)}`
                        : annualDueTotal > 0
                          ? `Openstaand: ${formatCurrency(annualDueTotal)}`
                          : "Geen open jaarbetaling geregistreerd"}
                  </p>
                </div>
                <div className="rounded-md bg-slate-100 p-3">
                  <dt className="text-sm font-bold text-slate-600">Eenmalig</dt>
                  <dd className={`mt-1 text-lg font-black ${remainingOneTime > 0 ? "text-red-700" : "text-slate-900"}`}>{formatCurrency(oneTimeTotal)}</dd>
                  {donor.approvedAt ? (
                    <>
                      <p className="mt-1 text-xs text-slate-600">Betaald {formatCurrency(displayedOneTimePaid)}, restant {formatCurrency(remainingOneTime)}</p>
                      <p className="mt-1 text-xs font-bold text-slate-600">Nieuwe leden worden pas actief na volledige betaling.</p>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-slate-600">Niet van toepassing voor geimporteerde bestaande donateurs.</p>
                  )}
                </div>
                <div className="rounded-md bg-slate-100 p-3">
                  <dt className="text-sm font-bold text-slate-600">Boete</dt>
                  <dd className={`mt-1 text-lg font-black ${penaltyTotal > 0 && !annualIsPaid ? "text-red-700" : "text-slate-900"}`}>{formatCurrency(penaltyTotal)}</dd>
                </div>
            </div>
          </div>
          <div className="rounded-md bg-slate-100 p-4 text-sm">
            <p><strong>IBAN:</strong> {formatIban(donor.iban)}</p>
            <p className="mt-2"><strong>Rekeninghouder:</strong> {donor.accountHolderName}</p>
            <p className="mt-2"><strong>Status:</strong> {donor.status}</p>
            <p className="mt-3 text-slate-600">Betalingen worden buiten het portaal gedaan via bankoverschrijving. Hier bewaakt de administratie de berekende bijdrage en ontvangen bankregels.</p>
          </div>
        </div>
      </section>

      <details className="mt-5 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-xl font-bold text-slate-900">Betaling registreren</summary>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-md bg-emerald-50 p-3">
            <p className="text-sm font-bold text-emerald-700">+ Ontvangen</p>
            <p className="mt-1 text-xl font-black text-emerald-900">{formatCurrency(receivedTotal)}</p>
          </div>
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm font-bold text-red-700">- Aftrek</p>
            <p className="mt-1 text-xl font-black text-red-900">{formatCurrency(deductionTotal)}</p>
          </div>
          <div className="rounded-md bg-slate-100 p-3">
            <p className="text-sm font-bold text-slate-600">Netto verwerkt</p>
            <p className="mt-1 text-xl font-black text-slate-900">{formatCurrency(paidTotal)}</p>
          </div>
          <div className="rounded-md bg-slate-100 p-3">
            <p className="text-sm font-bold text-slate-600">Administratief saldo</p>
            <p className={`mt-1 text-xl font-black ${remainingTotal > 0 ? "text-red-700" : creditTotal > 0 ? "text-emerald-800" : "text-slate-900"}`}>
              {remainingTotal > 0 ? formatCurrency(remainingTotal) : creditTotal > 0 ? `+ ${formatCurrency(creditTotal)}` : formatCurrency(0)}
            </p>
            <p className="mt-1 text-xs text-slate-600">{remainingTotal > 0 ? "Nog te betalen" : creditTotal > 0 ? "Tegoed" : "Geen open saldo"}</p>
          </div>
          <div className="rounded-md bg-emerald-50 p-3">
            <p className="text-sm font-bold text-emerald-700">Extra ontvangen</p>
            <p className="mt-1 text-xl font-black text-emerald-900">{formatCurrency(extraReceivedTotal)}</p>
          </div>
        </div>
        <form action={registerBankPayment} className="mt-5 grid gap-4 lg:grid-cols-5">
          <input name="donorId" type="hidden" value={donor.id} />
          <label className="lg:col-span-1">
            Soort
            <select name="obligationType" defaultValue="ANNUAL">
              <option value="ANNUAL">Jaarbetaling</option>
              <option value="ONE_TIME">Eenmalig</option>
              <option value="MANUAL">Extra betaling</option>
            </select>
          </label>
          <label className="lg:col-span-1">
            Bedrag
            <input name="amount" placeholder="72,00 of -72,00" required />
          </label>
          <label className="lg:col-span-1">
            Betaaldatum
            <input name="paidAt" type="date" defaultValue={todayInput} required />
          </label>
          <label className="lg:col-span-2">
            Interne notitie
            <input name="adminNote" placeholder="Bijv. bankafschrift gecontroleerd" />
          </label>
          <div className="lg:col-span-5 flex flex-wrap items-center justify-between gap-3 rounded-md bg-stone-100 p-3">
            <p className="text-sm text-slate-700">Gebruik een positief bedrag voor ontvangen geld. Gebruik een minteken voor aftrek/correctie, bijvoorbeeld -72,00. Alleen positieve betalingen zetten een e-mailconcept klaar.</p>
            <button className="rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">Bankbetaling opslaan</button>
          </div>
        </form>
        <form action={markAnnualPaymentDue} className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
          <input name="donorId" type="hidden" value={donor.id} />
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <label>
              Jaarbetaling open zetten
              <input name="year" type="number" min="2000" max="2100" defaultValue={currentYear} />
            </label>
            <button className="rounded-md border border-amber-300 bg-white px-4 py-3 font-bold text-amber-900" type="submit">
              Restant open zetten
            </button>
          </div>
          <p className="mt-2 text-sm font-semibold text-amber-900">
            Gebruik dit voor iemand die niet in het bankbestand voorkomt of voor uitzonderingen die handmatig gecontroleerd zijn.
          </p>
        </form>
        <form action={resetRegisteredPayments} className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
          <input name="donorId" type="hidden" value={donor.id} />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-bold text-red-900">Betalingsregistraties resetten</p>
              <p className="mt-1 text-sm text-red-800">
                Wist alle ontvangen betalingen, aftrekken, correcties en extra ontvangen bedragen van deze donateur. De berekende jaarlijkse, eenmalige en boetebedragen blijven staan.
              </p>
              <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-red-900">
                <input className="h-4 w-4" name="confirmReset" type="checkbox" value="yes" />
                Ik wil deze betalingsregistraties resetten
              </label>
            </div>
            <button className="rounded-md border border-red-300 bg-white px-4 py-3 font-bold text-red-800" type="submit">
              Reset betalingen
            </button>
          </div>
        </form>
      </details>

      {canActivate ? (
        <form action={activateDonorManually} className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <input name="donorId" type="hidden" value={donor.id} />
          <p className="font-semibold text-emerald-900">De jaarbijdrage en eenmalige bijdrage zijn volledig betaald. Deze donateur kan actief worden gezet.</p>
          <button className="mt-3 rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">
            Donateur actief zetten
          </button>
        </form>
      ) : null}

      {paymentPreview ? (
        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Preview betalingsbevestiging</h2>
          <p className="mt-4 text-sm font-semibold text-slate-700">Onderwerp</p>
          <p className="mt-1 rounded-md bg-stone-100 p-3">{paymentPreview.subject}</p>
          <p className="mt-4 text-sm font-semibold text-slate-700">Body</p>
          <pre className="mt-1 whitespace-pre-wrap rounded-md bg-stone-100 p-3 text-sm">{paymentPreview.bodyText}</pre>
        </section>
      ) : null}

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Betaalhistorie</h2>
        <p className="mt-1 text-sm text-slate-600">Hier staat wat er via bankimport of handmatige registratie is verwerkt. IBAN is alleen betaalbewijs en bepaalt niet voor welk lid betaald is.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3">Datum</th>
                <th className="p-3">Bedrag</th>
                <th className="p-3">IBAN betaler</th>
                <th className="p-3">Importbestand</th>
                <th className="p-3">Omschrijving</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.length ? (
                paymentHistory.map((item) => (
                  <tr className="border-t border-slate-200 align-top" key={item.id}>
                    <td className="p-3">{formatDate(item.paidAt)}</td>
                    <td className="p-3 font-bold">{formatCurrency(item.amountCents)}</td>
                    <td className="p-3">{noteValue(item.notes, "IBAN betaler") || "-"}</td>
                    <td className="p-3">{noteValue(item.notes, "Importbestand") || (item.source ?? "-")}</td>
                    <td className="p-3">{noteValue(item.notes, "Omschrijving") || item.adminNote || item.notes || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-3 text-slate-600" colSpan={5}>Nog geen betalingen verwerkt.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
