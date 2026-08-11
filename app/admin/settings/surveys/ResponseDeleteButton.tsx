"use client";

import { useState } from "react";

export function ResponseDeleteButton() {
  const [armed, setArmed] = useState(false);
  if (!armed) return <button className="text-sm font-bold text-red-700" onClick={() => setArmed(true)} type="button">Verwijderen</button>;
  return <span className="inline-flex items-center gap-2"><button className="rounded bg-red-700 px-2 py-1 text-xs font-bold text-white" type="submit">Bevestigen</button><button className="text-xs font-bold" onClick={() => setArmed(false)} type="button">Annuleren</button></span>;
}
