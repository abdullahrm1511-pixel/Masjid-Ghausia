# Functioneel rapport en handleiding

Project: St. GBC Donateursportaal  
Organisatie: St. GBC Masjid Ghausia  
Versie: 1.3  
Datum: 29 juni 2026

## 1. Doel van het portaal

Het St. GBC Donateursportaal is gemaakt om inschrijvingen, donateurs, gezinsgegevens, wijzigingsverzoeken, betalingen, import, export, controlepunten en prijsinstellingen centraal te beheren.

Het portaal heeft drie beheerlagen:

- Donateur: kan inschrijven, inloggen, eigen gegevens bekijken en wijzigingen aanvragen.
- Registratie-admin: kan registraties lezen, goedkeuren, afwijzen en om correctie vragen.
- Admin/super-admin: kan donateurs beheren, wijzigingsverzoeken verwerken, betalingen controleren, importeren, exporteren, instellingen beheren en het controlecentrum gebruiken.

Het portaal bevat handmatige bevestiging van bankbetalingen, bewerkbare e-mailtemplates, een e-maillog met voorbereide berichten, PDF-kopieen van inschrijvingen, bankimport met previewcontrole, een controlecentrum en gezinsbeheer voor 18+ kinderen, overleden leden en voogd/contactregistratie.

## 2. Belangrijkste termen

Donateur betekent een persoon die in het systeem staat als lid of donateur van St. GBC.

Hoofddonateur of primary member betekent de persoon op wie het account en het lidnummer staan.

Lidnummer betekent het registratienummer van de donateur. Nieuwe lidnummers beginnen met `11-00001` en lopen daarna oplopend door, bijvoorbeeld `11-00002`, `11-00003` enzovoort.

Lidmaatschap betekent de huishoudlaag onder een lidnummer. Onder een lidmaatschap kunnen een primary member, partner en kinderen vallen.

Partnerprofiel betekent een partner onder hetzelfde lidnummer. De partner is niet automatisch een aparte betalende donateur zolang er geen eigen lidnummer is.

Kind betekent een opgegeven kind binnen het gezin van de hoofddonateur.

IBAN betekent het bankrekeningnummer. Bij bankimport wordt de betaler-IBAN uit de omschrijving opgeslagen als betaalbewijs, maar het lidnummer blijft leidend voor de koppeling.

Bankexport betekent een Excel- of CSV-bestand met banktransacties. De kolom `Rekeningnummer` is de rekening van de organisatie. De betaler-IBAN staat in de omschrijving.

Controlecentrum betekent de centrale adminpagina waar registraties, open betalingen, importsignalen, gezinswijzigingen, verlopen eenmalige bijdragen en statuscontroles samen zichtbaar zijn.

Controle nodig betekent dat het systeem een regel niet automatisch verwerkt en dat een beheerder handmatig moet controleren.

Auditlog betekent een interne registratie van belangrijke acties, zoals goedkeuren, afwijzen, importeren, exporteren en statuswijzigingen.

## 3. Donateurstatussen

`PENDING` betekent dat een aanvraag is ontvangen en nog wacht op beoordeling.

`ACTION_REQUIRED` betekent dat het bestuur extra informatie nodig heeft of een correctie vraagt.

`ACTIVE` betekent dat de donateur actief is.

`INACTIVE` betekent dat de donateur administratief niet actief is. Nieuwe goedgekeurde registraties blijven inactief totdat het restant van de inschrijving 0 euro is.

`REJECTED` betekent dat de aanvraag of donateur is afgewezen.

`DECEASED` betekent dat de donateur als overleden is geregistreerd. Dit mag alleen na betrouwbare informatie.

## 4. Actief, inactief en overleden

Een nieuwe goedgekeurde registratie komt eerst op `INACTIVE`. Zodra de volledige inschrijfschuld is voldaan en het restant 0 euro is, kan de donateur actief worden gezet.

Inactief betekent dat de donateur niet als actief meetelt. Het dashboardblok "Inactief / betaling afwachtend" telt ook donateurs mee die nog op eerste betaling wachten.

Overleden betekent dat het bestuur betrouwbare informatie heeft ontvangen dat iemand is overleden. Bij overlijden moet zorgvuldig worden gekeken naar gezinsleden, contactpersonen en uitvaartwensen.

## 5. Donateur: inschrijven

Een nieuwe donateur vult de registratie in stappen in:

- Hoofddonateur: naam, geboortedatum, geboorteplaats, telefoon, adres, e-mail, wachtwoord, IBAN en rekeninghouder.
- Partner: gegevens van de partner als die aanwezig is.
- Kinderen: gegevens van kinderen.
- Contact: contactpersoon Pakistan en eventuele uitvaartwensen.
- Bevestiging: verklaringen en akkoord met voorwaarden/privacy. De privacy- en voorwaardeninformatie moet eerst volledig naar beneden worden gescrold voordat de akkoord-optie verschijnt.

Na verzenden komt de aanvraag binnen bij het bestuur met status `PENDING`.

Burgerlijke staat wordt bij een nieuwe inschrijving niet apart gevraagd in de eerste stap. Het portaal leidt de standaardsituatie af uit de partnerstap: met partner wordt dit als getrouwd/gezin verwerkt, zonder partner als alleenstaand. Latere administratieve correcties kunnen via beheer of wijzigingsverzoeken worden vastgelegd.

## 6. Donateur: dashboard en account

Het donateurdashboard toont de huidige status, het lidnummer, betaaloverzicht, eenmalige bijdrage, jaarlijkse bijdrage, accountgegevens, gezin en laatste wijzigingsverzoek.

Het betaaloverzicht toont:

- Totaal betaald.
- Openstaand bedrag.
- Laatste betaling.
- IBAN.

De donateur kan op "Mijn account" gegevens bekijken en wijzigingen aanvragen. Een wijziging wordt niet direct toegepast, maar wordt eerst een wijzigingsverzoek voor het bestuur.

## 7. Admin dashboard

Het admin dashboard geeft een snelle samenvatting van:

- Registraties in afwachting.
- Actieve donateurs.
- Inactief / betaling afwachtend.
- Actie vereist.
- Afgewezen.
- Overleden.
- Kinderen bijna 18.
- 18+ inschrijving nodig.
- Voogd/contact nodig.

De knop "Controlecentrum openen" brengt de admin naar de centrale werklijst.

## 8. Admin navigatie

Admin dashboard brengt de beheerder terug naar het overzicht.

Controlecentrum opent de dagelijkse werklijst.

Registraties opent nieuwe inschrijvingen.

Donateurs opent de donateurslijst. De dropdown bevat alle donateurs, actieve donateurs, inactief/betaling afwachtend, actie vereist, gezinswijzigingen, afgewezen en overleden.

Wijzigingsverzoeken opent aanvragen van donateurs om gegevens aan te passen.

E-mail opent e-mailtemplates en e-maillog.

Instellingen bevat prijsinstellingen, import, export en betaalcorrecties.

## 9. Controlecentrum

Het controlecentrum bundelt de belangrijkste aandachtspunten:

- Registraties en correcties.
- Open betalingen.
- Eenmalige bijdrage-termijnen binnen 90 dagen of verlopen.
- 18+ kinderen die zichzelf moeten inschrijven.
- Huishoudens waar voogd/contact nodig is.
- Mogelijke dubbele bankbetalingen.
- Statuscontrole, zoals inactief, betaling vereist, actie vereist en overleden zonder verwerkingsnotitie.

Het controlecentrum voert geen aparte nieuwe berekening uit. Het maakt bestaande signalen zichtbaar op een centrale plek.

## 10. Registraties beoordelen

De registratiepagina toont nieuwe aanvragen. De admin ziet onder andere naam, status, e-mail, telefoon, adres, geboortedatum, geboorteplaats, geslacht, IBAN, rekeninghouder, partner, kinderen en verklaringen.

Goedkeuren betekent dat er een lidnummer wordt toegekend en dat de berekende jaarlijkse bijdrage en eenmalige bijdrage worden klaargezet. De donateur blijft `INACTIVE` totdat het restant van de inschrijving 0 euro is.

Correctie vragen zet de aanvraag op `ACTION_REQUIRED` met een bericht voor de donateur en eventueel een interne notitie.

Afwijzen zet de aanvraag op `REJECTED`.

## 11. Donateurs beheren

De donateurspagina toont alle donateurs of een gekozen groep. Zoeken kan op lidnummer, naam, IBAN en status.

De tabel toont lidnummer, naam, IBAN, status, betaalstatus en acties. Profiel opent het volledige donateursprofiel. Financieel opent het financieel overzicht.

## 12. Financieel overzicht

Het financieel overzicht toont per donateur de financiele stand.

Bovenaan staan naam, lidnummer, donateurstatus en jaarbetalingstatus.

Het belangrijkste hoofdgetal is "Nog te betalen". Dit staat rood wanneer er open posten zijn.

Daaronder staan:

- Jaarlijks: jaarbijdrage, betaald bedrag en eventueel restant.
- Eenmalig: eenmalige bijdrage, betaald bedrag en restant.
- Boete: openstaande boete als die is geregistreerd.

Betaling registreren is een uitklapbaar onderdeel voor uitzonderingen en handmatige bankcontrole. Daarin staan ontvangen bedragen, aftrek/correcties, netto verwerkt, administratief saldo en extra ontvangen bedragen.

Positieve bedragen tellen als ontvangen geld. Negatieve bedragen worden gebruikt voor aftrek of correctie.

Betalingen worden administratief bijgehouden als bankbetalingen of importbetalingen. Contante betaling is niet de normale werkwijze.

Betaalhistorie toont datum, bedrag, betaler-IBAN, importbestand en omschrijving. IBAN is alleen bewijs/historie en bepaalt niet automatisch voor welk lid is betaald.

Bij een positieve betalingsregistratie wordt een betalingsbevestiging voorbereid in de e-maillog. Er wordt nog niets automatisch verzonden.

Betalingsregistraties resetten wist ontvangen betalingen, aftrekken, correcties en extra ontvangen bedragen van die donateur. De berekende jaarlijkse, eenmalige en boetebedragen blijven staan.

## 13. Betalingsregels

De standaard betaalperiode voor de jaarlijkse bijdrage is 1 januari tot en met 31 maart.

Jaarbetalingen mogen in termijnen binnen hetzelfde jaar worden betaald. Het systeem telt termijnen op. Bij gedeeltelijke betaling blijft het restant zichtbaar.

Voor nieuwe inschrijvingen moet het totaal van de inschrijving volledig betaald zijn voordat de donateur actief wordt. Dit bestaat uit de jaarbijdrage van het inschrijfjaar plus eventuele eenmalige bijdrage.

Na 31 maart kan een boete ontstaan. De standaardboete is 5 euro per maand vanaf april tot en met december zolang de jaarbetaling niet volledig is betaald.

Voor nieuwe leden geldt: de eenmalige bijdrage moet binnen 365 dagen na goedkeuring/lidnummer betaald worden. De timer wordt berekend vanaf de goedkeurdatum.

Als iemand in het inschrijfjaar nog geen jaarbetaling heeft gedaan, wordt bij de jaarwisseling het inschrijfjaar plus het nieuwe jaar meegenomen. De boete voor deze situatie start pas vanaf februari na de jaarwisseling.

## 14. Import

Import is bedoeld voor bestaande ledenbestanden en bankexports.

Ondersteunde bestanden zijn `.xlsx`, `.xls`, `.xlsm` en `.csv`.

Bij bankimport is het lidnummer leidend. De betaler-IBAN wordt alleen opgeslagen als betaalbewijs. Het systeem maakt vanuit bankimport geen nieuwe donateurs aan.

De preview toont onder andere:

- Rij.
- Datum.
- Bedrag.
- Organisatie-rekeningnummer.
- Lidnummer.
- IBAN betaler.
- Contributiejaar.
- Actie.
- Controle / fouten.

Mogelijke acties zijn:

- Bedrag verwerkt.
- Lidnummer niet gevonden.
- Dubbele betaling mogelijk.
- Ongeldig.
- Controle nodig.

Dubbele betaling mogelijk wordt herkend op basis van hetzelfde lidnummer, bedrag, transactiedatum en betaler-IBAN.

Als dezelfde IBAN bij meerdere lidnummers voorkomt, is dat toegestaan. Een ouder kan bijvoorbeeld voor zichzelf en voor een kind betalen. Het lidnummer in de omschrijving bepaalt voor welk lid de betaling wordt verwerkt.

Als het lidnummer ontbreekt of niet bestaat, wordt de regel niet automatisch verwerkt.

Relaties zoals dochter, echtgenoot, partner of zoon worden niet gebruikt om automatisch een ander lid te kiezen. Het lidnummer blijft leidend.

Alleen SEPA-overboekingen die relevant zijn voor betalingsimport worden meegenomen.

## 15. Geen externe AI in bankimport

De bankimport gebruikt lokale herkenningsregels in de applicatie. Er wordt geen bankomschrijving naar een externe AI-dienst gestuurd.

Als het bestuur later AI-verwerking wil toevoegen, moet dit opnieuw bestuurlijk en privacytechnisch worden beoordeeld en in het privacybeleid worden aangepast.

## 16. Gezinswijzigingen

Gezinswijzigingen is de beheerpagina voor huishoudsituaties die extra aandacht nodig hebben.

Kinderen vanaf 17 jaar en 6 maanden worden als "bijna 18" zichtbaar op het dashboard. Zodra een kind 18 wordt, komt deze persoon in "18+ inschrijving nodig".

Een 18+ kind telt niet automatisch meer mee onder het oude lidnummer voor nieuwe administratieve verwerking. De persoon moet zichzelf inschrijven voor een eigen lidnummer.

De admin kan een 18+ kandidaat:

- Markeren als uitgenodigd.
- Koppelen aan een zelfstandig lidnummer zodra de persoon zichzelf heeft ingeschreven.
- Markeren als geen lid.

Bij overlijden van de primary member kan een actieve partner als primaire contactpersoon worden vastgelegd.

Als er geen actieve partner is en er kinderen onder 18 zijn, toont het systeem "Voogd/contact nodig". De admin kan dan een voogd of contactpersoon registreren in de interne administratie.

## 17. Wijzigingsverzoeken

Een wijzigingsverzoek ontstaat wanneer een donateur op "Mijn account" gegevens aanpast en indient.

De admin kan het verzoek goedkeuren of afwijzen. Adminnotities zijn intern. Donateurberichten zijn bedoeld voor de donateur.

## 18. Export

Export maakt bestanden voor administratie of controle. Exportbestanden bevatten persoonsgegevens en moeten veilig worden behandeld.

Mogelijke exports zijn onder andere alle donateurs, actieve donateurs, inactief/betaling afwachtend, afgewezen en overleden.

## 19. E-mailtemplates en e-maillog

E-mailtemplates zijn standaardteksten die het systeem gebruikt om e-mails voor te bereiden. Ze zijn bewerkbaar via E-mailtemplates.

De e-maillog toont voorbereide e-mails met status `PREPARED`. Dit betekent dat het bericht is voorbereid, maar niet verzonden.

## 20. Registratie PDF

Bij een inschrijving kan een PDF-overzicht worden gegenereerd. Deze PDF bevat een kopie van de ingevulde inschrijving. De donateur kan de eigen PDF downloaden vanaf het dashboard. De admin kan de PDF downloaden vanaf de registratiedetailpagina.

## 21. Prijsinstellingen

Prijsinstellingen bepalen jaarlijkse bijdragen, eenmalige bijdragen, betaalperiode en boete.

Jaarlijkse bijdragen kunnen verschillen voor individuele volwassenen, gezinssituaties en alleenstaande ouder met kinderen. Standaard is individueel 72 euro per jaar en gezin/gehuwd 144 euro per jaar.

Eenmalige bijdragen kunnen verschillen per leeftijdsgroep. Standaard betalen 0 tot en met 18 jaar geen eenmalige bijdrage. Vanaf 19 jaar start de eerste eenmalige leeftijdsschijf met 150 euro.

Als instellingen worden aangepast, veranderen bestaande handmatig geimporteerde of geregistreerde betalingen niet automatisch.

## 22. Proces: overlijden

1. Bestuur ontvangt een betrouwbare melding.
2. Bestuur controleert intern of de melding voldoende is.
3. De donateur wordt administratief op `DECEASED` gezet.
4. De donateur verschijnt in de groep "Overleden".
5. Het systeem toont indien nodig gezinswijzigingen, zoals partner als primaire contactpersoon of voogd/contact nodig.
6. Gegevens en uitvaartwensen worden zorgvuldig behandeld.

## 23. Proces: kind wordt 18

1. Het systeem signaleert kinderen vanaf 17 jaar en 6 maanden.
2. Zodra het kind 18 is, wordt deze persoon gemarkeerd als 18+ inschrijving nodig.
3. De persoon moet zichzelf inschrijven voor een eigen lidnummer.
4. De admin kan de persoon uitnodigen, koppelen aan een nieuw lidnummer of markeren als geen lid.
5. Als de persoon zich nooit inschrijft, blijft dit administratief zichtbaar als geen lid of als open aandachtspunt.

## 24. Rapportage-overzicht

Het portaal ondersteunt rapportage via dashboardblokken, controlecentrum, donateurslijsten en exports.

Dashboardrapportage bevat registraties, actie vereist, actieve donateurs, inactief/betaling afwachtend, afgewezen, overleden, kinderen bijna 18, 18+ inschrijving nodig en voogd/contact nodig.

Controlecentrumrapportage bevat open betalingen, eenmalige bijdrage-termijnen, mogelijke dubbele bankbetalingen, statuscontrole en gezinswijzigingen.

Financiele rapportage bevat betaald totaal, openstaand totaal, jaarlijkse bijdrage, eenmalige bijdrage, boete en betaalhistorie.

## 25. Aanbevolen werkwijze voor bestuur

Controleer nieuwe registraties regelmatig.

Gebruik duidelijke donorberichten bij correctie of afwijzing.

Gebruik interne notities alleen voor bestuursinformatie.

Controleer het controlecentrum dagelijks of wekelijks.

Controleer imports altijd voordat ze definitief worden verwerkt.

Controleer bij bankimport altijd lidnummer, datum, bedrag, betaler-IBAN, contributiejaar en controle/fouten.

Verwerk controle-nodig rijen niet zonder handmatige controle.

Bewaar exports veilig en verwijder oude exportbestanden.

Geef adminrechten alleen aan bevoegde personen.

Registreer iemand alleen als overleden na betrouwbare bevestiging.

Controleer prijsinstellingen voordat betaaloverzichten worden gebruikt.

## 26. Beperkingen en aandachtspunten

Online betalen staat niet actief in het portaal.

E-mails worden niet automatisch verzonden. Ze worden voorbereid in de e-maillog.

De overgang van `INACTIVE` naar `ACTIVE` bij nieuwe registraties mag pas plaatsvinden wanneer het restant van de inschrijving 0 euro is.

De lokale bankomschrijving-parser kan varianten herkennen, maar is geen garantie dat elke omschrijving correct wordt begrepen. Daarom bestaat de preview en controle-nodig werkwijze.

Gezinsverwijzingen uit bankimport zijn informatief en vervangen geen officiele registratie van partner of kinderen.

Er is op dit moment geen externe AI-verwerking voor bankimport actief.

Privacy- en beleidsteksten moeten voor officieel gebruik door het bestuur worden gecontroleerd.

Bij juridische of privacyvragen moet het bestuur advies vragen aan iemand met kennis van AVG en stichtingsadministratie.
