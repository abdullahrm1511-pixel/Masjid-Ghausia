"use client";

import { useState } from "react";
import { surveyQuestionTypeLabels, type SurveyQuestion, type SurveyQuestionType } from "@/lib/survey";

const optionTypes = new Set<SurveyQuestionType>(["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"]);

function newQuestion(index: number): SurveyQuestion {
  return { id: `vraag_${Date.now()}_${index}`, title: "", type: "SHORT_TEXT", required: false };
}

export function SurveyQuestionBuilder({ initialQuestions = [] }: { initialQuestions?: SurveyQuestion[] }) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>(initialQuestions.length ? initialQuestions : [{ id: "vraag_1", title: "", type: "SHORT_TEXT", required: false }]);
  const update = (index: number, changes: Partial<SurveyQuestion>) => setQuestions((current) => current.map((question, position) => position === index ? { ...question, ...changes } : question));
  const move = (index: number, direction: -1 | 1) => setQuestions((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  return (
    <section className="grid gap-4">
      <input name="questionsJson" type="hidden" value={JSON.stringify(questions)} />
      {questions.map((question, index) => (
        <article className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={question.id}>
          <div className="flex items-center justify-between gap-3"><strong>Vraag {index + 1}</strong><div className="flex gap-2"><button className="rounded border px-3 py-2" disabled={index === 0} onClick={() => move(index, -1)} type="button">Omhoog</button><button className="rounded border px-3 py-2" disabled={index === questions.length - 1} onClick={() => move(index, 1)} type="button">Omlaag</button></div></div>
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <label>Vraag<input maxLength={300} onChange={(event) => update(index, { title: event.target.value })} placeholder="Typ hier uw vraag" required value={question.title} /></label>
            <label>Antwoordtype<select onChange={(event) => update(index, { type: event.target.value as SurveyQuestionType, options: optionTypes.has(event.target.value as SurveyQuestionType) ? (question.options?.length ? question.options : ["Optie 1", "Optie 2"]) : undefined })} value={question.type}>{Object.entries(surveyQuestionTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <label>Extra uitleg (optioneel)<input maxLength={500} onChange={(event) => update(index, { description: event.target.value })} placeholder="Toelichting onder de vraag" value={question.description ?? ""} /></label>
          {optionTypes.has(question.type) ? <div className="grid gap-2"><p className="text-sm font-bold text-slate-700">Antwoordopties</p>{(question.options ?? []).map((option, optionIndex) => <div className="flex gap-2" key={`${question.id}-${optionIndex}`}><input onChange={(event) => update(index, { options: (question.options ?? []).map((item, position) => position === optionIndex ? event.target.value : item) })} required value={option} /><button className="rounded border border-red-200 px-3 text-red-700" disabled={(question.options?.length ?? 0) <= 1} onClick={() => update(index, { options: question.options?.filter((_, position) => position !== optionIndex) })} type="button">Verwijder</button></div>)}<button className="w-fit rounded border border-slate-300 px-3 py-2 font-semibold" onClick={() => update(index, { options: [...(question.options ?? []), `Optie ${(question.options?.length ?? 0) + 1}`] })} type="button">Optie toevoegen</button></div> : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><label className="flex grid-cols-none flex-row items-center gap-2"><input className="w-auto" checked={question.required} onChange={(event) => update(index, { required: event.target.checked })} type="checkbox" /> Verplicht</label><button className="rounded border border-red-300 px-3 py-2 font-semibold text-red-700" disabled={questions.length === 1} onClick={() => setQuestions((current) => current.filter((_, position) => position !== index))} type="button">Vraag verwijderen</button></div>
        </article>
      ))}
      <button className="w-fit rounded-md border-2 border-dashed border-[#1483d6] bg-sky-50 px-5 py-3 font-bold text-[#0f5f9f]" onClick={() => setQuestions((current) => [...current, newQuestion(current.length + 1)])} type="button">+ Vraag toevoegen</button>
    </section>
  );
}
