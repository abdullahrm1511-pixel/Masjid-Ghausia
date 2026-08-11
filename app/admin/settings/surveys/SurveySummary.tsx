import { CUSTOM_SURVEY_TEMPLATE_KEY, type SurveyQuestion } from "@/lib/survey";

function Bars({ title, values }: { title: string; values: { label: string; count: number }[] }) {
  const total = values.reduce((sum, item) => sum + item.count, 0);
  return <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-bold text-slate-900">{title}</h3><div className="mt-4 grid gap-3">{values.map((item) => { const percentage = total ? Math.round(item.count / total * 100) : 0; return <div key={item.label}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{item.label}</span><strong>{item.count} · {percentage}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#1483d6]" style={{ width: `${percentage}%` }} /></div></div>; })}</div></article>;
}

export function SurveySummary({ templateKey, questions, responses }: { templateKey: string; questions: SurveyQuestion[]; responses: { answers: unknown }[] }) {
  if (!responses.length) return null;
  if (templateKey === CUSTOM_SURVEY_TEMPLATE_KEY) {
    const charts = questions.filter((question) => ["YES_NO", "MULTIPLE_CHOICE", "DROPDOWN", "CHECKBOXES"].includes(question.type)).map((question) => {
      const options = question.type === "YES_NO" ? ["Ja", "Nee"] : question.options ?? [];
      const counts = options.map((option) => ({ label: option, count: responses.filter((response) => { const answer = (response.answers as Record<string, unknown>)[question.id]; return Array.isArray(answer) ? answer.includes(option) : answer === option; }).length }));
      return <Bars key={question.id} title={question.title} values={counts} />;
    });
    return charts.length ? <section className="mt-8"><h2 className="text-2xl font-bold">Samenvatting</h2><div className="mt-4 grid gap-4 lg:grid-cols-2">{charts}</div></section> : null;
  }
  if (templateKey === "DONOR_JOURNEY") {
    const answer = (key: string, value: boolean) => responses.filter((response) => (response.answers as Record<string, unknown>)[key] === value).length;
    return <section className="mt-8"><h2 className="text-2xl font-bold">Samenvatting</h2><div className="mt-4 grid gap-4 lg:grid-cols-3"><Bars title="Al donateur" values={[{ label: "Ja", count: answer("isExistingDonor", true) }, { label: "Nee", count: answer("isExistingDonor", false) }]} /><Bars title="Wil donateur worden" values={[{ label: "Ja", count: answer("wantsToBecomeDonor", true) }, { label: "Nee", count: answer("wantsToBecomeDonor", false) }]} /><Bars title="Maandelijks doneren" values={[{ label: "Ja", count: answer("wantsMonthlyDonation", true) }, { label: "Nee", count: answer("wantsMonthlyDonation", false) }]} /></div></section>;
  }
  return null;
}
