import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, PDFName, StandardFonts } from "pdf-lib";
import type { FuneralFormData } from "@/lib/funeral-application";

function safeFilenamePart(value: string) {
  return value.replace(/[<>:"/\\|?*]+/g, " ").replace(/\s+/g, "-").replace(/^[ .-]+|[ .-]+$/g, "") || "onbekende-persoon";
}

export function avgFuneralApplicationFilename(data: FuneralFormData) {
  return `AVG-${safeFilenamePart(`${data.deceasedFirstName} ${data.deceasedLastName}`)}.pdf`;
}

export async function generateAvgFuneralApplicationPdf(data: FuneralFormData) {
  const source = await readFile(path.join(process.cwd(), "public", "templates", "avg-zuiderbegraafplaats-2026.pdf"));
  const pdf = await PDFDocument.load(source);
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const values: Record<string, string> = {
    "BSN overledene": data.deceasedBsn,
    "Achternaam overledene": data.deceasedLastName,
    "Voornaam overledene": data.deceasedFirstName,
    "Geboortedatum overledene": data.deceasedBirthDate,
    "Geboorteplaats overledene": data.deceasedBirthPlace,
    "Geslacht overledene": data.deceasedGender,
    "Straat overledene": data.deceasedStreet,
    "Huis nr overledene": data.deceasedHouseNumber,
    "Pc overledene": data.deceasedPostalCode,
    "Woonplaats overledene": data.deceasedCity,
    "Land overledene": data.deceasedCountry,
    "Overlijdensplaats": data.deathPlace,
    "Overlijdendatum": data.deathDate,
    "Overlijdenstijd": data.deathTime,
    "Natuurlijk dood": data.naturalDeath,
    "Lijkvinding": data.bodyFound,
    "Burgelijkstaat Overledene": data.maritalStatus,
    "Achternaam partner": data.partnerLastName,
    "Voornaam partner": data.partnerFirstName,
    "Geboortedatum partner": data.partnerBirthDate,
    "Achternaam Erfgenaam": data.applicantLastName,
    "Voornaam Erfgenaam": data.applicantFirstName,
    "Relatie Erfgenaam": data.applicantRelationship,
    "Geboortedatum Erfgenaam": data.applicantBirthDate,
    "Geboorteplaats Erfgenaam": data.applicantBirthPlace,
    "Straat Erfgenaam": data.applicantStreet,
    "Huis nr Erfgenaam": data.applicantHouseNumber,
    "Pc Erfgenaam": data.applicantPostalCode,
    "Woonplaats Erfgenaam": data.applicantCity,
    "Land Erfgenaam": data.applicantCountry,
    "BSN Erfgenaam": data.applicantBsn,
    "Telefoon Erfgenaam": data.applicantPhone,
    "Email Erfgenaam": data.applicantEmail,
    "Naam begraafplaats": data.burialLocation,
    "Handtekening aanvrager": data.signatureName,
    "Graf uitvoering": ({ "Standaard graf": "Standaard Graf", "Graf met kelder": "Graf met kelder", "Graf met gesloten kelder": "Graf met Gesloten kelder" } as Record<string, string>)[data.graveType]
  };
  for (const [name, value] of Object.entries(values)) {
    const field = form.getTextField(name);
    field.setText(String(value ?? ""));
    field.setFontSize(8);
  }
  const periodFields: Record<string, string> = {
    "15 jaar": "Particulier graf voor 15 jaar indien gereserveerd grafnummer",
    "30 jaar": "Particulier graf voor 30 jaar indien gereserveerd grafnummer",
    "Onbepaalde tijd": "Particulier graf voor onbepaalde tijd"
  };
  form.getCheckBox(periodFields[data.gravePeriod]).check();
  form.updateFieldAppearances(font);
  form.flatten();

  // Maak een zelfstandige, compacte uitsnede van pagina 7 t/m 10 voor verzending.
  const output = await PDFDocument.create();
  pdf.getPages().slice(6, 10).forEach(page => page.node.delete(PDFName.of("Annots")));
  const pages = await output.copyPages(pdf, [6, 7, 8, 9]);
  pages.forEach(page => output.addPage(page));
  return Buffer.from(await output.save({ useObjectStreams: true }));
}
