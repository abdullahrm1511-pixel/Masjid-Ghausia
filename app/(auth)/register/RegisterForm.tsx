"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { submitRegistration, type RegistrationState } from "./actions";
import { SubmitButton } from "@/components/donor/SubmitButton";

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

const ID_IMAGE_TARGET_BYTES = 900 * 1024;
const ID_IMAGE_MAX_SIDE = 1600;
const ID_IMAGE_MIN_SIDE = 1100;

function readableFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Kon afbeelding niet verkleinen"));
      },
      "image/jpeg",
      quality
    );
  });
}

async function compressIdentityImage(file: File) {
  if (!file.type.startsWith("image/")) return file;

  const image = await loadImage(file);
  let maxSide = ID_IMAGE_MAX_SIDE;
  let quality = 0.76;
  let bestBlob: Blob | null = null;

  while (maxSide >= ID_IMAGE_MIN_SIDE) {
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) throw new Error("Kon afbeelding niet verwerken");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    while (quality >= 0.58) {
      const blob = await canvasToBlob(canvas, quality);
      bestBlob = blob;
      if (blob.size <= ID_IMAGE_TARGET_BYTES) {
        return new File([blob], "id-document.jpg", { type: "image/jpeg", lastModified: Date.now() });
      }
      quality -= 0.08;
    }

    maxSide -= 200;
    quality = 0.72;
  }

  if (!bestBlob) return file;
  return new File([bestBlob], "id-document.jpg", { type: "image/jpeg", lastModified: Date.now() });
}

export function RegisterForm({ error }: { error?: string }) {
  const [state, formAction] = useActionState<RegistrationState, FormData>(submitRegistration, {
    errors: error ? [error] : [],
    values: {},
    verificationRequired: false
  });
  const [hasPartner, setHasPartner] = useState("no");
  const [hasChildren, setHasChildren] = useState("no");
  const [children, setChildren] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [privacyScrolled, setPrivacyScrolled] = useState(false);
  const [identityFileMessage, setIdentityFileMessage] = useState("");
  const [identityProcessing, setIdentityProcessing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const skipCompressionRef = useRef(false);
  const childCount = children.length ? Math.max(...children) + 1 : 0;
  const steps = ["Hoofddonateur", "Partner", "Kinderen", "Contact", "ID Uploaden", "Bevestiging"];
  const field = (name: string) => state.values[name] ?? "";
  const formKey = JSON.stringify(state.values);
  const today = new Date().toISOString().slice(0, 10);
  const namePattern = "[A-Za-zÀ-ÖØ-öø-ÿ\\s]+";

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
    setPrivacyScrolled(state.values.termsAccepted === "on");
    setStep(state.verificationRequired ? steps.length - 1 : 0);
  }, [state.values, state.verificationRequired, steps.length]);

  const maritalStatus = hasPartner === "yes" ? "MARRIED" : "SINGLE";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (skipCompressionRef.current) {
      skipCompressionRef.current = false;
      return;
    }

    const input = event.currentTarget.elements.namedItem("identityDocument") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    event.preventDefault();
    setIdentityProcessing(true);
    setIdentityFileMessage("Foto wordt verkleind...");

    try {
      const compressed = await compressIdentityImage(file);
      const transfer = new DataTransfer();
      transfer.items.add(compressed);
      input.files = transfer.files;
      setIdentityFileMessage(`Foto verkleind van ${readableFileSize(file.size)} naar ${readableFileSize(compressed.size)}.`);
      skipCompressionRef.current = true;
      formRef.current?.requestSubmit();
    } catch {
      setIdentityFileMessage("Foto kon niet automatisch verkleind worden. Kies eventueel een duidelijkere of kleinere foto.");
      skipCompressionRef.current = true;
      formRef.current?.requestSubmit();
    } finally {
      setIdentityProcessing(false);
    }
  }

  return (
    <form action={formAction} className="grid gap-5 sm:gap-6" key={formKey} noValidate onSubmit={handleSubmit} ref={formRef}>
      <input name="maritalStatus" type="hidden" value={maritalStatus} />
      {state.errors.length ? (
        <div className="grid gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {state.errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}
      {state.message ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          {state.message}
        </div>
      ) : null}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {steps.map((label, index) => (
          <button
            className={`shrink-0 rounded-md border px-3 py-2 text-sm font-semibold ${step === index ? "border-[#0f766e] bg-[#0f766e] text-white shadow-sm" : "border-slate-300 bg-white text-slate-700 hover:border-[#0f766e]/40 hover:bg-emerald-50"}`}
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
          <label>Voornaam<input name="firstName" pattern={namePattern} defaultValue={field("firstName")} required /></label>
          <label>Achternaam<input name="lastName" pattern={namePattern} defaultValue={field("lastName")} required /></label>
          <label>Geslacht<select name="gender" defaultValue={field("gender") || "MALE"} required><option value="MALE">Man</option><option value="FEMALE">Vrouw</option></select></label>
          <label>Geboortedatum<input name="dateOfBirth" type="date" max={today} defaultValue={field("dateOfBirth")} required /></label>
          <label>Geboorteplaats<input name="birthPlace" defaultValue={field("birthPlace")} required /></label>
          <label>Telefoon<input name="phone" inputMode="numeric" pattern="06[0-9]{8}" maxLength={10} placeholder="0612345678" defaultValue={field("phone")} required /></label>
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
            <label>Voornaam<input name="partner.firstName" pattern={namePattern} defaultValue={field("partner.firstName")} /></label>
            <label>Achternaam<input name="partner.lastName" pattern={namePattern} defaultValue={field("partner.lastName")} /></label>
            <label>Geslacht<select name="partner.gender" defaultValue={field("partner.gender") || "MALE"}><option value="MALE">Man</option><option value="FEMALE">Vrouw</option></select></label>
            <label>Geboortedatum<input name="partner.dateOfBirth" type="date" max={today} defaultValue={field("partner.dateOfBirth")} /></label>
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
                <label>Voornaam<input name={`child.${index}.firstName`} pattern={namePattern} defaultValue={field(`child.${index}.firstName`)} /></label>
                <label>Achternaam<input name={`child.${index}.lastName`} pattern={namePattern} defaultValue={field(`child.${index}.lastName`)} /></label>
                <label>Geslacht<select name={`child.${index}.gender`} defaultValue={field(`child.${index}.gender`) || "MALE"}><option value="MALE">Jongen</option><option value="FEMALE">Meisje</option></select></label>
                <label>Geboortedatum<input name={`child.${index}.dateOfBirth`} type="date" max={today} defaultValue={field(`child.${index}.dateOfBirth`)} /></label>
                <label>Geboorteplaats<input name={`child.${index}.birthPlace`} defaultValue={field(`child.${index}.birthPlace`)} /></label>
              </div>
            ))}
            <button className="w-full rounded-md border border-[#0f766e] px-4 py-2 font-semibold text-[#115e59] hover:bg-emerald-50 sm:w-fit" type="button" onClick={() => setChildren((items) => [...items, childCount])}>
              Kind toevoegen
            </button>
          </>
        ) : null}
      </section>

      <section className={`grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${step === 3 ? "" : "hidden"}`}>
        <h2 className="text-xl font-bold text-slate-900">Contactpersoon Pakistan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>Contactpersoon Pakistan<input name="pakistanContactName" pattern={namePattern} defaultValue={field("pakistanContactName")} /></label>
          <label>Telefoon Pakistan<input name="pakistanContactPhone" inputMode="numeric" pattern="[0-9]*" defaultValue={field("pakistanContactPhone")} /></label>
        </div>
        <label>Uitvaartwensen<textarea name="funeralWishes" rows={4} defaultValue={field("funeralWishes")} /></label>
      </section>

      <section className={`grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${step === 4 ? "" : "hidden"}`}>
        <h2 className="text-xl font-bold text-slate-900">ID Uploaden</h2>
        <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
          <label>
            Kopie ID
            <input
              accept="image/*,application/pdf"
              name="identityDocument"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                setIdentityFileMessage(file ? `${file.name} geselecteerd (${readableFileSize(file.size)}). Fotos worden automatisch verkleind bij indienen.` : "");
              }}
              type="file"
            />
          </label>
          <p className="text-sm font-semibold text-slate-600">
            Maak een foto met uw telefoon of kies een bestaande foto/PDF. Fotos worden automatisch zo klein mogelijk gemaakt terwijl ze leesbaar blijven. Maximale upload na verkleinen: 2 MB.
          </p>
          {identityFileMessage ? <p className="rounded-md bg-white p-3 text-sm font-semibold text-slate-700">{identityFileMessage}</p> : null}
          {state.verificationRequired ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              Selecteer het ID-bestand opnieuw voordat u de verificatiecode indient.
            </p>
          ) : null}
        </div>
      </section>

      <section className={`grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${step === 5 ? "" : "hidden"}`}>
        <h2 className="text-xl font-bold text-slate-900">Bevestiging</h2>
        <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-bold text-slate-900">Donatie</h3>
          <label>
            Donatiebedrag
            <input name="donationAmount" type="number" min="0" step="0.01" placeholder="0,00" defaultValue={field("donationAmount")} />
          </label>
        </div>
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
          <a
            className="rounded-md border border-[#0f766e] bg-white px-4 py-3 text-sm font-bold text-[#115e59] hover:bg-emerald-50"
            href="/documents/reglement-stgbc-13-02-2026.pdf"
            rel="noreferrer"
            target="_blank"
          >
            Reglement St. GBC openen of downloaden
          </a>
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
        {state.verificationRequired ? (
          <div className="grid gap-2 rounded-md border border-[#0f766e]/25 bg-emerald-50 p-4">
            <label className="font-semibold text-slate-900">
              Verificatiecode uit uw e-mail
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                name="verificationCode"
                pattern="[0-9]{6}"
                placeholder="123456"
                required
              />
            </label>
            <p className="text-sm text-slate-600">
              De code is 15 minuten geldig. Na een verlopen code kunt u het formulier opnieuw indienen om een nieuwe code te ontvangen.
            </p>
          </div>
        ) : null}
      </section>

      <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-3 border-t border-slate-200 bg-[#f6f8fb]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex sm:flex-wrap sm:justify-between sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <button className="rounded-md border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800" disabled={step === 0} formNoValidate onClick={(event) => { event.preventDefault(); setStep((value) => Math.max(0, value - 1)); }} type="button">
          Vorige
        </button>
        {step < steps.length - 1 ? (
          <button className="rounded-md bg-[#0f766e] px-5 py-3 font-semibold text-white shadow-sm hover:bg-[#115e59]" formNoValidate onClick={(event) => { event.preventDefault(); setStep((value) => Math.min(steps.length - 1, value + 1)); }} type="button">
            Volgende
          </button>
        ) : (
          <SubmitButton className="px-5 py-3 disabled:bg-slate-300 disabled:text-slate-600" disabled={!privacyScrolled || identityProcessing} pendingLabel={state.verificationRequired ? "Code controleren..." : "Code versturen..."}>
            {identityProcessing ? "Foto verkleinen..." : state.verificationRequired ? "Code controleren en indienen" : "Verificatiecode ontvangen"}
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
