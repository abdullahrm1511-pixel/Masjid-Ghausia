"use client";

import { useActionState, useEffect, useState } from "react";
import { submitRegistration, type RegistrationState } from "./actions";

const privacyText = [
  {
    title: "Privacy en gegevensgebruik",
    body:
      "St. GBC Masjid Ghausia gebruikt uw gegevens voor inschrijving, donateursadministratie, gezinsgegevens, betalingen, wijzigingsverzoeken en interne controle door bevoegde beheerders."
  },
  {
    title: "Welke gegevens worden verwerkt",
    body:
      "Het portaal kan naam, adres, e-mail, telefoon, geboortedatum, geboorteplaats, geslacht, IBAN, rekeninghouder, lidnummer, partner- en kindgegevens, contactpersoon Pakistan, uitvaartwensen, betaalstatus en bestuursnotities verwerken."
  },
  {
    title: "Waarom deze gegevens nodig zijn",
    body:
      "Deze gegevens zijn nodig om uw aanvraag te beoordelen, een lidnummer toe te kennen, bijdragen te berekenen, betalingen te controleren, gezinswijzigingen te beheren en contact met u te onderhouden."
  },
  {
    title: "Betalingen en status",
    body:
      "Betalingen gebeuren buiten het portaal via bankoverschrijving. Nieuwe goedgekeurde inschrijvingen blijven inactief totdat het restant van de inschrijving 0 euro is."
  },
  {
    title: "Gezinsgegevens",
    body:
      "Partner- en kindgegevens worden alleen gebruikt voor administratie van het huishouden, bijdragen, leeftijdscontrole en situaties waarin gezinsopvolging of contactregistratie nodig is."
  },
  {
    title: "Toegang en beveiliging",
    body:
      "Alleen bevoegde gebruikers mogen gegevens bekijken of verwerken. Wachtwoorden worden niet leesbaar opgeslagen. Belangrijke beheeracties worden vastgelegd voor controle."
  },
  {
    title: "Wijzigingen en rechten",
    body:
      "U kunt uw gegevens bekijken en wijzigingen aanvragen. Het bestuur beoordeelt wijzigingsverzoeken voordat gegevens definitief worden aangepast."
  },
  {
    title: "Akkoord",
    body:
      "Door akkoord te geven bevestigt u dat u deze privacy- en voorwaardeninformatie hebt gelezen en dat u begrijpt dat uw gegevens voor bovenstaande doelen worden verwerkt."
  }
];

export function RegisterForm({ error }: { error?: string }) {
  const [state, formAction] = useActionState<RegistrationState, FormData>(submitRegistration, {
    errors: error ? [error] : [],
    values: {}
  });
  const [hasPartner, setHasPartner] = useState("no");
  const [hasChildren, setHasChildren] = useState("no");
  const [children, setChildren] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [privacyScrolled, setPrivacyScrolled] = useState(false);
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

  const maritalStatus = hasPartner === "yes" ? "MARRIED" : "SINGLE";

  return (
    <form action={formAction} className="grid gap-5 sm:gap-6" key={formKey} noValidate>
      <input name="maritalStatus" type="hidden" value={maritalStatus} />
      {state.errors.length ? (
        <div className="grid gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {state.errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {steps.map((label, index) => (
          <button
            className={`shrink-0 rounded-md border px-3 py-2 text-sm font-semibold ${step === index ? "border-[#1483d6] bg-[#1483d6] text-white" : "border-slate-300 bg-white text-slate-700"}`}
            key={label}
            onClick={() => setStep(index)}
            type="button"
          >
            <span className="sm:hidden">{index + 1}. </span>{label}
          </button>
        ))}
      </div>
      <section className={`grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${step === 0 ? "" : "hidden"}`}>
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
          <label>Wachtwoord<input name="password" type="password" defaultValue={field("password")} required minLength={8} /></label>
          <label>Bevestig wachtwoord<input name="confirmPassword" type="password" defaultValue={field("confirmPassword")} required minLength={8} /></label>
        </div>
      </section>

      <section className={`grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${step === 1 ? "" : "hidden"}`}>
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

      <section className={`grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${step === 2 ? "" : "hidden"}`}>
        <h2 className="text-xl font-bold text-slate-900">Kinderen</h2>
        <label>Heeft u kinderen?<select name="hasChildren" value={hasChildren} onChange={(event) => setHasChildren(event.target.value)}><option value="no">Nee</option><option value="yes">Ja</option></select></label>
        <input type="hidden" name="childrenCount" value={childCount} />
        {hasChildren === "yes" ? (
          <>
            {children.map((index) => (
              <div className="grid gap-4 rounded-md border border-slate-200 p-3 sm:grid-cols-2 sm:p-4" key={index}>
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
            <button className="w-full rounded-md border border-[#1483d6] px-4 py-2 font-semibold text-[#0f5f9f] sm:w-fit" type="button" onClick={() => setChildren((items) => [...items, childCount])}>
              Kind toevoegen
            </button>
          </>
        ) : null}
      </section>

      <section className={`grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${step === 3 ? "" : "hidden"}`}>
        <h2 className="text-xl font-bold text-slate-900">Contactpersoon Pakistan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>Contactpersoon Pakistan<input name="pakistanContactName" defaultValue={field("pakistanContactName")} /></label>
          <label>Telefoon Pakistan<input name="pakistanContactPhone" defaultValue={field("pakistanContactPhone")} /></label>
        </div>
        <label>Uitvaartwensen<textarea name="funeralWishes" rows={4} defaultValue={field("funeralWishes")} /></label>
      </section>

      <section className={`grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${step === 4 ? "" : "hidden"}`}>
        <h2 className="text-xl font-bold text-slate-900">Bevestiging</h2>
        <label className="flex grid-cols-none flex-row items-center gap-3 font-medium"><input className="w-auto" name="healthDeclaration" type="checkbox" defaultChecked={field("healthDeclaration") === "on"} /> Gezondheidsverklaring bevestigd</label>
        <label className="flex grid-cols-none flex-row items-center gap-3 font-medium"><input className="w-auto" name="legalResidence" type="checkbox" defaultChecked={field("legalResidence") === "on"} /> Verblijf in Nederland bevestigd</label>
        <div className="grid gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Privacy en voorwaarden lezen</h3>
            <p className="mt-1 text-sm text-slate-600">Scroll helemaal naar beneden. Daarna kunt u akkoord geven.</p>
          </div>
          <div
            className="max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
            onScroll={(event) => {
              const element = event.currentTarget;
              const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 8;
              if (atBottom) setPrivacyScrolled(true);
            }}
            tabIndex={0}
          >
            <div className="grid gap-4">
              {privacyText.map((section) => (
                <section className="grid gap-1" key={section.title}>
                  <h4 className="font-bold text-slate-950">{section.title}</h4>
                  <p>{section.body}</p>
                </section>
              ))}
              <p className="rounded-md bg-white p-3 font-semibold text-slate-900">
                U bent onderaan. De akkoord-optie wordt nu beschikbaar.
              </p>
            </div>
          </div>
          {privacyScrolled ? (
            <label className="flex grid-cols-none flex-row items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 font-medium text-emerald-950">
              <input className="w-auto" name="termsAccepted" type="checkbox" defaultChecked={field("termsAccepted") === "on"} /> Voorwaarden en privacy akkoord
            </label>
          ) : (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              De akkoord-optie verschijnt nadat u de privacytekst helemaal hebt gescrold.
            </p>
          )}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-3 border-t border-slate-200 bg-[#f6f8fb]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex sm:flex-wrap sm:justify-between sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <button className="rounded-md border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800" disabled={step === 0} formNoValidate onClick={(event) => { event.preventDefault(); setStep((value) => Math.max(0, value - 1)); }} type="button">
          Vorige
        </button>
        {step < steps.length - 1 ? (
          <button className="rounded-md bg-[#1483d6] px-5 py-3 font-semibold text-white hover:bg-[#0f5f9f]" formNoValidate onClick={(event) => { event.preventDefault(); setStep((value) => Math.min(steps.length - 1, value + 1)); }} type="button">
            Volgende
          </button>
        ) : (
          <button className="rounded-md bg-[#1483d6] px-5 py-3 font-semibold text-white hover:bg-[#0f5f9f] disabled:bg-slate-300 disabled:text-slate-600" disabled={!privacyScrolled} type="submit">
            Inschrijving indienen
          </button>
        )}
      </div>
    </form>
  );
}
