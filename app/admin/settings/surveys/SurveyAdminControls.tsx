"use client";

import { useActionState, useState } from "react";
import { deleteSurvey, type DeleteSurveyState } from "./actions";

export function CopySurveyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return <button className="rounded-md bg-[#0f766e] px-4 py-3 font-semibold text-white" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }} type="button">{copied ? "Link gekopieerd" : "Link kopieren"}</button>;
}

const initialDeleteState: DeleteSurveyState = { error: "" };

export function DeleteSurveyButton({ surveyId }: { surveyId: string }) {
  const [armed, setArmed] = useState(false);
  const [state, action, pending] = useActionState(deleteSurvey, initialDeleteState);
  if (!armed) return <button className="rounded-md border border-red-300 px-4 py-3 font-semibold text-red-700" onClick={() => setArmed(true)} type="button">Donatieformulier verwijderen</button>;
  return <form action={action} className="grid max-w-xl gap-3 rounded-md border border-red-200 bg-red-50 p-4"><input name="id" type="hidden" value={surveyId} /><div><p className="font-bold text-red-900">Definitief verwijderen</p><p className="text-sm text-red-800">Het formulier, de aanmeldingen, donaties en verzoeken worden verwijderd. Alleen een superadmin kan dit bevestigen.</p></div><label className="grid gap-1 text-sm font-semibold text-slate-800">Wachtwoord van de ingelogde superadmin<input autoComplete="current-password" className="rounded-md border border-red-300 bg-white px-3 py-2" name="superAdminPassword" required type="password" /></label>{state.error ? <p className="text-sm font-bold text-red-700" role="alert">{state.error}</p> : null}<div className="flex flex-wrap gap-3"><button className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Controleren..." : "Met wachtwoord verwijderen"}</button><button className="px-3 py-2 font-semibold text-slate-700" disabled={pending} onClick={() => setArmed(false)} type="button">Annuleren</button></div></form>;
}
