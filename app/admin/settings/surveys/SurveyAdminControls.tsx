"use client";

import { useState } from "react";

export function CopySurveyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return <button className="rounded-md bg-[#0f766e] px-4 py-3 font-semibold text-white" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }} type="button">{copied ? "Link gekopieerd" : "Link kopieren"}</button>;
}

export function DeleteSurveyButton() {
  const [armed, setArmed] = useState(false);
  if (!armed) return <button className="rounded-md border border-red-300 px-4 py-3 font-semibold text-red-700" onClick={() => setArmed(true)} type="button">Enquete verwijderen</button>;
  return <div className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 p-3"><span className="text-sm font-bold text-red-800">Ook alle antwoorden worden verwijderd.</span><button className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white" type="submit">Definitief verwijderen</button><button className="px-3 py-2 font-semibold text-slate-700" onClick={() => setArmed(false)} type="button">Annuleren</button></div>;
}
