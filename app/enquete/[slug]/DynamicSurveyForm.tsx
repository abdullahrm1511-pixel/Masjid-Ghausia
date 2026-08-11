"use client";

import { useActionState } from "react";
import { submitSurvey, type SurveyState } from "./actions";
import type { SurveyQuestion } from "@/lib/survey";

const initialState: SurveyState = { success: false, message: "" };

function QuestionInput({ question }: { question: SurveyQuestion }) {
  const name = `answer_${question.id}`;
  if (question.type === "LONG_TEXT") return <textarea maxLength={5000} name={name} required={question.required} rows={5} />;
  if (question.type === "MULTIPLE_CHOICE" || question.type === "YES_NO") {
    const options = question.type === "YES_NO" ? ["Ja", "Nee"] : question.options ?? [];
    return <div className="survey-choices">{options.map((option) => <label className="survey-choice" key={option}><input name={name} required={question.required} type="radio" value={option} /><span>{option}</span></label>)}</div>;
  }
  if (question.type === "CHECKBOXES") return <div className="survey-choices">{(question.options ?? []).map((option) => <label className="survey-choice" key={option}><input name={name} type="checkbox" value={option} /><span>{option}</span></label>)}</div>;
  if (question.type === "DROPDOWN") return <select defaultValue="" name={name} required={question.required}><option disabled value="">Kies een antwoord</option>{(question.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  if (question.type === "EMAIL") return <input autoComplete="email" maxLength={200} name={name} required={question.required} type="email" />;
  if (question.type === "PHONE") return <input autoComplete="tel" inputMode="tel" maxLength={20} name={name} pattern="\+?[0-9() .-]{8,20}" required={question.required} type="tel" />;
  if (question.type === "NUMBER") return <input inputMode="decimal" name={name} required={question.required} step="any" type="number" />;
  if (question.type === "DATE") return <input name={name} required={question.required} type="date" />;
  return <input maxLength={500} name={name} required={question.required} type="text" />;
}

export function DynamicSurveyForm({ survey }: { survey: { id: string; title: string; description: string | null; questions: SurveyQuestion[] } }) {
  const [state, action, pending] = useActionState(submitSurvey, initialState);
  if (state.success) return <section className="survey-card survey-finished" aria-live="polite"><div className="survey-check">✓</div><p className="donor-eyebrow">Formulier afgerond</p><h1>Hartelijk dank</h1><p>{state.message}</p></section>;
  return <form action={action} className="survey-card"><input name="surveyId" type="hidden" value={survey.id} /><header className="survey-heading"><p className="donor-eyebrow">Formulier van Masjid Ghausia</p><h1>{survey.title}</h1><p>{survey.description || "Vul onderstaande vragen in."}</p></header>{survey.questions.map((question, index) => <fieldset className="survey-section" key={question.id}><legend><span>{index + 1}</span> {question.title}{question.required ? " *" : ""}</legend>{question.description ? <p className="text-sm text-slate-600">{question.description}</p> : null}<QuestionInput question={question} />{state.errors?.[question.id] ? <p className="survey-error">{state.errors[question.id]}</p> : null}</fieldset>)}{state.message ? <p className="survey-error" role="alert">{state.message}</p> : null}<button className="donor-submit-button survey-submit" disabled={pending} type="submit">{pending ? "Antwoorden verzenden..." : "Antwoorden verzenden"}</button><p className="survey-privacy">Uw antwoorden worden alleen gebruikt voor dit formulier en de opvolging daarvan.</p></form>;
}
