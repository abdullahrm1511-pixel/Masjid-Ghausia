"use client";

import { useActionState, useState } from "react";
import { submitSurvey, type SurveyState } from "./actions";
import type { FixedSurveySettings } from "@/lib/survey";

const initialState: SurveyState = { success: false, message: "" };
function Choice({ name, value, label, onChange }: { name: string; value: string; label: string; onChange: () => void }) {
  return <label className="survey-choice"><input name={name} onChange={onChange} required type="radio" value={value} /><span>{label}</span></label>;
}
function donationSubject(title: string) { return title.replace(/^donatie\s+(voor\s+)?/i, "").trim() || title; }

export function SurveyForm({ survey, settings }: { survey: { id: string; title: string; description: string | null; templateKey: string }; settings: FixedSurveySettings }) {
  const [state, action, pending] = useActionState(submitSurvey, initialState);
  const [existing, setExisting] = useState<"yes" | "no" | null>(null);
  const [join, setJoin] = useState<"yes" | "no" | null>(null);
  const [monthly, setMonthly] = useState<"yes" | "no" | null>(null);
  const isOneTime = survey.templateKey === "ONE_TIME_DONATION";
  if (state.success) return <section className="survey-card survey-finished" aria-live="polite"><div className="survey-check">✓</div><p className="donor-eyebrow">Enquête afgerond</p><h1>Hartelijk dank</h1><p>{state.message}</p></section>;
  const error = (name: string) => state.errors?.[name] ? <p className="survey-error">{state.errors[name]}</p> : null;
  const canSubmit = isOneTime || existing === "yes" || join === "no" || monthly !== null;

  return <form action={action} className="survey-card">
    <input name="surveyId" type="hidden" value={survey.id} />
    <div className="survey-heading"><p className="donor-eyebrow">Enquête van Masjid Ghausia</p><h1>{survey.title}</h1><p>{survey.description || (isOneTime ? "Via dit formulier kunt u uw eenmalige donatie doorgeven." : "Met uw antwoorden kunnen wij onze donateursadministratie verbeteren.")}</p></div>
    {!isOneTime ? <fieldset className="survey-section"><legend>{settings.contactHeading}</legend><div className="survey-grid">
      <label>{settings.firstNameLabel}<input autoComplete="given-name" maxLength={60} name="firstName" pattern="[A-Za-zÀ-ÖØ-öø-ÿĀ-ž' -]+" required /></label>
      <label>{settings.lastNameLabel}<input autoComplete="family-name" maxLength={60} name="lastName" pattern="[A-Za-zÀ-ÖØ-öø-ÿĀ-ž' -]+" required /></label>
      <label>{settings.phoneLabel}<input autoComplete="tel" inputMode="tel" maxLength={20} name="phone" pattern="\+?[0-9() .-]{8,20}" required type="tel" /></label>
      <label>{settings.emailLabel}<input autoComplete="email" maxLength={200} name="email" required type="email" /></label>
    </div>{error("firstName")}{error("lastName")}{error("phone")}{error("email")}</fieldset> : null}

    {isOneTime ? <fieldset className="survey-section"><legend>{settings.oneTimeHeading} voor {donationSubject(survey.title)}</legend><div className="survey-grid"><label>{settings.oneTimeNameLabel}<input autoComplete="name" maxLength={120} name="fullName" required /></label><label>{settings.oneTimeAmountLabel}<input inputMode="decimal" max="100000" min="1" name="oneTimeAmount" placeholder={settings.oneTimeAmountPlaceholder} required step="0.01" type="number" /></label></div>{error("fullName")}{error("oneTimeAmount")}</fieldset>
    : <>
      <fieldset className="survey-section"><legend><span>1</span> {settings.question1}</legend><div className="survey-choices"><Choice label={settings.yesLabel} name="isExistingDonor" onChange={() => { setExisting("yes"); setJoin(null); setMonthly(null); }} value="yes" /><Choice label={settings.noLabel} name="isExistingDonor" onChange={() => { setExisting("no"); setJoin(null); setMonthly(null); }} value="no" /></div>{existing === "yes" ? <p className="survey-note">{settings.existingDonorNote}</p> : null}{error("isExistingDonor")}</fieldset>
      {existing === "no" ? <fieldset className="survey-section survey-reveal"><legend><span>2</span> {settings.question2}</legend><div className="survey-choices"><Choice label={settings.joinYesLabel} name="wantsToBecomeDonor" onChange={() => { setJoin("yes"); setMonthly(null); }} value="yes" /><Choice label={settings.joinNoLabel} name="wantsToBecomeDonor" onChange={() => { setJoin("no"); setMonthly(null); }} value="no" /></div>{join === "no" ? <p className="survey-note">{settings.noMembershipNote}</p> : null}{error("wantsToBecomeDonor")}</fieldset> : null}
      {existing === "no" && join === "yes" ? <fieldset className="survey-section survey-reveal"><legend><span>3</span> {settings.question3}</legend><div className="survey-choices"><Choice label={settings.yesLabel} name="wantsMonthlyDonation" onChange={() => setMonthly("yes")} value="yes" /><Choice label={settings.noLabel} name="wantsMonthlyDonation" onChange={() => setMonthly("no")} value="no" /></div>{error("wantsMonthlyDonation")}{monthly === "yes" ? <div className="survey-mandate survey-reveal"><label>{settings.monthlyAmountLabel}<input inputMode="decimal" min="1" name="monthlyAmount" placeholder="Bijvoorbeeld 10,00" required step="0.01" type="number" /></label>{error("monthlyAmount")}<label className="survey-consent"><input name="directDebitConsent" required type="checkbox" /><span>{settings.consentText}</span></label>{error("directDebitConsent")}</div> : monthly === "no" ? <p className="survey-note">{settings.monthlyNoNote}</p> : null}</fieldset> : null}
    </>}
    {state.message ? <p className="survey-error" role="alert">{state.message}</p> : null}
    {canSubmit ? <button className="donor-submit-button survey-submit" disabled={pending} type="submit">{pending ? (isOneTime ? "Betaalpagina openen..." : "Antwoorden verzenden...") : isOneTime ? settings.oneTimeSubmitLabel : settings.submitLabel}</button> : null}
    <p className="survey-privacy">{settings.privacyText}</p>
  </form>;
}
