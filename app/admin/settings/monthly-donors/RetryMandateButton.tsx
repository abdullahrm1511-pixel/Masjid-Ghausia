"use client";

import { useActionState } from "react";
import { retryMonthlyMandate, type RetryMandateState } from "./actions";

const initialState: RetryMandateState = { success: false, message: "" };

export function RetryMandateButton({ donorId }: { donorId: string }) {
  const [state, action, pending] = useActionState(retryMonthlyMandate, initialState);
  return <form action={action} className="flex flex-wrap items-center gap-3">
    <input name="donorId" type="hidden" value={donorId} />
    <button className="rounded-md border border-[#0f766e] px-4 py-2 font-bold text-[#0f766e] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? "Bezig met controleren..." : "Status opnieuw controleren bij Mollie"}</button>
    {state.message ? <p className={`text-sm font-semibold ${state.success ? "text-emerald-700" : "text-amber-700"}`} role="status">{state.message}</p> : null}
  </form>;
}
