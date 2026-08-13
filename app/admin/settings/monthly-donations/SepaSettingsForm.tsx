"use client";

import { useActionState } from "react";
import type { SepaConfig } from "@/lib/monthly-donation-agreement";
import { saveSepaSettings, type SepaSettingsState } from "./actions";

const initialState: SepaSettingsState = { success: false, message: "" };

export function SepaSettingsForm({ config }: { config: SepaConfig }) {
  const [state, action, pending] = useActionState(saveSepaSettings, initialState);

  return <form action={action} className="mt-6 grid gap-5 rounded-xl border bg-white p-6 shadow-sm">
    <label>Officiële juridische naam<input defaultValue={config.legalName} maxLength={150} name="legalName" required /></label>
    <label>SEPA Creditor Identifier (Incassant-ID)<input defaultValue={config.creditorIdentifier} maxLength={35} name="creditorIdentifier" placeholder="Bijvoorbeeld NL00ZZZ..." required /></label>
    <label>Volledig vestigingsadres<textarea defaultValue={config.address} maxLength={300} name="address" required rows={3} /></label>
    <label>Contact-e-mailadres<input defaultValue={config.email} maxLength={200} name="email" required type="email" /></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label>Vooraankondiging (dagen)<input defaultValue={config.noticeDays} max="14" min="1" name="noticeDays" required type="number" /></label>
      <label>Versie voorwaarden<input defaultValue={config.termsVersion} maxLength={50} name="termsVersion" required /></label>
    </div>
    <p className="text-sm text-slate-600">Wijzig het versienummer zodra de juridische tekst inhoudelijk verandert. Bestaande machtigingen houden altijd hun oorspronkelijke tekst.</p>
    {state.message ? <p className={`rounded-md p-3 font-semibold ${state.success ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`} role="status">{state.message}</p> : null}
    <button className="rounded-md bg-[#0f766e] px-5 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? "Bezig met opslaan..." : "SEPA-instellingen opslaan"}</button>
  </form>;
}
