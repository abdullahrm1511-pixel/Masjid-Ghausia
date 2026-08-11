"use client";

import { useActionState, useState } from "react";
import { submitSurvey, type SurveyState } from "./actions";
import { visibleSurveyQuestions, type SurveyQuestion } from "@/lib/survey";

const initialState: SurveyState = { success: false, message: "" };
type Answers = Record<string, string | string[]>;

function QuestionInput({ question, answer, onChange }: { question: SurveyQuestion; answer: string | string[] | undefined; onChange: (value: string | string[]) => void }) {
  const name = `answer_${question.id}`;
  const value = typeof answer === "string" ? answer : "";
  if (question.type === "LONG_TEXT") return <textarea maxLength={5000} name={name} onChange={(event) => onChange(event.target.value)} required={question.required} rows={5} value={value} />;
  if (question.type === "MULTIPLE_CHOICE" || question.type === "YES_NO") {
    const options = question.type === "YES_NO" ? ["Ja", "Nee"] : question.options ?? [];
    return <div className="survey-choices">{options.map((option) => <label className="survey-choice" key={option}><input checked={value === option} name={name} onChange={() => onChange(option)} required={question.required} type="radio" value={option} /><span>{option}</span></label>)}</div>;
  }
  if (question.type === "CHECKBOXES") {
    const selected = Array.isArray(answer) ? answer : [];
    return <div className="survey-choices">{(question.options ?? []).map((option) => <label className="survey-choice" key={option}><input checked={selected.includes(option)} name={name} onChange={(event) => onChange(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} type="checkbox" value={option} /><span>{option}</span></label>)}</div>;
  }
  if (question.type === "DROPDOWN") return <select name={name} onChange={(event) => onChange(event.target.value)} required={question.required} value={value}><option disabled value="">Kies een antwoord</option>{(question.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  if (question.type === "FILE") return <input accept="application/pdf,image/jpeg,image/png,image/heic,image/heif" name={name} onChange={(event) => onChange(event.target.files?.[0]?.name ?? "")} required={question.required} type="file" />;
  const common = { name, required: question.required, value, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value) };
  if (question.type === "EMAIL") return <input {...common} autoComplete="email" maxLength={200} type="email" />;
  if (question.type === "PHONE") return <input {...common} autoComplete="tel" inputMode="tel" maxLength={20} pattern="\+?[0-9() .-]{8,20}" type="tel" />;
  if (question.type === "NUMBER") return <input {...common} inputMode="decimal" step="any" type="number" />;
  if (question.type === "DATE") return <input {...common} type="date" />;
  return <input {...common} maxLength={500} type="text" />;
}

export function DynamicSurveyForm({ survey, preview = false }: { survey: { id: string; title: string; description: string | null; questions: SurveyQuestion[]; identityMode?: string }; preview?: boolean }) {
  const [state, action, pending] = useActionState(submitSurvey, initialState);
  const [answers, setAnswers] = useState<Answers>({});
  const visibleQuestions = visibleSurveyQuestions(survey.questions, answers);
  if (state.success) return <section className="survey-card survey-finished" aria-live="polite"><div className="survey-check">✓</div><p className="donor-eyebrow">Formulier afgerond</p><h1>Hartelijk dank</h1><p>{state.message}</p></section>;
  const identityMode = survey.identityMode ?? "REQUIRED";
  return <form action={preview ? undefined : action} className="survey-card" encType="multipart/form-data"><input name="surveyId" type="hidden" value={survey.id} />{preview ? <p className="rounded-md bg-amber-100 p-3 text-center text-sm font-bold text-amber-900">Voorbeeldmodus – antwoorden worden niet opgeslagen</p> : null}<header className="survey-heading"><p className="donor-eyebrow">Formulier van Masjid Ghausia</p><h1>{survey.title}</h1><p>{survey.description || "Vul onderstaande vragen in."}</p></header>{identityMode !== "ANONYMOUS" ? <fieldset className="survey-section"><legend>Uw gegevens {identityMode === "OPTIONAL" ? "(optioneel)" : ""}</legend><div className="survey-grid"><label>Voornaam<input autoComplete="given-name" maxLength={60} name="contactFirstName" required={identityMode === "REQUIRED"} />{state.errors?.contactFirstName ? <span className="survey-error">{state.errors.contactFirstName}</span> : null}</label><label>Achternaam<input autoComplete="family-name" maxLength={60} name="contactLastName" required={identityMode === "REQUIRED"} />{state.errors?.contactLastName ? <span className="survey-error">{state.errors.contactLastName}</span> : null}</label><label>Mobiel nummer<input autoComplete="tel" maxLength={20} name="contactPhone" required={identityMode === "REQUIRED"} type="tel" />{state.errors?.contactPhone ? <span className="survey-error">{state.errors.contactPhone}</span> : null}</label><label>E-mailadres<input autoComplete="email" maxLength={200} name="contactEmail" required={identityMode === "REQUIRED"} type="email" />{state.errors?.contactEmail ? <span className="survey-error">{state.errors.contactEmail}</span> : null}</label></div></fieldset> : null}{visibleQuestions.map((question) => { const number = survey.questions.findIndex((item) => item.id === question.id) + 1; return <fieldset className="survey-section survey-reveal" key={question.id}><legend><span>{number}</span> {question.title}{question.required ? " *" : ""}</legend>{question.description ? <p className="text-sm text-slate-600">{question.description}</p> : null}<QuestionInput answer={answers[question.id]} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} question={question} />{state.errors?.[question.id] ? <p className="survey-error">{state.errors[question.id]}</p> : null}</fieldset>; })}{state.message ? <p className="survey-error" role="alert">{state.message}</p> : null}<button className="donor-submit-button survey-submit" disabled={pending || preview} type={preview ? "button" : "submit"}>{preview ? "Voorbeeld – verzenden uitgeschakeld" : pending ? "Antwoorden verzenden..." : "Antwoorden verzenden"}</button><p className="survey-privacy">Vervolgvragen verschijnen automatisch op basis van uw antwoorden.</p></form>;
}
