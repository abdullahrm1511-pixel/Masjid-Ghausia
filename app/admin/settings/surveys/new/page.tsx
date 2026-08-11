import { NewSurveyForm } from "./NewSurveyForm";

export default function NewSurveyPage() {
  return <main className="mx-auto max-w-4xl px-4 py-10"><p className="text-sm font-bold text-[#0f766e]">Enquêtes</p><h1 className="text-3xl font-bold text-slate-900">Nieuw formulier maken</h1><p className="mt-2 text-slate-700">Maak een formulier zoals in Google Forms en deel daarna de unieke link.</p><NewSurveyForm /></main>;
}
