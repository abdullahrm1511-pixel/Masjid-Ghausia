# Functioneel rapport en handleiding

Project: St. GBC Donateursportaal  
Organisatie: St. GBC Masjid Ghausia  
Versie: 1.1  
Datum: 12 juni 2026

## 1. Doel van het portaal

Het St. GBC Donateursportaal is gemaakt om inschrijvingen, donateurs, gezinsgegevens, wijzigingsverzoeken, betalingen, import, export en prijsinstellingen centraal te beheren.

Het portaal heeft twee hoofdrollen:

- Donateur: kan inschrijven, inloggen, eigen gegevens bekijken en wijzigingen aanvragen.
- Admin: kan registraties beoordelen, donateurs beheren, wijzigingsverzoeken verwerken, importeren, exporteren en instellingen aanpassen.

Het portaal bevat daarnaast voorbereidende productiefuncties: handmatige bevestiging van externe betalingen, bewerkbare e-mailtemplates, een e-maillog met voorbereide berichten, een PDF-kopie van de ingevulde inschrijving, bankimport met previewcontrole en herkenning van betalingsdoelen uit omschrijvingen.

## 2. Belangrijkste termen

Donateur betekent een persoon die in het systeem staat als lid of donateur van St. GBC.

Hoofddonateur betekent de persoon op wie het account en het lidnummer staan.

Partner betekent de opgegeven partner van de hoofddonateur.

Kind betekent een opgegeven kind binnen het gezin van de hoofddonateur.

Lidnummer betekent het registratienummer van de donateur. De opbouw begint met `11-001` tot en met `11-999`. Als die reeks vol is, start een nieuwe reeks met een extra cijfer: `11-0001` tot en met `11-9999`. Daarna gaat het verder met `11-00001` enzovoort. `11-054` en `11-0054` zijn dus twee verschillende lidnummers.

IBAN betekent het bankrekeningnummer van de donateur.

Rekeninghouder betekent de naam die hoort bij de opgegeven bankrekening.

Bankexport betekent een Excel- of CSV-bestand met banktransacties. In bankexports is de kolom `Rekeningnummer` de rekening van de organisatie. De donor-IBAN wordt bij bankexports uit de kolom `Omschrijving` gelezen.

Bij bankexports worden alleen regels meegenomen waarvan de omschrijving `SEPA Overboeking` of `SEPA Periodieke Overboeking` bevat. Incasso's en andere transactiesoorten worden overgeslagen en verschijnen niet in de importpreview.

Omschrijving betekent de bankomschrijving waarin gegevens kunnen staan zoals IBAN, naam, lidnummer, contributiejaar, geboortedatum of "contributie voor".

Betaler betekent de persoon of rekeninghouder die de bankoverschrijving heeft gedaan.

Betalingsdoel betekent de persoon van wie de contributie wordt afgelost. Dit kan dezelfde persoon zijn als de betaler, maar bij teksten zoals "contributie voor ..." kan dit iemand anders zijn.

Tweede opinie betekent dat het systeem onvoldoende zekerheid heeft om een importregel automatisch te verwerken. Een beheerder moet de rij handmatig controleren.

Contact Pakistan betekent een contactpersoon in Pakistan die de donateur vrijwillig kan opgeven.

Uitvaartwensen betekent informatie die de donateur zelf kan invullen over wensen rondom overlijden en uitvaart.

Auditlog betekent een interne registratie van belangrijke acties, zoals goedkeuren, afwijzen, importeren, exporteren en statuswijzigingen.

## 3. Statussen van donateurs

`PENDING` betekent dat een aanvraag is ontvangen en nog wacht op beoordeling door het bestuur.

`ACTION_REQUIRED` betekent dat het bestuur extra informatie nodig heeft of een correctie vraagt. De donateur ziet op het dashboard een bericht met wat nodig is.

`PAYMENT_REQUIRED` betekent dat de aanvraag is goedgekeurd, maar dat de eerste betaling nog openstaat. Deze groep telt mee bij "Inactief / betaling afwachtend".

`ACTIVE` betekent dat de donateur actief is.

`INACTIVE` betekent dat de donateur administratief niet actief is. Dit kan worden gebruikt wanneer iemand niet meer als actieve donateur moet meetellen.

`REJECTED` betekent dat de aanvraag of donateur is afgewezen.

`DECEASED` betekent dat de donateur als overleden is geregistreerd. Dit mag alleen worden gebruikt wanneer het bestuur hiervoor betrouwbare informatie heeft.

## 4. Wanneer iemand actief is

Iemand is actief wanneer het bestuur de persoon als goedgekeurde en actieve donateur behandelt. In de huidige werking krijgt een nieuwe goedgekeurde registratie eerst de status `PAYMENT_REQUIRED`. Zodra de betaling administratief is verwerkt en het bestuur dit als afgerond ziet, kan de persoon als actieve donateur worden behandeld.

## 5. Wanneer iemand inactief is

Iemand is inactief wanneer de status `INACTIVE` is ingesteld. Op het dashboard staat daarnaast het blok "Inactief / betaling afwachtend". Dat blok telt ook mensen mee met status `PAYMENT_REQUIRED`, omdat zij nog niet volledig actief zijn zolang de eerste betaling openstaat.

## 6. Wanneer iemand overleden is

Iemand wordt als overleden gezien wanneer het bestuur betrouwbare informatie heeft ontvangen dat de persoon is overleden. De status `DECEASED` zorgt ervoor dat deze persoon apart zichtbaar is in het adminportaal en niet wordt verward met actieve donateurs.

Bij overleden donateurs moet zorgvuldig worden omgegaan met gezinsgegevens, contactgegevens en uitvaartwensen.

## 7. Donateur: inschrijven

Een nieuwe donateur gaat naar "Inschrijven" en vult de registratie in stappen in.

Hoofddonateur bevat de persoonlijke basisgegevens van de aanvrager, zoals naam, geboortedatum, geboorteplaats, telefoon, adres, e-mail, wachtwoord, IBAN en rekeninghouder.

Partner bevat gegevens van de partner, als die aanwezig is.

Kinderen bevat gegevens van kinderen. Er kunnen meerdere kinderen worden toegevoegd.

Contact bevat onder andere contactgegevens voor Pakistan en eventuele uitvaartwensen.

Bevestiging bevat verklaringen die de donateur moet bevestigen voordat de aanvraag wordt verstuurd.

Na verzenden komt de aanvraag binnen bij het bestuur. De status is dan `PENDING`.

## 8. Donateur: dashboard

Het donateurdashboard is de eerste pagina na inloggen.

Status toont de huidige stand van de aanvraag of donateur. Voorbeelden:

- "Uw aanvraag is in afwachting van beoordeling" betekent dat het bestuur nog moet kijken.
- "Actie vereist" betekent dat het bestuur een correctie of extra informatie vraagt.
- "Uw aanvraag is goedgekeurd. Eerste betaling is vereist" betekent dat betaling nog openstaat.
- "Uw account is actief" betekent dat de donateur actief staat.
- "Uw account is niet actief" betekent dat de status inactief is.
- "Uw aanvraag is afgewezen" betekent dat het bestuur de aanvraag heeft afgewezen.
- "Status: overleden" betekent dat de persoon als overleden is geregistreerd.

Lidnummer verschijnt wanneer er een lidnummer is toegewezen.

Betaling verschijnt wanneer de status `PAYMENT_REQUIRED` is. Op dit moment staat daar dat betaling later volgt en dat online betalen nog niet beschikbaar is.

Account toont naam, e-mail, telefoon en IBAN.

Gezin toont partner en kinderen die bij de donateur horen. Bankimport maakt geen gezinsrelaties aan en toont geen gezinsverwijzingen.

Laatste wijzigingsverzoek toont de laatste aanvraag die de donateur heeft gedaan om gegevens te wijzigen.

## 9. Donateur: mijn account

Op "Mijn account" ziet de donateur zijn of haar gegevens.

Getoonde gegevens zijn onder andere:

- Lidnummer.
- Naam.
- E-mail.
- Telefoon.
- Adres.
- Geboortedatum.
- Geboorteplaats.
- Geslacht.
- IBAN.
- Rekeninghouder.
- Contact Pakistan.
- Telefoon Pakistan.
- Uitvaartwensen.
- Partner en kinderen.

Onder "Wijziging aanvragen" kan de donateur wijzigingen indienen. Dit past de gegevens niet direct aan. Het wordt eerst een wijzigingsverzoek voor het bestuur.

## 10. Admin: admin dashboard

Het admin dashboard geeft een snelle samenvatting.

Registraties in afwachting toont hoeveel nieuwe registraties nog beoordeeld moeten worden. Klikken opent de registratiepagina.

Actie vereist toont hoeveel donateurs wachten op correctie of extra informatie.

Actieve donateurs toont hoeveel donateurs actief zijn. Klikken opent de donateurslijst met actieve donateurs.

Inactief / betaling afwachtend toont hoeveel donateurs inactief zijn of nog wachten op betaling. Dit bevat status `INACTIVE` en `PAYMENT_REQUIRED`.

Afgewezen toont hoeveel donateurs of aanvragen zijn afgewezen.

Overleden toont hoeveel donateurs als overleden geregistreerd staan.

Onder de blokken staan snelle knoppen:

- Registraties beoordelen.
- Donateurs beheren.
- Wijzigingsverzoeken.
- Import.
- Export.
- Prijsinstellingen.

## 11. Admin: navigatie

Admin dashboard brengt de beheerder terug naar het overzicht.

Registraties opent de lijst met nieuwe inschrijvingen.

Donateurs opent de donateurslijst. Als de cursor boven "Donateurs" staat, verschijnt een menu met groepen: alle donateurs, actieve donateurs, inactief/betaling afwachtend, actie vereist, afgewezen en overleden.

Wijzigingsverzoeken opent aanvragen van donateurs om hun gegevens aan te passen.

Import opent het importscherm voor bestanden.

Export opent het exportscherm.

Instellingen opent de prijsinstellingen.

Uitloggen sluit de sessie af.

## 12. Admin: registraties beoordelen

De registratiepagina toont nieuwe aanvragen.

In het detailscherm ziet de admin:

- Naam.
- Status.
- Eventueel lidnummer.
- E-mail.
- Telefoon.
- Adres.
- Geboortedatum.
- Geboorteplaats.
- Geslacht.
- IBAN.
- Rekeninghouder.
- Burgerlijke staat.
- Contact Pakistan.
- Uitvaartwensen.
- Partner en kinderen.
- Verklaringen.

Goedkeuren betekent dat de registratie wordt goedgekeurd, er een lidnummer wordt toegekend als dat nog niet bestaat en de donateur op `PAYMENT_REQUIRED` komt.

Correctie vragen betekent dat de donateur op `ACTION_REQUIRED` komt. De admin schrijft een bericht voor de donateur en eventueel een interne notitie.

Afwijzen betekent dat de registratie op `REJECTED` komt. De admin vult een interne reden en een bericht voor de donateur in.

## 13. Admin: donateurs beheren

De donateurspagina toont alle donateurs of een gekozen groep.

Zoeken kan op:

- Lidnummer.
- Naam.
- E-mail.
- Telefoon.
- IBAN.
- Status.

De filters boven de tabel tonen:

- Alle donateurs.
- Actieve donateurs.
- Inactief / betaling afwachtend.
- Actie vereist.
- Afgewezen.
- Overleden.

De tabel toont:

- Lidnummer.
- Naam.
- E-mail.
- Telefoon.
- IBAN.
- Status.
- Betaalstatus.
- Acties.

Bekijken opent het volledige donateursprofiel.

Financieel opent het financieel overzicht van die donateur.

## 14. Admin: financieel overzicht

Het financieel overzicht toont de financiele gegevens van een donateur.

Bovenaan staan:

- Lidnummer.
- Naam.
- IBAN.
- Betaald totaal.
- Openstaand totaal.

Berekende bijdragen toont per persoon in het gezin welk bedrag berekend wordt op basis van leeftijd, partner en kinderen.

Betalingen en verplichtingen toont de daadwerkelijke administratie van betalingen en openstaande posten.

Statussen bij betalingen:

`DUE` betekent openstaand.

`PAID` betekent betaald.

`WAIVED` betekent kwijtgescholden.

`MANUAL_CORRECTION` betekent handmatige correctie.

De knoppen "Betaald", "Open", "Kwijt" en "Correctie" veranderen de betaalstatus.

Wanneer een admin een betaling als betaald markeert, moeten betaaldatum, bedrag, betaalmethode en eventueel een adminnotitie worden ingevuld. Mogelijke betaalmethodes zijn bankoverschrijving, contant, externe iDEAL, externe SEPA en anders. Dit blijft handmatige administratie: het portaal koppelt nog niet met Mollie, iDEAL, SEPA of een andere betaalprovider.

Als alle betalingsverplichtingen van een donateur op betaald staan en de donateur nog op betaling vereist staat, kan de admin de donateur handmatig actief zetten. Dit gebeurt niet automatisch.

Bij het bevestigen van een betaling wordt een betalingsbevestiging als voorbereide e-mail in de e-maillog gezet. Er wordt nog niets automatisch verzonden.

## 15. Admin: wijzigingsverzoeken

Een wijzigingsverzoek ontstaat wanneer een donateur op "Mijn account" gegevens aanpast en indient.

De admin ziet het verzoek en kan het goedkeuren of afwijzen.

Goedkeuren past de gegevens definitief aan.

Afwijzen laat de bestaande gegevens staan en toont een bericht aan de donateur.

Adminnotities zijn voor intern gebruik. Donateurberichten zijn bedoeld voor de donateur.

## 16. Admin: import

Import is bedoeld om bestaande lijsten met donateurs en banktransacties in het systeem te zetten.

Ondersteunde bestanden zijn Excel en CSV.

Het systeem maakt eerst een preview. In die preview wordt gekeken naar:

- Nieuwe donateurs.
- Mogelijke matches.
- Dubbelen.
- Ongeldige rijen.
- Banktransacties waarvan de donor-IBAN in de omschrijving staat.
- Betaler en betalingsdoel.
- Lidnummer en naam uit de omschrijving.
- Contributiejaar.
- Teksten zoals "contributie voor ...".
- Rijen die tweede opinie nodig hebben.

Een beheerder moet de preview controleren voordat de import definitief wordt verwerkt.

Bij bankexports wordt de kolom `Rekeningnummer` niet gebruikt als donor-IBAN. Die kolom is de rekening van de organisatie. De donor-IBAN wordt uit de omschrijving gelezen. Het systeem controleert de IBAN niet inhoudelijk; wat in de omschrijving staat wordt als uitgangspunt gebruikt.

Alleen bankregels met `SEPA Overboeking` of `SEPA Periodieke Overboeking` in de omschrijving worden meegenomen. Incasso's en andere bankregels worden genegeerd, omdat die niet nodig zijn voor deze betalingsimport.

Bij import kunnen ook betalingsverplichtingen worden aangemaakt, zodat oude betalingen of bedragen zichtbaar zijn in het financieel overzicht.

Bankbetalingen uit een bankexport worden als jaarlijkse bijdrage verwerkt. Een donateur kan de jaarbijdrage in meerdere termijnen betalen, bijvoorbeeld in januari, februari en maart. Het systeem telt deze betalingen bij elkaar op. Als het totaal lager is dan de jaarbijdrage, blijft alleen het restant openstaan. Als het totaal voldoende is, wordt de jaarbetaling als betaald behandeld.

Als hetzelfde bankbestand per ongeluk opnieuw wordt geimporteerd, probeert het systeem dubbele betalingen te herkennen op basis van dezelfde donateur, betaaldatum, bedrag en importsbron. Zulke regels worden als dubbele betaling getoond en niet opnieuw verwerkt.

Bestaande donateurs die via oude Excelbestanden of bankimports worden geimporteerd krijgen geen eenmalige inschrijfschuld. De eenmalige bijdrage geldt alleen voor mensen die zich nu via het portaal inschrijven en daarna door het bestuur worden goedgekeurd.

### 16.1 Bankimport en betalingsdoel

Bij bankimport wordt niet alleen gekeken naar de rekeninghouder. Het systeem probeert te bepalen voor wie de betaling bedoeld is.

Voorbeelden:

- Als de omschrijving een lidnummer bevat, wordt de betaling gekoppeld aan dat lidnummer.
- Als de omschrijving zegt "contributie voor persoon 2", dan wordt de betaling gekoppeld aan persoon 2 en niet automatisch aan de betaler.
- Als dezelfde IBAN bij meerdere lidnummers voorkomt, gebruikt het systeem het lidnummer of betalingsdoel uit de omschrijving. Als dit niet duidelijk genoeg is, gaat de rij naar tweede opinie.
- Relaties zoals echtgenoot, partner, dochter of zoon worden niet verwerkt vanuit bankimport.

### 16.2 Kolommen in de importpreview

De importpreview toont onder andere:

- Rij: het rijnummer uit het bestand.
- Datum: de transactiedatum of rentedatum.
- Bedrag: het bedrag van de transactie.
- Org. rekeningnummer: het rekeningnummer van de organisatie uit de bankexport.
- Lidnummer: het lidnummer waaraan het systeem wil koppelen.
- Betalingsdoel: de persoon van wie de contributie wordt afgelost.
- Betaler: de naam van de rekeninghouder of betaler uit de omschrijving.
- Donor IBAN: de IBAN die uit de omschrijving is gelezen.
- Jaar: het contributiejaar als dat is gevonden.
- Actie: wat het systeem met de rij wil doen.
- Uitleg: korte menselijke uitleg over wat het systeem heeft herkend.
- Tweede opinie / fouten: waarschuwingen, foutmeldingen en redenen voor controle.

### 16.3 Mogelijke acties in de preview

Nieuwe donateur aanmaken betekent dat er geen bestaande donateur is gevonden en de rij gebruikt kan worden om een nieuwe donateur aan te maken.

Koppelen aan bestaande donateur betekent dat het systeem een bestaande donateur heeft gevonden, meestal via lidnummer, IBAN of naam.

Dubbele betaling betekent dat een betaling met hetzelfde bedrag en dezelfde datum al eerder is verwerkt.

Controle nodig betekent dat het systeem onvoldoende zekerheid heeft. Deze rij wordt niet automatisch verwerkt.

Ongeldig betekent dat de rij blokkerende fouten bevat.

Gedeeltelijk betaald betekent dat er al een deel van de jaarbijdrage is ontvangen, maar dat er nog een restant openstaat.

### 16.4 Mogelijke meldingen bij import

IBAN komt bij meerdere lidnummers voor; kies handmatig op lidnummer of zorg dat de omschrijving een lidnummer bevat betekent dat dezelfde IBAN bij meerdere donateurs voorkomt en het systeem niet zelfstandig mag kiezen.

Betalingsdoel komt overeen met meerdere donateurs betekent dat meerdere personen op de gevonden naam lijken.

Omschrijving ontbreekt betekent dat een bankexportregel geen omschrijving bevat.

AI kon deze omschrijving niet betrouwbaar uitlezen; handmatige controle nodig betekent dat de optionele AI-hulplezer is ingeschakeld, maar geen betrouwbare verbetering kon geven.

Het systeem controleert contributiejaar, bedrag, naam, lidnummer en IBAN niet inhoudelijk. Deze velden worden aangenomen zoals ze in het bestand of de omschrijving staan. De preview is vooral bedoeld om te zien of de betaling aan de juiste donateur wordt gekoppeld.

### 16.5 Verwerken van tweede-opinie rijen

Rijen met "Controle nodig", "Ongeldig" of tweede-opinie redenen worden niet automatisch verwerkt wanneer op "Import verwerken" wordt geklikt. Ze blijven buiten de verwerking totdat een beheerder de gegevens corrigeert of handmatig op een andere manier verwerkt.

### 16.6 Optionele AI-hulplezer

Het portaal bevat een optionele AI-hulplezer voor bankomschrijvingen. Deze werkt alleen als er bewust een `OPENAI_API_KEY` en `OPENAI_IMPORT_MODEL` zijn ingesteld. Zonder deze instellingen gebruikt het portaal alleen de lokale parser en wordt er geen bankdata naar OpenAI gestuurd.

Vanwege gevoelige bank- en donateurgegevens is het aanbevolen om standaard de lokale parser te gebruiken en AI alleen te gebruiken na een bewuste privacy-afweging door het bestuur.

## 17. Admin: export

Export maakt bestanden voor administratie of controle.

Mogelijke exports zijn onder andere:

- Alle donateurs.
- Actieve donateurs.
- Inactief / betaling afwachtend.
- Afgewezen.
- Overleden.

Exportbestanden bevatten persoonsgegevens en moeten veilig worden behandeld.

## 18. Admin: e-mailtemplates

E-mailtemplates zijn standaardteksten die het systeem gebruikt om e-mails voor te bereiden.

De templates zijn bewerkbaar via "E-mailtemplates" in de adminnavigatie. Een admin kan:

- Templates bekijken.
- Onderwerp aanpassen.
- Tekst aanpassen.
- Preview bekijken met voorbeeldgegevens.
- Template terugzetten naar standaard.

Beschikbare placeholders zijn onder andere naam, voornaam, achternaam, lidnummer, status, bedrag, betaaldatum, reden, correctiebericht, loginlink, contact e-mail, organisatie, verificatielink en resetlink.

Er is nog geen echte e-mailprovider gekoppeld. Templates worden gebruikt om e-mails klaar te zetten in de e-maillog.

## 19. Admin: e-maillog

De e-maillog toont voorbereide e-mails. Dit zijn berichten die het systeem heeft klaargezet, bijvoorbeeld na een registratie, wijzigingsverzoek of handmatige betalingsbevestiging.

De status is `PREPARED`. Dit betekent dat het bericht is voorbereid, maar niet verzonden.

De e-maillog toont:

- Datum.
- Ontvanger.
- Template.
- Onderwerp.
- Status.
- Preview van de tekst.

## 20. Registratie PDF

Bij een inschrijving kan een PDF-overzicht worden gegenereerd. Deze PDF bevat een kopie van de ingevulde inschrijving.

De PDF bevat:

- Titel.
- Inzenddatum.
- Hoofddonateurgegevens.
- Partnergegevens als die zijn ingevuld.
- Kinderen.
- Contactpersoon Pakistan.
- Uitvaartwensen.
- Verklaringen.
- Geformatteerde IBAN.
- Een melding dat het document een kopie is van de ingevulde inschrijving.

De donateur kan de eigen PDF downloaden vanaf het dashboard. De admin kan de PDF downloaden vanaf de registratiedetailpagina.

## 21. Admin: prijsinstellingen

Prijsinstellingen bepalen hoe bijdragen worden berekend.

Er zijn jaarlijkse bijdragen en eenmalige bijdragen.

Jaarlijkse bijdragen kunnen verschillen voor:

- Individuele volwassenen.
- Gezinssituaties.
- Alleenstaande ouder met kinderen.

Eenmalige bijdragen kunnen verschillen per leeftijdsgroep.

Als instellingen worden aangepast, worden berekende bedragen anders weergegeven. Bestaande handmatig geimporteerde of geregistreerde betalingen veranderen niet automatisch tenzij de administratie dit verwerkt.

Gezinsverwijzingen die alleen uit bankimport komen, tellen niet automatisch mee als officiele gezinsleden voor prijsberekening. Alleen geregistreerde gezinsleden in het profiel tellen mee.

De eenmalige bijdrage wordt alleen gebruikt bij nieuwe inschrijvingen via het portaal. Voor bestaande geimporteerde donateurs telt standaard alleen de jaarlijkse bijdrage.

## 22. Rollen en rechten

Donateur heeft toegang tot eigen dashboard en eigen account.

Admin heeft toegang tot beheerfuncties, zoals registraties, donateurs, wijzigingsverzoeken, import, export en instellingen.

Super admin is bedoeld voor de hoogste beheerlaag en kan als aparte bestuursrol worden gebruikt.

Adminrechten moeten beperkt blijven tot personen die deze toegang echt nodig hebben.

## 23. Proces: nieuwe donateur

1. Donateur schrijft zich in.
2. Status wordt `PENDING`.
3. Admin beoordeelt de aanvraag.
4. Admin keurt goed, wijst af of vraagt correctie.
5. Bij goedkeuring krijgt de donateur een lidnummer en status `PAYMENT_REQUIRED`.
6. Na betaling en administratieve verwerking kan de donateur actief worden behandeld.

## 24. Proces: wijziging van gegevens

1. Donateur gaat naar "Mijn account".
2. Donateur vult nieuwe gegevens in.
3. Het systeem maakt een wijzigingsverzoek.
4. Admin beoordeelt het verzoek.
5. Bij goedkeuring worden de gegevens aangepast.
6. Bij afwijzing blijven de bestaande gegevens staan.

## 25. Proces: betaling

1. Admin bekijkt het financieel overzicht.
2. Het systeem toont berekende bijdragen.
3. Openstaande posten staan op `DUE`.
4. Admin kan een post op `PAID`, `DUE`, `WAIVED` of `MANUAL_CORRECTION` zetten.
5. De donateurslijst toont of er openstaande posten zijn.

Bij bankimport wordt een betaling gekoppeld aan het betalingsdoel. Als persoon 1 betaalt voor persoon 2, wordt alleen de bijdrage van persoon 2 als betaald geregistreerd. Persoon 1 wordt dan alleen als betaler of rekeninghouder in de notitie genoemd.

Jaarbetalingen mogen in termijnen binnen januari tot en met maart binnenkomen. Het systeem telt termijnen op. Bij een gedeeltelijke betaling blijft het restant zichtbaar als open jaarbetaling. Uitzonderingen kunnen handmatig via het financieel overzicht worden toegevoegd of gecorrigeerd.

Als bij een volgende jaarimport blijkt dat iemand geen betaling voor dat jaar heeft, moet deze persoon administratief op betaling afwachtend of inactief worden gezet of moet er een open jaarbetaling worden geregistreerd. Dit kan handmatig via het financieel overzicht.

## 26. Proces: overlijden

1. Bestuur ontvangt een betrouwbare melding.
2. Bestuur controleert intern of de melding voldoende is.
3. De donateur wordt administratief op `DECEASED` gezet.
4. De donateur verschijnt in de groep "Overleden".
5. Gegevens en uitvaartwensen worden zorgvuldig behandeld.

## 27. Rapportage-overzicht

Het portaal ondersteunt rapportage via dashboardblokken en exports.

Dashboardrapportage:

- Aantal registraties in afwachting.
- Aantal actie vereist.
- Aantal actieve donateurs.
- Aantal inactief of betaling afwachtend.
- Aantal afgewezen.
- Aantal overleden.

Donateursrapportage:

- Lijst per statusgroep.
- Zoekresultaten per naam, lidnummer, telefoon, e-mail of IBAN.
- Betaalstatus per donateur.

Financiele rapportage:

- Betaald totaal per donateur.
- Openstaand totaal per donateur.
- Berekende bijdragen per gezinslid.
- Betaalverplichtingen per bron en status.

Export:

- Bestanden voor administratie, controle of bestuur.
- Filters op actieve, inactieve, afgewezen en overleden donateurs.

## 28. Aanbevolen werkwijze voor bestuur

Controleer nieuwe registraties regelmatig.

Gebruik duidelijke donorberichten bij correctie of afwijzing.

Gebruik interne notities alleen voor bestuursinformatie.

Controleer imports altijd voordat ze definitief worden verwerkt.

Controleer bij bankimport altijd de kolommen Betalingsdoel, Betaler, Donor IBAN, Uitleg en Tweede opinie / fouten.

Verwerk tweede-opinie rijen niet zonder handmatige controle.

Bewaar exports veilig en verwijder oude exportbestanden.

Geef adminrechten alleen aan bevoegde personen.

Registreer iemand alleen als overleden na betrouwbare bevestiging.

Controleer prijsinstellingen voordat betaaloverzichten worden gebruikt.

## 29. Beperkingen en aandachtspunten

Online betalen staat nog niet actief in het portaal. Bij betaling vereist ziet de donateur dat betaling later volgt.

E-mails worden nog niet automatisch verzonden. Ze worden voorbereid in de e-maillog.

De overgang van `PAYMENT_REQUIRED` naar `ACTIVE` moet bestuurlijk en administratief goed worden afgesproken.

De lokale bankomschrijving-parser kan veel varianten en spelfouten herkennen, maar is geen garantie dat elke omschrijving correct wordt begrepen. Daarom bestaat de preview en tweede-opinie werkwijze.

Gezinsverwijzingen uit bankimport zijn informatief. Ze vervangen geen officiele registratie van partner of kinderen.

De optionele AI-hulplezer staat alleen aan als daarvoor expliciet OpenAI-instellingen zijn ingevuld. Bij gevoelige bankdata moet het bestuur eerst bepalen of externe verwerking is toegestaan.

Privacy- en beleidsteksten moeten voor officieel gebruik door het bestuur worden gecontroleerd.

Bij juridische of privacyvragen moet het bestuur advies vragen aan iemand met kennis van AVG en stichtingsadministratie.
