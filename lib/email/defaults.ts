export const EMAIL_PLACEHOLDERS = [
  "naam",
  "voornaam",
  "achternaam",
  "registratienummer",
  "status",
  "bedrag",
  "eenmalig_bedrag",
  "jaarlijks_bedrag",
  "donatie_bedrag",
  "rekeningnummer",
  "betaaldatum",
  "reden",
  "correctiebericht",
  "loginlink",
  "contact_email",
  "organisatie",
  "verification_link",
  "verification_code",
  "reset_link",
  "boete",
  "enquete_antwoord",
  "enquete_titel"
] as const;

export type EmailTemplateKey =
  | "EMAIL_VERIFICATION"
  | "REGISTRATION_VERIFICATION_CODE"
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
  | "PAYMENT_REMINDER_SECOND"
  | "MOSQUE_DONATION_REMINDER"
  | "ADMIN_NOTIFICATION"
  | "SURVEY_EXISTING_DONOR_CONFIRMED"
  | "SURVEY_NO_MEMBERSHIP"
  | "SURVEY_MEMBERSHIP_INTEREST"
  | "SURVEY_ONE_TIME_DONATION"
  | "FUNERAL_APPLICATION_RECEIVED"
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
    key: "REGISTRATION_VERIFICATION_CODE",
    name: "Registratiecode per e-mail",
    subject: "Uw verificatiecode voor het St. GBC Donateursportaal",
    bodyText: `Assalamu alaikum {{naam}},

Gebruik onderstaande code om uw registratie af te ronden:

{{verification_code}}

Deze code is 15 minuten geldig.

Als u deze registratie niet bent gestart, kunt u deze e-mail negeren.

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

Uw registratienummer is:
{{registratienummer}}

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

Uw registratienummer is:
{{registratienummer}}

Openstaande bedragen:
Eenmalig donatie: {{eenmalig_bedrag}}
Jaarlijks donatie: {{jaarlijks_bedrag}}
Maandelijkse moskee donatie: {{donatie_bedrag}}
Totaal: {{bedrag}}

Rekeningnummer:
{{rekeningnummer}}

In de aparte bijlage vindt u een PDF-kopie van uw ingevulde inschrijving.

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

Registratienummer:
{{registratienummer}}

Bedrag:
{{bedrag}}

Betaaldatum:
{{betaaldatum}}

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "PAYMENT_REMINDER",
    name: "Vriendelijke betalingsherinnering",
    subject: "Vriendelijke herinnering betaling St. GBC",
    bodyText: `Assalamu alaikum {{naam}},

Volgens onze administratie staat er nog een bedrag open.

Uw registratienummer is:
{{registratienummer}}

Openstaand bedrag:
{{bedrag}}

Wilt u dit bedrag op een geschikt moment overmaken naar:
{{rekeningnummer}}

Heeft u al betaald of klopt er iets niet? Dan kunt u deze herinnering negeren of contact opnemen met het bestuur.

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "PAYMENT_REMINDER_SECOND",
    name: "Tweede betalingsherinnering",
    subject: "Tweede herinnering openstaande betaling St. GBC",
    bodyText: `Assalamu alaikum {{naam}},

Wij sturen u nogmaals een vriendelijke herinnering, omdat er volgens onze administratie nog een bedrag openstaat.

Uw registratienummer is:
{{registratienummer}}

Openstaand bedrag:
{{bedrag}}

Wilt u dit controleren en, als de betaling nog niet is gedaan, het bedrag overmaken naar:
{{rekeningnummer}}

Als betaling door omstandigheden lastig is, neem gerust contact op met het bestuur. Dan kijken we samen naar een passende oplossing.

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "MOSQUE_DONATION_REMINDER",
    name: "Moskee donatie herinnering",
    subject: "Vriendelijke herinnering moskee donatie",
    bodyText: `Assalamu alaikum {{naam}},

Volgens onze administratie staat er nog een moskee donatie open.

Uw registratienummer is:
{{registratienummer}}

Openstaand bedrag:
{{bedrag}}

Wilt u dit bedrag op een geschikt moment overmaken naar:
{{rekeningnummer}}

Alvast hartelijk dank voor uw steun aan Masjid Ghausia.

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "ADMIN_NOTIFICATION",
    name: "Admin notificatie",
    subject: "Nieuwe actie in het St. GBC adminportaal",
    bodyText: `Assalamu alaikum {{naam}},

Er staat een nieuwe actie klaar in het adminportaal.

Status:
{{status}}

Open het portaal:
{{loginlink}}

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "SURVEY_EXISTING_DONOR_CONFIRMED",
    name: "Enquete: bestaand donateurschap bevestigd",
    subject: "Dank voor uw bevestiging",
    bodyText: `Assalamu alaikum {{naam}},

Hartelijk dank voor uw bevestiging dat u al donateur bent van Masjid Ghausia. Uw antwoord is goed ontvangen.

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "SURVEY_NO_MEMBERSHIP",
    name: "Enquete: geen donateurschap gewenst",
    subject: "Dank voor uw deelname aan onze enquete",
    bodyText: `Assalamu alaikum {{naam}},

Hartelijk dank voor uw tijd en voor het invullen van onze enquete. Uw antwoord is goed ontvangen.

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "SURVEY_MEMBERSHIP_INTEREST",
    name: "Enquete: interesse in donateurschap",
    subject: "Dank voor uw interesse in Masjid Ghausia",
    bodyText: `Assalamu alaikum {{naam}},

Hartelijk dank voor uw interesse om donateur te worden van Masjid Ghausia. Uw antwoorden en donatievoorkeur zijn goed ontvangen.

Zodra de beveiligde betaal- en machtigingslink beschikbaar is, informeren wij u over de vervolgstap. Er wordt tot die tijd niets automatisch afgeschreven.

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "SURVEY_ONE_TIME_DONATION",
    name: "Enquete: eenmalige donatie ontvangen",
    subject: "Dank voor uw reactie op {{enquete_titel}}",
    bodyText: `Assalamu alaikum {{naam}},

Hartelijk dank voor uw reactie op {{enquete_titel}}. Uw keuze voor de eenmalige donatie is goed ontvangen.

Zodra de beveiligde betaallink aan deze actie is toegevoegd, informeren wij u over de vervolgstap.

Met vriendelijke groet,
St. GBC Masjid Ghausia`
  },
  {
    key: "FUNERAL_APPLICATION_RECEIVED",
    name: "Begrafenisaanvraag ontvangen",
    subject: "Uw begrafenisaanvraag is ontvangen",
    bodyText: `Assalamu alaikum {{naam}},

Wij hebben uw begrafenisaanvraag ontvangen.

In de bijlage vindt u een kopie van het volledig ingevulde aanvraagformulier. Bewaar deze PDF voor uw eigen administratie.

Het bestuur neemt contact met u op over de verdere afhandeling.

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
