export const EMAIL_PLACEHOLDERS = [
  "naam",
  "voornaam",
  "achternaam",
  "lidnummer",
  "status",
  "bedrag",
  "betaaldatum",
  "reden",
  "correctiebericht",
  "loginlink",
  "contact_email",
  "organisatie",
  "verification_link",
  "reset_link"
] as const;

export type EmailTemplateKey =
  | "EMAIL_VERIFICATION"
  | "REGISTRATION_RECEIVED"
  | "REGISTRATION_ANSWERS_COPY"
  | "REGISTRATION_APPROVED_PAYMENT_REQUIRED"
  | "REGISTRATION_REJECTED"
  | "CORRECTION_REQUIRED"
  | "CHANGE_REQUEST_RECEIVED"
  | "CHANGE_REQUEST_APPROVED"
  | "CHANGE_REQUEST_REJECTED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_REMINDER"
  | "PASSWORD_RESET";

export type DefaultEmailTemplate = {
  key: EmailTemplateKey;
  name: string;
  subject: string;
  bodyText: string;
};

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    key: "EMAIL_VERIFICATION",
    name: "E-mailadres bevestigen",
    subject: "Bevestig uw e-mailadres voor het St. GBC Donateursportaal",
    bodyText: `Assalamu alaikum {{naam}},

Bedankt voor uw registratie bij het St. GBC Donateursportaal.

Klik op onderstaande link om uw e-mailadres te bevestigen:
{{verification_link}}

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "REGISTRATION_RECEIVED",
    name: "Inschrijving ontvangen",
    subject: "Uw inschrijving is ontvangen",
    bodyText: `Assalamu alaikum {{naam}},

Wij hebben uw inschrijving ontvangen.

Het bestuur zal uw aanvraag beoordelen. Na beoordeling ontvangt u bericht over de vervolgstappen.

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "REGISTRATION_ANSWERS_COPY",
    name: "Kopie ingevulde inschrijving",
    subject: "Kopie van uw ingevulde inschrijving",
    bodyText: `Assalamu alaikum {{naam}},

In de bijlage vindt u een PDF-kopie van uw ingevulde inschrijving.

Controleer uw gegevens goed. Als u later een wijziging wilt doorgeven, kunt u dit via het portaal aanvragen.

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "REGISTRATION_APPROVED_PAYMENT_REQUIRED",
    name: "Goedgekeurd, betaling vereist",
    subject: "Uw inschrijving is goedgekeurd - betaling vereist",
    bodyText: `Assalamu alaikum {{naam}},

Uw inschrijving is goedgekeurd.

Uw lidnummer is:
{{lidnummer}}

Om volledig actief te worden, moet de eerste betaling nog door het bestuur worden bevestigd.

U kunt de betaling extern uitvoeren volgens de instructies van het bestuur.

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "REGISTRATION_REJECTED",
    name: "Inschrijving afgewezen",
    subject: "Uw inschrijving is afgewezen",
    bodyText: `Assalamu alaikum {{naam}},

Uw inschrijving is beoordeeld door het bestuur.

Bericht van het bestuur:
{{reden}}

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "CORRECTION_REQUIRED",
    name: "Correctie nodig",
    subject: "Aanvulling of correctie nodig voor uw inschrijving",
    bodyText: `Assalamu alaikum {{naam}},

Het bestuur heeft uw inschrijving bekeken en vraagt om een aanvulling of correctie.

Bericht van het bestuur:
{{correctiebericht}}

Log in op het portaal om uw gegevens aan te passen:
{{loginlink}}

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "CHANGE_REQUEST_RECEIVED",
    name: "Wijzigingsverzoek ontvangen",
    subject: "Uw wijzigingsverzoek is ontvangen",
    bodyText: `Assalamu alaikum {{naam}},

Wij hebben uw wijzigingsverzoek ontvangen.

Het bestuur zal uw verzoek beoordelen. Tot die tijd blijven uw bestaande gegevens actief.

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "CHANGE_REQUEST_APPROVED",
    name: "Wijzigingsverzoek goedgekeurd",
    subject: "Uw wijzigingsverzoek is goedgekeurd",
    bodyText: `Assalamu alaikum {{naam}},

Uw wijzigingsverzoek is goedgekeurd en verwerkt.

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "CHANGE_REQUEST_REJECTED",
    name: "Wijzigingsverzoek afgewezen",
    subject: "Uw wijzigingsverzoek is afgewezen",
    bodyText: `Assalamu alaikum {{naam}},

Uw wijzigingsverzoek is beoordeeld door het bestuur.

Bericht van het bestuur:
{{reden}}

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "PAYMENT_CONFIRMED",
    name: "Betaling bevestigd",
    subject: "Uw betaling is bevestigd",
    bodyText: `Assalamu alaikum {{naam}},

Wij hebben uw betaling ontvangen en administratief verwerkt.

Lidnummer:
{{lidnummer}}

Bedrag:
{{bedrag}}

Betaaldatum:
{{betaaldatum}}

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "PAYMENT_REMINDER",
    name: "Betalingsherinnering",
    subject: "Herinnering betaling St. GBC",
    bodyText: `Assalamu alaikum {{naam}},

Volgens onze administratie staat er nog een betaling open.

Lidnummer:
{{lidnummer}}

Openstaand bedrag:
{{bedrag}}

Neem contact op met het bestuur als u hierover vragen heeft.

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "PASSWORD_RESET",
    name: "Wachtwoord reset",
    subject: "Wachtwoord opnieuw instellen",
    bodyText: `Assalamu alaikum {{naam}},

U heeft een verzoek gedaan om uw wachtwoord opnieuw in te stellen.

Klik op onderstaande link:
{{reset_link}}

Als u dit niet heeft aangevraagd, kunt u deze e-mail negeren.

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  }
];
