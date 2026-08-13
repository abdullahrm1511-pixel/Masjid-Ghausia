import { prisma } from "@/lib/prisma";

export type SepaConfig = { legalName: string; creditorIdentifier: string; address: string; email: string; noticeDays: number; termsVersion: string };
export const defaultSepaConfig: SepaConfig = { legalName: "", creditorIdentifier: "", address: "", email: "", noticeDays: 3, termsVersion: "2026-08-v1" };

export async function getSepaConfig() {
  const item = await prisma.appConfig.findUnique({ where: { key: "MASJID_MONTHLY_SEPA" } });
  return { ...defaultSepaConfig, ...(item?.value && typeof item.value === "object" ? item.value : {}) } as SepaConfig;
}

export function sepaConfigComplete(config: SepaConfig) {
  return Boolean(config.legalName.trim() && config.creditorIdentifier.trim() && config.address.trim() && config.email.includes("@") && config.termsVersion.trim());
}

export function agreementTerms(config: SepaConfig, amountCents: number) {
  const amount = `€ ${(amountCents / 100).toFixed(2).replace(".", ",")}`;
  return `DOORLOPENDE SEPA-INCASSOMACHTIGING EN BEVESTIGING MAANDELIJKSE DONATIE

Incassant: ${config.legalName}
Incassant-ID: ${config.creditorIdentifier}
Adres: ${config.address}
Contact: ${config.email}
Versie voorwaarden: ${config.termsVersion}

1. De donateur geeft ${config.legalName} toestemming om via Mollie maandelijks ${amount} van de bij de eerste betaling gebruikte rekening af te schrijven via SEPA Core-incasso.
2. De eerste donatie wordt tijdens de beveiligde Mollie-betaalstap uitgevoerd. De volgende incasso is ongeveer één maand later en loopt maandelijks door.
3. De donatie is vrijwillig, heeft geen vaste einddatum en kent geen boete of sanctie. De donateur kan het bedrag wijzigen of de donatie op ieder moment kosteloos opzeggen via het donatieformulier.
4. Een wijziging geldt voor toekomstige incasso's. Een opzegging stopt het aanmaken van nieuwe incasso's; reeds verwerkte betaalopdrachten kunnen nog volgens de bankregels worden afgehandeld.
5. De donateur ontvangt waar mogelijk vooraf bericht over bedrag en geplande incassodatum. Wijzigingen worden per e-mail bevestigd.
6. Bij onvoldoende saldo, blokkade, een ingetrokken mandaat of een andere bank-/Mollie-afwijzing kan een incasso mislukken. Er zijn vanuit Masjid Ghausia geen sancties; de donateur kan een nieuwe machtiging starten.
7. Onder SEPA Core kan een geïncasseerd bedrag binnen acht weken zonder opgave van reden via de bank worden teruggeboekt. Bij een niet-toegestane incasso kan een melding tot dertien maanden na afschrijving mogelijk zijn. Deze wettelijke rechten blijven volledig bestaan.
8. Mollie verwerkt de betaal- en rekeninggegevens. ${config.legalName} bewaart de machtiging, akkoordgegevens, Mollie-referenties, wijzigingen en opzegging voor administratie, bewijs en naleving van verplichtingen. Gegevens worden niet langer bewaard dan noodzakelijk.
9. De ingevulde volledige naam geldt samen met de afzonderlijke akkoordverklaringen, datum/tijd en de voltooide Mollie-betaalstap als digitale bevestiging van deze machtiging.
10. Vragen, correcties, opzeggingen of meldingen over een incasso kunnen worden gestuurd naar ${config.email}.`;
}
