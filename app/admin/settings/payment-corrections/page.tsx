import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { createPaymentCorrection } from "./actions";

export const dynamic = "force-dynamic";

export default async function PaymentCorrectionsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [session, query] = await Promise.all([auth(), searchParams]);
  if (!canManageSettings(session?.user.role)) notFound();

  const codeConfigured = Boolean(process.env.FINANCIAL_CORRECTION_CODE);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-bold uppercase text-red-700">Alleen super-admin</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900">Betaling of schuld corrigeren</h1>
      <p className="mt-2 text-slate-700">
        Gebruik dit alleen voor administratieve correcties. De grote ledenimport maakt geen schuld aan; open bedragen worden hier handmatig of via bankimport geregistreerd.
      </p>

      {!codeConfigured ? (
        <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 font-semibold text-red-800">
          Correctiecode is nog niet ingesteld. Zet `FINANCIAL_CORRECTION_CODE` in de serveromgeving voordat deze pagina gebruikt wordt.
        </p>
      ) : null}
      {query.error ? <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 font-semibold text-red-800">{query.error}</p> : null}
      {query.success ? <p className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-900">{query.success}</p> : null}

      <form action={createPaymentCorrection} className="mt-8 grid gap-5 rounded-lg border border-red-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            Lidnummer
            <input name="registrationNumber" placeholder="11-00001" required />
          </label>
          <label>
            Correctiecode
            <input name="code" type="password" required />
          </label>
        </div>

        <label>
          Type correctie
          <select name="correctionType" defaultValue="annual_due" required>
            <option value="annual_due">Schuld toevoegen: jaarbetaling open</option>
            <option value="one_time_due">Schuld toevoegen: eenmalige betaling open</option>
            <option value="manual_due">Schuld toevoegen: handmatig open bedrag</option>
            <option value="annual_paid">Betaling toevoegen: jaarbetaling ontvangen</option>
            <option value="one_time_paid">Betaling toevoegen: eenmalige betaling ontvangen</option>
            <option value="manual_paid">Betaling toevoegen: extra betaling ontvangen</option>
            <option value="credit_correction">Aftrek/correctie toevoegen</option>
          </select>
        </label>

        <label>
          Bedrag
          <input name="amount" placeholder="72,00" required />
        </label>

        <label>
          Interne notitie
          <textarea name="adminNote" placeholder="Bijv. oude administratie gecontroleerd" rows={4} />
        </label>

        <div className="rounded-md bg-red-50 p-4 text-sm font-semibold text-red-900">
          Controleer lidnummer, type en bedrag goed. Deze correctie verschijnt direct in het financiële overzicht van het lid.
        </div>

        <button className="rounded-md bg-red-700 px-4 py-3 font-bold text-white disabled:opacity-50" disabled={!codeConfigured} type="submit">
          Correctie opslaan
        </button>
      </form>
    </main>
  );
}
