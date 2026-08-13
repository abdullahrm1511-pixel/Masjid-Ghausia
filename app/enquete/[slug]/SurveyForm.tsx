"use client";

import { useActionState, useState } from "react";
import { submitSurvey, type SurveyState } from "./actions";
import type { FixedSurveySettings } from "@/lib/survey";
import type { SepaConfig } from "@/lib/monthly-donation-agreement";

const initialState: SurveyState = { success: false, message: "" };

function Choice({ name, value, label, checked, onChange }: { name: string; value: string; label: string; checked: boolean; onChange: () => void }) {
  return <label className="survey-choice"><input checked={checked} name={name} onChange={onChange} required type="radio" value={value} /><span>{label}</span></label>;
}

export function SurveyForm({ survey, settings, sepaConfig, preview = false }: { survey: { id: string; title: string; description: string | null; templateKey: string }; settings: FixedSurveySettings; sepaConfig: SepaConfig; preview?: boolean }) {
  const [state, action, pending] = useActionState(submitSurvey, initialState);
  const [existing, setExisting] = useState<"yes" | "no" | null>(null);
  const [join, setJoin] = useState<"yes" | "no" | null>(null);
  const [memberAction, setMemberAction] = useState("CONFIRM");
  const [anonymousDonation, setAnonymousDonation] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [directDebitConsent, setDirectDebitConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false); const [signatureAccepted,setSignatureAccepted]=useState(false); const [signerName,setSignerName]=useState("");
  const [oneTimeAmount, setOneTimeAmount] = useState("");
  const [fullName, setFullName] = useState("");
  const isOneTime = survey.templateKey === "ONE_TIME_DONATION";

  if (state.success) return <section className="survey-card survey-finished" aria-live="polite"><div className="survey-check">✓</div><p className="donor-eyebrow">Aanvraag afgerond</p><h1>Hartelijk dank</h1><p>{state.message}</p></section>;

  if (state.step === "VERIFY_EXISTING") return <form action={action} className="survey-card">
    <input name="surveyId" type="hidden" value={survey.id} /><input name="mode" type="hidden" value="VERIFY_EXISTING" /><input name="challengeId" type="hidden" value={state.challengeId ?? ""} />
    <header className="survey-heading"><p className="donor-eyebrow">Beveiligde controle</p><h1>Bevestig dat u het bent</h1><p>{state.message}{state.maskedEmail ? ` Code verstuurd naar ${state.maskedEmail}.` : ""}</p></header>
    <label>Verificatiecode<input autoComplete="one-time-code" inputMode="numeric" maxLength={6} name="verificationCode" pattern="[0-9]{6}" required /></label>
    <button className="donor-submit-button survey-submit" disabled={pending} type="submit">{pending ? "Code controleren..." : "Code controleren"}</button>
    <div className="text-center"><p className="text-sm text-slate-600">Geen code ontvangen? Controleer ook uw spammap.</p><button className="mt-2 font-bold text-[#0f5f9f] underline disabled:opacity-60" disabled={pending} formNoValidate name="intent" type="submit" value="RESEND_CODE">{pending ? "Even geduld..." : "Stuur de code opnieuw"}</button></div>
  </form>;

  if (state.step === "EXISTING_OPTIONS") return <form action={action} className="survey-card">
    <input name="surveyId" type="hidden" value={survey.id} /><input name="mode" type="hidden" value="MEMBER_REQUEST" /><input name="challengeId" type="hidden" value={state.challengeId ?? ""} /><input name="accessToken" type="hidden" value={state.accessToken ?? ""} />
    <header className="survey-heading"><p className="donor-eyebrow">Bestaande donateur herkend</p><h1>Wat wilt u doen?</h1><p>{state.message}</p></header>
    <div className="survey-choices">
      <label className="survey-choice"><input checked={memberAction === "CONFIRM"} name="memberAction" onChange={() => setMemberAction("CONFIRM")} type="radio" value="CONFIRM" /><span>Mijn donateurschap bevestigen</span></label>
      <label className="survey-choice"><input checked={memberAction === "CHANGE_AMOUNT"} name="memberAction" onChange={() => setMemberAction("CHANGE_AMOUNT")} type="radio" value="CHANGE_AMOUNT" /><span>Mijn maandbedrag aanpassen</span></label>
      <label className="survey-choice"><input checked={memberAction === "CANCEL"} name="memberAction" onChange={() => setMemberAction("CANCEL")} type="radio" value="CANCEL" /><span>Mijn donateurschap opzeggen</span></label>
    </div>
    {memberAction === "CHANGE_AMOUNT" ? <label>Nieuw maandbedrag (€)<input inputMode="decimal" name="requestedAmount" onChange={(event) => setRequestedAmount(event.target.value)} required step="0.01" type="number" value={requestedAmount} /></label> : null}
    {memberAction === "CANCEL" ? <p className="survey-note">Uw donateurschap wordt direct opgezegd.</p> : null}
    <button className="donor-submit-button survey-submit" disabled={pending} type="submit">{pending ? "Wijziging verwerken..." : "Wijziging bevestigen"}</button>
  </form>;

  const error = (name: string) => state.errors?.[name] ? <p className="survey-error">{state.errors[name]}</p> : null;
  const canSubmit = isOneTime || existing === "yes" || join !== null;

  return <form action={preview ? undefined : action} className="survey-card">
    <input name="surveyId" type="hidden" value={survey.id} />
    {preview ? <p className="rounded-md bg-amber-100 p-3 text-center text-sm font-bold text-amber-900">Voorbeeldmodus – antwoorden worden niet opgeslagen</p> : null}
    <div className="survey-heading"><p className="donor-eyebrow">{isOneTime ? "Eenmalige donatie" : "Donateurschap"} · Masjid Ghausia</p><h1>{survey.title}</h1>{survey.description ? <p>{survey.description}</p> : !isOneTime ? <p>Meld u aan of beheer uw bestaande donateurschap.</p> : null}</div>

    {!isOneTime ? <fieldset className="survey-section"><legend>{settings.contactHeading}</legend><div className="survey-grid">
      <label>{settings.firstNameLabel}<input autoComplete="given-name" maxLength={60} name="firstName" onChange={(event) => setFirstName(event.target.value)} pattern="[A-Za-zÀ-ÖØ-öø-ÿĀ-ž' -]+" required value={firstName} /></label>
      <label>{settings.lastNameLabel}<input autoComplete="family-name" maxLength={60} name="lastName" onChange={(event) => setLastName(event.target.value)} pattern="[A-Za-zÀ-ÖØ-öø-ÿĀ-ž' -]+" required value={lastName} /></label>
      <label>{settings.phoneLabel}<input autoComplete="tel" inputMode="tel" maxLength={20} name="phone" onChange={(event) => setPhone(event.target.value)} pattern="\+?[0-9() .-]{8,20}" required type="tel" value={phone} /></label>
      <label>{settings.emailLabel}<input autoComplete="email" maxLength={200} name="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
    </div>{error("firstName")}{error("lastName")}{error("phone")}{error("email")}</fieldset> : null}

    {isOneTime ? <fieldset className="survey-section"><div className="survey-grid">
      <label>{settings.oneTimeAmountLabel}<input inputMode="decimal" max="100000" name="oneTimeAmount" onChange={(event) => setOneTimeAmount(event.target.value)} placeholder={settings.oneTimeAmountPlaceholder} required step="0.01" type="number" value={oneTimeAmount} /></label>
      {!anonymousDonation ? <label>{settings.oneTimeNameLabel}<input autoComplete="name" maxLength={120} name="fullName" onChange={(event) => setFullName(event.target.value)} required value={fullName} /></label> : null}
    </div><label className="survey-consent"><input checked={anonymousDonation} className="w-auto" name="anonymousDonation" onChange={(event) => setAnonymousDonation(event.target.checked)} type="checkbox" /><span>Anoniem doneren</span></label>{error("fullName")}{error("oneTimeAmount")}</fieldset>
    : <>
      <fieldset className="survey-section"><legend><span>1</span> {settings.question1}</legend><div className="survey-choices">
        <Choice checked={existing === "yes"} label={settings.yesLabel} name="isExistingDonor" onChange={() => { setExisting("yes"); setJoin(null); }} value="yes" />
        <Choice checked={existing === "no"} label={settings.noLabel} name="isExistingDonor" onChange={() => { setExisting("no"); setJoin(null); }} value="no" />
      </div>{existing === "yes" ? <p className="survey-note">{settings.existingDonorNote}</p> : null}{error("isExistingDonor")}</fieldset>
      {existing === "no" ? <fieldset className="survey-section survey-reveal"><legend><span>2</span> {settings.question2}</legend><div className="survey-choices">
        <Choice checked={join === "yes"} label={settings.joinYesLabel} name="wantsToBecomeDonor" onChange={() => setJoin("yes")} value="yes" />
        <Choice checked={join === "no"} label={settings.joinNoLabel} name="wantsToBecomeDonor" onChange={() => setJoin("no")} value="no" />
      </div>{error("wantsToBecomeDonor")}{join === "yes" ? <div className="survey-mandate survey-reveal">
        <label>{settings.monthlyAmountLabel}<input inputMode="decimal" name="monthlyAmount" onChange={(event) => setMonthlyAmount(event.target.value)} placeholder="Bijvoorbeeld 10,00" required step="0.01" type="number" value={monthlyAmount} /></label>{error("monthlyAmount")}
        <details className="rounded-lg border border-emerald-200 bg-white p-4"><summary className="cursor-pointer font-bold text-[#0f5f9f]">Bekijk de volledige machtiging en voorwaarden</summary><div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700"><p><strong>Incassant:</strong> {sepaConfig.legalName || "Nog niet ingesteld"}</p><p><strong>Incassant-ID:</strong> {sepaConfig.creditorIdentifier || "Nog niet ingesteld"}</p><p>U machtigt de organisatie om het gekozen bedrag maandelijks via Mollie/SEPA af te schrijven. De eerste donatie wordt direct via Mollie betaald; de volgende volgt ongeveer een maand later.</p><p>De donatie is vrijwillig, zonder boete of vaste einddatum. U kunt het bedrag altijd wijzigen en kosteloos opzeggen. Uw wettelijke SEPA-terugboekingsrechten blijven bestaan: binnen acht weken zonder reden en bij een niet-toegestane incasso mogelijk tot dertien maanden.</p><p>Na ondertekening wordt een versievaste machtiging opgesteld en per e-mail toegezonden. Versie: {sepaConfig.termsVersion}</p></div></details>
        <input name="termsVersion" type="hidden" value={sepaConfig.termsVersion}/>
        <label className="survey-consent"><input checked={directDebitConsent} name="directDebitConsent" onChange={(event) => setDirectDebitConsent(event.target.checked)} required type="checkbox" /><span>Ik geef toestemming voor de maandelijkse donatie en automatische SEPA-incasso via Mollie.</span></label>{error("directDebitConsent")}
        <label className="survey-consent"><input checked={termsAccepted} name="termsAccepted" onChange={e=>setTermsAccepted(e.target.checked)} required type="checkbox"/><span>Ik heb het bedrag, de frequentie, mijn opzegmogelijkheid en de volledige voorwaarden gelezen en begrepen.</span></label>{error("termsAccepted")}
        <label>Volledige naam als digitale ondertekening<input name="signerName" onChange={e=>setSignerName(e.target.value)} required value={signerName}/></label>{error("signerName")}
        <label className="survey-consent"><input checked={signatureAccepted} name="signatureAccepted" onChange={e=>setSignatureAccepted(e.target.checked)} required type="checkbox"/><span>Ik bevestig dat bovenstaande naam mijn digitale ondertekening is en dat het systeem een machtigingsdocument met datum en akkoordgegevens opstelt.</span></label>{error("signatureAccepted")}
      </div> : join === "no" ? <p className="survey-note">{settings.noMembershipNote}</p> : null}</fieldset> : null}
    </>}
    {state.message ? <p className="survey-error" role="alert">{state.message}</p> : null}
    {(canSubmit || preview) ? <button className="donor-submit-button survey-submit" disabled={pending || preview} type={preview ? "button" : "submit"}>{preview ? "Voorbeeld – verzenden uitgeschakeld" : pending ? (isOneTime ? "Betaalpagina openen..." : "Aanmelding verzenden...") : isOneTime ? "Verder naar betalen" : settings.submitLabel}</button> : null}
    {!isOneTime ? <p className="survey-privacy">{settings.privacyText}</p> : null}
  </form>;
}
