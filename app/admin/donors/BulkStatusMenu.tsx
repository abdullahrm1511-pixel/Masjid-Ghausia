"use client";

import { useActionState, useState } from "react";
import { bulkUpdateDonorStatus, type BulkStatusState } from "./actions";

const initialState: BulkStatusState = { updated: 0, notFound: [] };

export function BulkStatusMenu() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(bulkUpdateDonorStatus, initialState);

  return (
    <div className="relative">
      <button
        aria-label="Meer opties"
        className="rounded-lg border border-slate-300 px-3 py-2 text-lg font-black leading-none text-slate-600 hover:bg-slate-100"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        ⋯
      </button>
      {open ? (
        <div className="absolute right-0 z-10 mt-2 w-96 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <p className="text-sm font-black text-slate-950">Status in bulk wijzigen</p>
          <p className="mt-1 text-xs text-slate-600">Plak lidnummers (één per regel of met komma&apos;s gescheiden) en kies de nieuwe status voor al die donateurs.</p>
          <form action={action} className="mt-3 grid gap-3">
            <label className="grid gap-1 text-xs font-bold text-slate-700">
              Lidnummers
              <textarea className="rounded-md border border-slate-300 p-2 text-sm font-normal" name="registrationNumbers" placeholder={"11-0141\n11-0142\n11-0143"} required rows={4} />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-700">
              Nieuwe status
              <select className="rounded-md border border-slate-300 p-2 text-sm font-normal" name="status" required>
                <option value="">Kies status</option>
                <option value="INACTIVE">Inactief</option>
                <option value="ACTIVE">Actief</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-700">
              Interne notitie
              <textarea className="rounded-md border border-slate-300 p-2 text-sm font-normal" name="internalNote" required rows={2} />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-700">
              Bericht aan donateur
              <textarea className="rounded-md border border-slate-300 p-2 text-sm font-normal" name="donorMessage" required rows={2} />
            </label>
            {state.error ? <p className="rounded-md bg-red-50 p-2 text-xs font-bold text-red-800">{state.error}</p> : null}
            {!state.error && state.updated ? (
              <p className="rounded-md bg-teal-50 p-2 text-xs font-bold text-teal-900">
                {state.updated} donateur(en) bijgewerkt.
                {state.notFound.length ? ` Niet gevonden: ${state.notFound.join(", ")}.` : ""}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-bold" onClick={() => setOpen(false)} type="button">Sluiten</button>
              <button className="rounded-md bg-[#1483d6] px-3 py-2 text-xs font-bold text-white disabled:opacity-60" disabled={pending} type="submit">
                {pending ? "Bezig..." : "Toepassen"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
