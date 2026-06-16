import { DEFAULT_PRICING_CONFIG } from "@/lib/pricing-config";
import { getPricingConfig } from "@/lib/pricing";
import { resetPricing, savePricing } from "./actions";

export const dynamic = "force-dynamic";

export default async function PricingSettingsPage() {
  const config = await getPricingConfig();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Prijsinstellingen</h1>
      <p className="mt-2 text-slate-700">Pas hier alleen bedragen en betaalregels aan. Import en export staan in het algemene instellingenoverzicht.</p>

      <form action={savePricing} className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Jaarlijkse bijdragen</h2>
          <div className="mt-4 grid gap-4">
            <label>18+ individueel<input name="annualIndividual18Plus" type="number" defaultValue={config.annualIndividual18Plus} min="0" step="1" /></label>
            <label>Alleenstaande ouder<input name="annualSingleParent" type="number" defaultValue={config.annualSingleParent} min="0" step="1" /></label>
            <label>Gezin<input name="annualFamily" type="number" defaultValue={config.annualFamily} min="0" step="1" /></label>
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Betaalperiode en boete</h2>
          <div className="mt-4 grid gap-4">
            <label>Betaalperiode start<input name="paymentWindowStart" type="text" defaultValue={`${config.paymentWindowStartDay}-${config.paymentWindowStartMonth}`} /></label>
            <label>Betaalperiode eind<input name="paymentWindowEnd" type="text" defaultValue={`${config.paymentWindowEndDay}-${config.paymentWindowEndMonth}`} /></label>
            <label>Boete per maand<input name="monthlyPenaltyAfterWindow" type="number" defaultValue={config.monthlyPenaltyAfterWindow} min="0" step="1" /></label>
          </div>
          <p className="mt-2 text-sm text-slate-600">Standaard: betalen van 1 januari t/m 31 maart. Daarna komt 5 euro per maand boete bij openstaande jaarbetalingen.</p>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-bold text-slate-900">Eenmalige leeftijdsbijdragen</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DEFAULT_PRICING_CONFIG.oneTimeBrackets.map((bracket, index) => {
              const current = config.oneTimeBrackets[index] ?? bracket;
              const label = bracket.maxAge ? `${bracket.minAge}-${bracket.maxAge}` : `${bracket.minAge}+`;
              return (
                <label key={label}>
                  {label}
                  <input name={`bracket.${index}`} type="number" defaultValue={current.amount} min="0" step="1" />
                </label>
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap gap-3 lg:col-span-2">
          <button className="rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">Opslaan</button>
          <button className="rounded-md border border-stone-300 px-4 py-3 font-semibold text-slate-800" formAction={resetPricing}>Reset standaardwaarden</button>
        </div>
      </form>
    </main>
  );
}
