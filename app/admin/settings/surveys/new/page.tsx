import { DONOR_SURVEY_TEMPLATE } from "@/lib/survey";
import { createSurvey } from "../actions";

export default function NewSurveyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-bold text-[#0f766e]">Enquetes</p>
      <h1 className="text-3xl font-bold text-slate-900">Nieuwe enquete maken</h1>
      <p className="mt-2 text-slate-700">Kies eerst welk soort formulier u wilt delen.</p>
      <form action={createSurvey} className="mt-8 grid gap-5">
        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Soort enquete</h2>
          <label className="flex grid-cols-none flex-row items-start gap-3 rounded-lg border border-slate-200 p-4">
            <input className="mt-1 w-auto" defaultChecked name="templateKey" type="radio" value="DONOR_JOURNEY" />
            <span><strong>Donateurschap en maandelijkse donatie</strong><span className="mt-1 block text-sm font-normal text-slate-600">De bestaande vragen over donateurschap en een maandelijkse machtiging.</span></span>
          </label>
          <label className="flex grid-cols-none flex-row items-start gap-3 rounded-lg border border-slate-200 p-4">
            <input className="mt-1 w-auto" name="templateKey" type="radio" value="ONE_TIME_DONATION" />
            <span><strong>Eenmalige donatie via Mollie</strong><span className="mt-1 block text-sm font-normal text-slate-600">Voor bijvoorbeeld Fitrana of een donatie voor de imam. De invuller geeft alleen een naam en bedrag op en gaat daarna naar Mollie.</span></span>
          </label>
        </section>
        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <label>Titel<input name="title" required placeholder="Bijvoorbeeld Fitrana of Donatie voor Imam" /></label>
          <label>Toelichting<textarea name="description" rows={3} placeholder="Korte uitleg voor deelnemers" /></label>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Logica</h2>
          <p className="mt-3 text-sm text-slate-700">Bij een eenmalige donatie verschijnen alleen <strong>Naam</strong> en <strong>Bedrag</strong>. Daarna wordt de invuller veilig doorgestuurd naar Mollie.</p>
          <p className="mt-4 text-sm font-bold text-slate-800">Het donateurstraject gebruikt deze vragen:</p>
          <ol className="mt-3 grid gap-3">{DONOR_SURVEY_TEMPLATE.questions.map((question, index) => <li className="rounded-md bg-slate-50 p-3" key={question}><strong>{index + 1}.</strong> {question}</li>)}</ol>
        </section>
        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Looptijd</h2>
          <label className="flex grid-cols-none flex-row items-center gap-3"><input className="w-auto" defaultChecked name="unlimited" type="checkbox" /> Onbeperkt beschikbaar</label>
          <div className="grid gap-4 sm:grid-cols-2"><label>Begindatum (optioneel)<input name="startsAt" type="date" /></label><label>Einddatum (optioneel)<input name="endsAt" type="date" /></label></div>
          <p className="text-sm text-slate-600">Haal het vinkje bij onbeperkt weg om de datums te gebruiken.</p>
        </section>
        <button className="rounded-md bg-[#1483d6] px-4 py-3 font-semibold text-white" type="submit">Enquete maken en link genereren</button>
      </form>
    </main>
  );
}
