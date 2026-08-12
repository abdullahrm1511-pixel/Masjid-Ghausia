import { NewSurveyForm } from "./NewSurveyForm";

export default function NewSurveyPage() {
  return <main className="mx-auto max-w-4xl px-4 py-10"><p className="text-sm font-bold text-[#0f766e]">Enquêtes</p><h1 className="text-3xl font-bold text-slate-900">Eenmalige donatie maken</h1><p className="mt-2 text-slate-700">Vul het donatiedoel in en deel daarna de unieke link of QR-code.</p><NewSurveyForm /></main>;
}
