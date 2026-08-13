"use client";

import { useActionState, useState } from "react";
import { deleteSurveyResponse, type DeleteResponseState } from "./actions";

const initialState: DeleteResponseState = { error: "" };

export function ResponseDeleteButton({ surveyId, responseId }: { surveyId: string; responseId: string }) {
  const [armed, setArmed] = useState(false);
  const [state, action, pending] = useActionState(deleteSurveyResponse, initialState);
  if (!armed) return <button className="text-sm font-bold text-red-700" onClick={() => setArmed(true)} type="button">Verwijderen</button>;
  return <form action={action} className="inline-block text-right">
    <input name="surveyId" type="hidden" value={surveyId} /><input name="responseId" type="hidden" value={responseId} />
    <span className="inline-flex items-center gap-2"><button className="rounded bg-red-700 px-2 py-1 text-xs font-bold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Bezig..." : "Bevestigen"}</button><button className="text-xs font-bold" disabled={pending} onClick={() => setArmed(false)} type="button">Annuleren</button></span>
    {state.error ? <p className="mt-2 max-w-xs text-xs font-bold text-red-700" role="alert">{state.error}</p> : null}
  </form>;
}
