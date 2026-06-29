"use client";

import { useActionState, useEffect, useState } from "react";
import { submitRegistration, type RegistrationState } from "./actions";

export function RegisterForm({ error }: { error?: string }) {
  const [state, formAction] = useActionState<RegistrationState, FormData>(submitRegistration, {
    errors: error ? [error] : [],
    values: {}
  });
  const [hasPartner, setHasPartner] = useState("no");
  const [hasChildren, setHasChildren] = useState("no");
  const [children, setChildren] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const childCount = children.length ? Math.max(...children) + 1 : 0;
  const steps = ["Hoofddonateur", "Partner", "Kinderen", "Contact", "Bevestiging"];
  const field = (name: string) => state.values[name] ?? "";
  const formKey = JSON.stringify(state.values);

  useEffect(() => {
    if (!Object.keys(state.values).length) return;

    const nextHasPartner = state.values.hasPartner || "no";
    const nextHasChildren = state.values.hasChildren || "no";
    setHasPartner(nextHasPartner);
    setHasChildren(nextHasChildren);

    const count = Number(state.values.childrenCount ?? 0);
    const nextChildren = Array.from({ length: count }, (_, index) => index).filter((index) =>
      Boolean(
        state.values[`child.${index}.firstName`] ||
          state.values[`child.${index}.lastName`] ||
          state.values[`child.${index}.dateOfBirth`] ||
          state.values[`child.${index}.birthPlace`]
      )
    );
    setChildren(nextChildren);
    setStep(0);
  }, [state.values]);

  return (
    <form action={formAction} className="grid gap-6" key={formKey} noValidate>
      {state.errors.length ? (
        <div className="grid gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {state.errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {steps.map((label, index) => (
          <button
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${step === index ? "border-[#1483d6] bg-[#1483d6] text-white" : "border-slate-300 text-slate-700"}`}
            key={label}
            onClick={() => setStep(index)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <section className={`grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${step === 0 ? "" : "hidden"}`}>
        <h2 className="text-xl font-bold text-slate-900">Hoofddonateur</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>Voornaam<input name="firstName" defaultValue={field("firstName")} required /></label>
          <label>Achternaam<input name="lastName" defaultValue={field("lastName")} required /></label>
          <label>Geslacht<select name="gender" defaultValue={field("gender") || "MALE"} required><option value="MALE">Man</option><option value="FEMALE">Vrouw</option></select></label>
          <label>Geboortedatum<input name="dateOfBirth" type="date" defaultValue={field("dateOfBirth")} required /></label>
          <label>Geboorteplaats<input name="birthPlace" defaultValue={field("birthPlace")} required /></label>
          <label>Telefoon<input name="phone" defaultValue={field("phone")} required /></label>
          <label>E-mailadres<input name="email" type="email" defaultValue={field("email")} required /></label>
          <label>Adres<input name="addressLine1" defaultValue={field("addressLine1")} required /></label>
          <label>Postcode<input name="postalCode" defaultValue={field("postalCode")} required /></label>
          <label>Woonplaats<input name="city" defaultValue={field("city")} required /></label>
          <label>IBAN<input name="iban" placeholder="NL79 ABNA 0543 4484 28" defaultValue={field("iban")} required /></label>
          <label>Naam rekeninghouder<input name="accountHolderName" defaultValue={field("accountHolderName")} required /></label>
          <label>Burgerlijke staat<select name="maritalStatus" defaultValue={field("maritalStatus") || "SINGLE"} required><option value="SINGLE">Alleenstaand</option><option value="MARRIED">Getrouwd</option><option value="WIDOWED">Weduwe/weduwnaar</option><option value="DIVORCED">Gescheiden</option></select></label>
          <label>Wachtwoord<input name="password" type="password" defaultValue={field("password")} required minLength={8} /></label>
          <label>Bevestig wachtwoord<input name="confirmPassword" type="password" defaultValue={field("confirmPassword")} required minLength={8} /></label>
        </div>
      </section>

      <section className={`grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${step === 1 ? "" : "hidden"}`}>
        <h2 className="text-xl font-bold text-slate-900">Partner</h2>
        <label>Heeft u een partner?<select name="hasPartner" value={hasPartner} onChange={(event) => setHasPartner(event.target.value)}><option value="no">Nee</option><option value="yes">Ja</option></select></label>
        {hasPartner === "yes" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label>Voornaam<input name="partner.firstName" defaultValue={field("partner.firstName")} /></label>
            <label>Achternaam<input name="partner.lastName" defaultValue={field("partner.lastName")} /></label>
            <label>Geslacht<select name="partner.gender" defaultValue={field("partner.gender") || "MALE"}><option value="MALE">Man</option><option value="FEMALE">Vrouw</option></select></label>
            <label>Geboortedatum<input name="partner.dateOfBirth" type="date" defaultValue={field("partner.dateOfBirth")} /></label>
            <label>Geboorteplaats<input name="partner.birthPlace" defaultValue={field("partner.birthPlace")} /></label>
          </div>
        ) : null}
      </section>

      <section className={`grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${step === 2 ? "" : "hidden"}`}>
        <h2 className="text-xl font-bold text-slate-900">Kinderen</h2>
        <label>Heeft u kinderen?<select name="hasChildren" value={hasChildren} onChange={(event) => setHasChildren(event.target.value)}><option value="no">Nee</option><option value="yes">Ja</option></select></label>
        <input type="hidden" name="childrenCount" value={childCount} />
        {hasChildren === "yes" ? (
          <>
            {children.map((index) => (
              <div className="grid gap-4 rounded-md border border-slate-200 p-4 sm:grid-cols-2" key={index}>
                <div className="flex items-center justify-between sm:col-span-2">
                  <h3 className="font-bold text-slate-900">Kind {children.indexOf(index) + 1}</h3>
                  <button className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700" type="button" onClick={() => setChildren((items) => items.filter((item) => item !== index))}>
                    Verwijderen
                  </button>
                </div>
                <label>Voornaam<input name={`child.${index}.firstName`} defaultValue={field(`child.${index}.firstName`)} /></label>
                <label>Achternaam<input name={`child.${index}.lastName`} defaultValue={field(`child.${index}.lastName`)} /></label>
                <label>Geslacht<select name={`child.${index}.gender`} defaultValue={field(`child.${index}.gender`) || "MALE"}><option value="MALE">Jongen</option><option value="FEMALE">Meisje</option></select></label>
                <label>Geboortedatum<input name={`child.${index}.dateOfBirth`} type="date" defaultValue={field(`child.${index}.dateOfBirth`)} /></label>
                <label>Geboorteplaats<input name={`child.${index}.birthPlace`} defaultValue={field(`child.${index}.birthPlace`)} /></label>
              </div>
            ))}
            <button className="w-fit rounded-md border border-[#1483d6] px-4 py-2 font-semibold text-[#0f5f9f]" type="button" onClick={() => setChildren((items) => [...items, childCount])}>
              Kind toevoegen
            </button>
          </>
        ) : null}
      </section>

      <section className={`grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${step === 3 ? "" : "hidden"}`}>
        <h2 className="text-xl font-bold text-slate-900">Contactpersoon Pakistan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>Contactpersoon Pakistan<input name="pakistanContactName" defaultValue={field("pakistanContactName")} /></label>
          <label>Telefoon Pakistan<input name="pakistanContactPhone" defaultValue={field("pakistanContactPhone")} /></label>
        </div>
        <label>Uitvaartwensen<textarea name="funeralWishes" rows={4} defaultValue={field("funeralWishes")} /></label>
      </section>

      <section className={`grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${step === 4 ? "" : "hidden"}`}>
        <h2 className="text-xl font-bold text-slate-900">Bevestiging</h2>
        <label className="flex grid-cols-none flex-row items-center gap-3 font-medium"><input className="w-auto" name="healthDeclaration" type="checkbox" defaultChecked={field("healthDeclaration") === "on"} /> Gezondheidsverklaring bevestigd</label>
        <label className="flex grid-cols-none flex-row items-center gap-3 font-medium"><input className="w-auto" name="legalResidence" type="checkbox" defaultChecked={field("legalResidence") === "on"} /> Verblijf in Nederland bevestigd</label>
        <label className="flex grid-cols-none flex-row items-center gap-3 font-medium"><input className="w-auto" name="termsAccepted" type="checkbox" defaultChecked={field("termsAccepted") === "on"} /> Voorwaarden en privacy akkoord</label>
      </section>

      <div className="flex flex-wrap justify-between gap-3">
        <button className="rounded-md border border-slate-300 px-5 py-3 font-semibold text-slate-800" disabled={step === 0} formNoValidate onClick={(event) => { event.preventDefault(); setStep((value) => Math.max(0, value - 1)); }} type="button">
          Vorige
        </button>
        {step < steps.length - 1 ? (
          <button className="rounded-md bg-[#1483d6] px-5 py-3 font-semibold text-white hover:bg-[#0f5f9f]" formNoValidate onClick={(event) => { event.preventDefault(); setStep((value) => Math.min(steps.length - 1, value + 1)); }} type="button">
            Volgende
          </button>
        ) : (
          <button className="rounded-md bg-[#1483d6] px-5 py-3 font-semibold text-white hover:bg-[#0f5f9f]" type="submit">
            Inschrijving indienen
          </button>
        )}
      </div>
    </form>
  );
}
