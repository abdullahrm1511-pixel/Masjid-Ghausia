"use client";

import { useState } from "react";
import { createSurvey } from "../actions";
import { DONOR_SURVEY_TEMPLATE } from "@/lib/survey";
import { SurveyQuestionBuilder } from "../SurveyQuestionBuilder";

export function NewSurveyForm() {
  const [template, setTemplate] = useState("CUSTOM_FORM");
  return <form action={createSurvey} className="mt-8 grid gap-5">
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Soort enquête</h2>
      <label className="flex grid-cols-none flex-row items-start gap-3 rounded-lg border border-slate-200 p-4"><input className="mt-1 w-auto" checked={template === "CUSTOM_FORM"} name="templateKey" onChange={() => setTemplate("CUSTOM_FORM")} type="radio" value="CUSTOM_FORM" /><span><strong>Zelf formulier maken</strong><span className="mt-1 block text-sm font-normal text-slate-600">Voeg zelf vragen toe en kies per vraag hoe iemand antwoordt.</span></span></label>
      <label className="flex grid-cols-none flex-row items-start gap-3 rounded-lg border border-slate-200 p-4"><input className="mt-1 w-auto" checked={template === "DONOR_JOURNEY"} name="templateKey" onChange={() => setTemplate("DONOR_JOURNEY")} type="radio" value="DONOR_JOURNEY" /><span><strong>Vast donateurstraject</strong><span className="mt-1 block text-sm font-normal text-slate-600">De bestaande drie vragen met maandelijkse machtiging.</span></span></label>
      <label className="flex grid-cols-none flex-row items-start gap-3 rounded-lg border border-slate-200 p-4"><input className="mt-1 w-auto" checked={template === "ONE_TIME_DONATION"} name="templateKey" onChange={() => setTemplate("ONE_TIME_DONATION")} type="radio" value="ONE_TIME_DONATION" /><span><strong>Eenmalige donatie via Mollie</strong><span className="mt-1 block text-sm font-normal text-slate-600">Alleen naam en bedrag, daarna veilig betalen.</span></span></label>
    </section>
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><label>Titel<input name="title" required placeholder="Titel van het formulier" /></label><label>Beschrijving<textarea name="description" rows={3} placeholder="Korte uitleg voor deelnemers" /></label></section>
    {template === "CUSTOM_FORM" ? <div className="grid gap-3"><div><h2 className="text-2xl font-bold">Vragen</h2><p className="text-sm text-slate-600">Sleep is niet nodig: gebruik Omhoog en Omlaag om de volgorde te bepalen.</p></div><SurveyQuestionBuilder /></div> : template === "DONOR_JOURNEY" ? <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Vaste vragen</h2><ol className="mt-3 grid gap-3">{DONOR_SURVEY_TEMPLATE.questions.map((question, index) => <li className="rounded-md bg-slate-50 p-3" key={question}><strong>{index + 1}.</strong> {question}</li>)}</ol></section> : null}
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Looptijd</h2><label className="flex grid-cols-none flex-row items-center gap-3"><input className="w-auto" defaultChecked name="unlimited" type="checkbox" /> Onbeperkt beschikbaar</label><div className="grid gap-4 sm:grid-cols-2"><label>Begindatum<input name="startsAt" type="date" /></label><label>Einddatum<input name="endsAt" type="date" /></label></div></section>
    <button className="rounded-md bg-[#1483d6] px-4 py-3 font-semibold text-white" type="submit">Enquête maken en link genereren</button>
  </form>;
}
