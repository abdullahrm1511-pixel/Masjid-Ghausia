import { updateSurvey } from "./actions";

function dateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function SurveySettingsForm({ survey }: { survey: { id: string; title: string; description: string | null; templateKey: string; isActive: boolean; isDraft: boolean; startsAt: Date | null; endsAt: Date | null; thankYouMessage: string | null; notificationEmail: string | null; maxResponses: number | null; identityMode: string } }) {
  const permanent = survey.templateKey === "DONOR_JOURNEY";
  return <form action={updateSurvey} className="mt-6 grid gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <input name="id" type="hidden" value={survey.id} />
    <div><h2 className="text-xl font-bold text-slate-900">Formulierinstellingen</h2><p className="mt-1 text-sm text-slate-600">Pas de openbare titel, uitleg en meldingen aan.</p></div>
    <label>Titel<input defaultValue={survey.title} name="title" required /></label>
    <label>Korte uitleg<textarea defaultValue={survey.description ?? ""} name="description" placeholder="Waarvoor wordt de donatie gebruikt?" rows={3} /></label>

    {!permanent ? <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>Publicatie<select defaultValue={survey.isDraft ? "DRAFT" : "PUBLISHED"} name="publicationStatus"><option value="DRAFT">Concept</option><option value="PUBLISHED">Gepubliceerd</option></select></label>
        <label className="flex grid-cols-none flex-row items-center gap-3 self-end"><input className="w-auto" defaultChecked={survey.isActive} name="isActive" type="checkbox" /> Campagne actief</label>
      </div>
      <label className="flex grid-cols-none flex-row items-center gap-3"><input className="w-auto" defaultChecked={!survey.startsAt && !survey.endsAt} name="unlimited" type="checkbox" /> Geen einddatum</label>
      <div className="grid gap-4 sm:grid-cols-2"><label>Begindatum<input defaultValue={dateInput(survey.startsAt)} name="startsAt" type="date" /></label><label>Einddatum<input defaultValue={dateInput(survey.endsAt)} name="endsAt" type="date" /></label></div>
      <label>Automatisch sluiten na aantal donaties<input defaultValue={survey.maxResponses ?? ""} min="1" name="maxResponses" placeholder="Leeg is onbeperkt" type="number" /></label>
    </> : <p className="rounded-lg bg-sky-50 p-4 text-sm text-sky-900">Dit vaste formulier blijft altijd beschikbaar en vraagt de benodigde persoonsgegevens.</p>}

    <label>Bedanktekst na afronding<textarea defaultValue={survey.thankYouMessage ?? ""} maxLength={1000} name="thankYouMessage" placeholder="Hartelijk dank voor uw donatie." rows={3} /></label>
    <label>E-mailmelding bij een nieuwe inzending<input defaultValue={survey.notificationEmail ?? ""} name="notificationEmail" placeholder="bijvoorbeeld sgbc16@gmail.com" type="email" /></label>
    <button className="w-fit rounded-md bg-[#1483d6] px-5 py-3 font-semibold text-white" type="submit">Wijzigingen opslaan</button>
  </form>;
}
