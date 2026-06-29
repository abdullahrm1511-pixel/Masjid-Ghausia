# Privacy- en policybeleid

Organisatie: St. GBC Masjid Ghausia  
Portaal: St. GBC Donateursportaal  
Versie: 1.2  
Datum: 21 juni 2026  
Contact privacy: [vul e-mailadres of contactpersoon in]

## 1. Doel van dit beleid

Dit beleid legt uit hoe St. GBC Masjid Ghausia omgaat met persoonsgegevens binnen het donateursportaal. Het portaal wordt gebruikt voor inschrijvingen, donateursadministratie, gezinsgegevens, wijzigingsverzoeken, betalingen, import, export, controlecentrum en interne controle door bevoegde beheerders.

Het doel is dat donateurs weten welke gegevens worden gevraagd, waarom die gegevens nodig zijn, wie ze mag bekijken en hoe verzoeken rondom privacy worden behandeld.

## 2. Voor wie geldt dit beleid

Dit beleid geldt voor:

- Nieuwe personen die zich inschrijven als donateur.
- Bestaande donateurs met een account in het portaal.
- Gezinsleden die door een hoofddonateur worden opgegeven.
- Kinderen die 18 worden en administratief uit het gezin moeten worden opgevolgd.
- Bestuursleden of beheerders die toegang hebben tot het adminportaal.
- Personen waarvan gegevens via een oude donateurslijst of bankexport worden geimporteerd.

## 3. Welke persoonsgegevens worden verwerkt

Het portaal kan de volgende gegevens verwerken:

- Naam, e-mailadres en telefoonnummer.
- Adres, postcode, woonplaats en land.
- Geboortedatum en geboorteplaats.
- Geslacht en burgerlijke staat.
- IBAN en naam rekeninghouder.
- Lidnummer of registratienummer.
- Partner- en kindgegevens, zoals naam, geboortedatum, geboorteplaats en relatie.
- Lidmaatschapsgegevens, zoals gezamenlijke lidnummers, primary member, partnerprofiel, kinderen onder het lidmaatschap en gezinsstatussen.
- Contactpersoon in Pakistan en telefoonnummer van die contactpersoon.
- Voogd/contactpersoon bij huishoudens waar geen actieve ouder meer geregistreerd staat.
- Uitvaartwensen of andere vrijwillig opgegeven wensen.
- Status van inschrijving of donateur.
- Betaalstatus, openstaande bedragen, betaalde bedragen, correcties, betaaldatum en betaalhistorie.
- Banktransactiegegevens uit importbestanden, zoals bedrag, datum, omschrijving, organisatie-rekeningnummer, betaler-IBAN uit omschrijving en importbestand.
- Interne bestuursnotities bij beoordeling, correctie, afwijzing, statuswijzigingen, betalingen en gezinswijzigingen.
- Loggegevens over belangrijke acties in het systeem, zoals import, export, goedkeuringen en statuswijzigingen.
- Voorbereide e-mails in de e-maillog, zoals onderwerp, ontvanger en tekst.
- PDF-overzichten van ingediende inschrijvingen die op aanvraag worden gegenereerd.

Wachtwoorden worden niet leesbaar opgeslagen. Het systeem bewaart alleen een beveiligde hash van het wachtwoord.

## 4. Waarom deze gegevens nodig zijn

De gegevens worden verwerkt voor:

- Het beoordelen van nieuwe inschrijvingen.
- Het beheren van het donateursbestand.
- Het vaststellen van lidnummers en donateurstatussen.
- Het tonen van de juiste gegevens aan de donateur zelf.
- Het beoordelen en verwerken van wijzigingsverzoeken.
- Het berekenen en administreren van bijdragen.
- Het importeren van oude of bestaande donateurslijsten.
- Het importeren en controleren van banktransacties.
- Het herkennen of een betaling bij een specifiek lidnummer hoort.
- Het tonen van controle-nodig rijen wanneer een koppeling niet eenduidig is.
- Het beheren van 18+ kinderen die zichzelf moeten inschrijven.
- Het vastleggen van partner als primaire contactpersoon of voogd/contactpersoon bij overlijden.
- Het exporteren van lijsten voor bestuur, administratie of betaalcontrole.
- Het onderhouden van contact met donateurs.
- Het bijhouden van uitvaartwensen wanneer een donateur deze vrijwillig invult.
- Het vastleggen van bestuursbesluiten en controles in auditlogs.
- Het voorbereiden van e-mailberichten voor communicatie met donateurs.
- Het kunnen downloaden van een kopie van de ingevulde inschrijving.

## 5. Grondslag voor verwerking

St. GBC Masjid Ghausia verwerkt gegevens omdat dit noodzakelijk is voor het beheren van donateurs, inschrijvingen, betalingen, gezinsadministratie en organisatorische administratie. Sommige gegevens worden gevraagd omdat de donateur deze zelf invult bij inschrijving of bij een wijzigingsverzoek.

Voor gevoelige of bijzondere informatie, zoals uitvaartwensen, geldt dat deze alleen wordt gebruikt voor het doel waarvoor de donateur deze informatie zelf heeft opgegeven. Toegang moet worden beperkt tot personen die deze gegevens nodig hebben voor hun taak.

## 6. Donateurstatussen

`PENDING` betekent dat de inschrijving is ontvangen, maar nog niet door het bestuur is beoordeeld.

`ACTION_REQUIRED` betekent dat het bestuur extra informatie of een correctie nodig heeft.

`PAYMENT_REQUIRED` betekent dat de inschrijving is goedgekeurd, maar dat de eerste betaling nog nodig is.

`ACTIVE` betekent dat de donateur actief is.

`INACTIVE` betekent dat de donateur niet actief is of administratief niet meetelt.

`REJECTED` betekent dat een inschrijving of donateur is afgewezen.

`DECEASED` betekent dat de persoon als overleden is geregistreerd. Dit mag alleen wanneer het bestuur hiervoor voldoende betrouwbare informatie heeft ontvangen.

## 7. Betalingen en bankimport

Betalingen worden buiten het portaal gedaan via bankoverschrijving. Het portaal registreert administratief wat op de bank is ontvangen.

Bij bankimport is het lidnummer leidend. De betaler-IBAN wordt uit de omschrijving gelezen en opgeslagen als betaalbewijs, maar bepaalt niet zelfstandig voor welk lid is betaald.

Het kan voorkomen dat dezelfde IBAN bij meerdere lidnummers voorkomt, bijvoorbeeld wanneer een ouder voor zichzelf en voor een kind betaalt. Dit is toegestaan. De koppeling moet gebeuren op basis van het lidnummer.

Als een bankomschrijving geen lidnummer bevat of het lidnummer niet bestaat, wordt de regel niet automatisch verwerkt. De regel komt in controle nodig of moet handmatig worden opgevolgd.

Bankbetalingen kunnen in termijnen worden verwerkt. Meerdere betalingen voor hetzelfde jaar kunnen worden opgeteld. Als niet volledig is betaald, blijft het restant zichtbaar.

Na de betaalperiode kan het systeem leden zonder volledige jaarbetaling administratief op `INACTIVE` zetten en een open bedrag inclusief boete registreren. Het oude lidnummer en de historie blijven bewaard.

Bestaande geimporteerde donateurs krijgen geen eenmalige inschrijfschuld. De eenmalige bijdrage geldt alleen voor nieuwe inschrijvingen via het portaal.

## 8. Controlecentrum

Het controlecentrum bundelt aandachtspunten voor bevoegde admins. Het kan persoonsgegevens tonen omdat het bedoeld is voor intern beheer en controle.

Het controlecentrum toont onder andere:

- Registraties en correcties.
- Open betalingen.
- Eenmalige bijdrage-termijnen.
- 18+ kinderen die zichzelf moeten inschrijven.
- Huishoudens waar voogd/contact nodig is.
- Mogelijke dubbele bankbetalingen.
- Statuscontrole.

Beheerders mogen deze informatie alleen gebruiken voor hun taak.

## 9. Gezinsgegevens, 18+ kinderen en overlijden

Gezinsleden worden geregistreerd voor administratieve en organisatorische doeleinden.

Kinderen die 18 worden, moeten zichzelf inschrijven als zij zelfstandig lid willen worden. Het portaal kan deze personen zichtbaar maken als "18+ inschrijving nodig". De admin kan vastleggen of iemand is uitgenodigd, gekoppeld aan een nieuw lidnummer of geen lid is.

Bij overlijden van een primary member kan een partner als primaire contactpersoon worden vastgelegd. Als er geen actieve partner is en er kinderen onder 18 zijn, kan een voogd/contactpersoon worden vastgelegd.

Deze gegevens moeten zorgvuldig worden behandeld, omdat zij gezinsrelaties en soms gevoelige omstandigheden bevatten.

## 10. Wie toegang heeft tot gegevens

Donateurs kunnen hun eigen gegevens bekijken via het dashboard en de accountpagina. Zij kunnen wijzigingen aanvragen, maar wijzigingen worden niet direct definitief aangepast zonder beoordeling.

Registratie-admins mogen registraties lezen, goedkeuren, afwijzen en om correctie vragen.

Admins en super-admins kunnen via het adminportaal gegevens bekijken en verwerken voor hun taak. Adminrechten zijn bedoeld voor personen die verantwoordelijk zijn voor inschrijvingen, donateursadministratie, betalingen, import, export, controlecentrum of instellingen.

Niet iedere gebruiker hoort adminrechten te krijgen.

## 11. Wijzigingsverzoeken

Wanneer een donateur gegevens wil aanpassen, kan hij of zij een wijzigingsverzoek indienen. Het bestuur ziet het oude en nieuwe voorstel en kan het verzoek goedkeuren of afwijzen.

Bij goedkeuring worden de gegevens aangepast. Bij afwijzing kan het bestuur een bericht voor de donateur toevoegen. Interne notities zijn bedoeld voor het bestuur en horen niet onnodig gedeeld te worden.

## 12. Import en export

Het adminportaal bevat functies om bestaande donateurslijsten te importeren en gegevens te exporteren.

Een beheerder moet de importpreview controleren voordat de import definitief wordt verwerkt.

Bij bankexports wordt de kolom `Rekeningnummer` behandeld als de rekening van de organisatie. De betaler-IBAN wordt uit de bankomschrijving gelezen.

Bij export worden donateursgegevens in een bestand gezet. Exportbestanden mogen alleen worden gemaakt wanneer dit nodig is voor bestuur, administratie, controle of betaling. Exportbestanden moeten veilig worden bewaard en verwijderd wanneer ze niet meer nodig zijn.

## 13. Geen externe AI-verwerking bij bankimport

De huidige bankimport gebruikt lokale herkenningsregels in de applicatie. Bankomschrijvingen worden niet naar een externe AI-dienst gestuurd.

Als het bestuur later externe AI-verwerking wil toevoegen, moet vooraf worden beoordeeld:

- Welke gegevens worden verzonden.
- Welke aanbieder wordt gebruikt.
- Welke afspraken nodig zijn.
- Of donateurs hierover geinformeerd moeten worden.
- Wie toestemming heeft om deze functie in te schakelen.

Tot die tijd geldt: geen externe AI-verwerking van bankimportgegevens.

## 14. E-mailtemplates, e-maillog en PDF's

Het portaal kan e-mails voorbereiden op basis van bewerkbare templates. Deze e-mails worden voorlopig niet automatisch verzonden. Ze worden opgeslagen als voorbereide e-maillog, zodat het bestuur de tekst kan controleren.

Het portaal kan ook een PDF-kopie van een ingevulde inschrijving genereren. Deze PDF is bedoeld voor de donateur zelf en voor bevoegde admins die de registratie beoordelen. De PDF bevat persoonsgegevens en moet zorgvuldig worden behandeld.

## 15. Bewaartermijnen

Gegevens worden bewaard zolang dit nodig is voor donateursadministratie, wettelijke verplichtingen, financiele administratie, interne controle of historische administratie van de stichting.

Aanbevolen werkwijze:

- Actieve donateurs: bewaren zolang de persoon donateur is.
- Inactieve, afgewezen of overleden donateurs: bewaren zolang dit administratief of juridisch nodig is.
- Betaalgegevens: bewaren volgens geldende administratieve bewaartermijnen.
- Bankimportgegevens en betalingsnotities: bewaren zolang nodig is voor financiele administratie en controle.
- Controle-nodig meldingen: bewaren zolang nodig is om importkeuzes te controleren.
- Auditlogs: bewaren zolang nodig is voor controle en verantwoording.
- E-maillogs: bewaren zolang nodig is voor communicatiecontrole en administratie.
- Exportbestanden: zo kort mogelijk bewaren en verwijderen zodra ze niet meer nodig zijn.

Het bestuur moet periodiek controleren of oude gegevens nog nodig zijn.

## 16. Beveiliging

De volgende maatregelen horen bij zorgvuldig gebruik:

- Accounts zijn beveiligd met wachtwoorden.
- Adminrechten worden alleen gegeven aan bevoegde personen.
- Wachtwoorden worden niet leesbaar opgeslagen.
- Belangrijke adminacties worden vastgelegd in auditlogs.
- Exportbestanden worden alleen gemaakt wanneer nodig.
- Importpreviews moeten door beheerders worden gecontroleerd voordat verwerking plaatsvindt.
- Rijen met controle-nodig meldingen worden niet automatisch verwerkt.
- PDF-downloads en e-maillogs zijn alleen toegankelijk voor ingelogde bevoegde gebruikers.
- Beheerders loggen uit wanneer zij klaar zijn.
- Toegang tot Supabase, database en hosting wordt beperkt tot bevoegde technische beheerders.
- Databasewachtwoorden en geheime sleutels worden niet gedeeld via chat, e-mail of screenshots.

## 17. Delen met derden

Persoonsgegevens worden niet verkocht. Gegevens kunnen technisch worden verwerkt door diensten die nodig zijn om het portaal te laten werken, zoals databasehosting, applicatiehosting of e-maildiensten als die later worden aangesloten.

Als gegevens met externe partijen worden gedeeld, moet dat een duidelijk doel hebben en moeten passende afspraken worden gemaakt.

Er is op dit moment geen externe AI-verwerking voor bankimport actief.

## 18. Rechten van betrokkenen

Donateurs kunnen vragen om:

- Inzage in hun gegevens.
- Correctie van onjuiste gegevens.
- Verwijdering van gegevens wanneer dit mogelijk is.
- Beperking van verwerking.
- Uitleg over hoe hun gegevens worden gebruikt.
- Een kopie van hun gegevens.

Een verzoek kan worden ingediend via [vul e-mailadres of contactpersoon in]. Het bestuur beoordeelt het verzoek en reageert binnen een redelijke termijn.

Sommige gegevens kunnen niet direct worden verwijderd als deze nodig zijn voor administratie, betaling, wettelijke verplichtingen of interne verantwoording.

## 19. Cookies en sessies

Het portaal gebruikt sessies om gebruikers ingelogd te houden. Deze sessies zijn nodig voor de werking van het portaal. Het portaal is niet bedoeld voor marketingtracking.

Als later analytische cookies, tracking of externe scripts worden toegevoegd, moet dit beleid worden bijgewerkt.

## 20. Datalekken

Wanneer er sprake is van verlies, onbevoegde toegang of mogelijk misbruik van persoonsgegevens, moet het bestuur dit direct onderzoeken. Als er risico bestaat voor betrokkenen, moet het bestuur passende maatregelen nemen en beoordelen of melding nodig is bij de Autoriteit Persoonsgegevens en/of betrokken personen.

## 21. Gedragsregels voor beheerders

Beheerders mogen gegevens alleen gebruiken voor hun taak. Het is niet toegestaan om gegevens op te zoeken uit nieuwsgierigheid, gegevens buiten het bestuur te delen of exportbestanden onbeveiligd rond te sturen.

Beheerders moeten bij import extra zorgvuldig omgaan met bankomschrijvingen, IBANs, gezinsrelaties en controle-nodig rijen. Een automatische suggestie is geen bestuursbesluit; bij twijfel moet handmatig worden gecontroleerd.

Bij twijfel geldt: niet delen, eerst intern navragen.

## 22. Wijzigingen in dit beleid

Dit beleid kan worden aangepast wanneer het portaal verandert, wanneer nieuwe functies worden toegevoegd of wanneer de werkwijze van het bestuur verandert. De nieuwste versie moet beschikbaar zijn voor donateurs en beheerders.

## 23. Controle voor publicatie

Dit document is opgesteld als praktische concepttekst voor het portaal. Laat het voor officieel gebruik controleren door het bestuur en, indien nodig, door iemand met juridische kennis van privacy en AVG.
