import { readFile } from "fs/promises";
import path from "path";
import {
  drawObject,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFForm,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRef,
  PDFStream,
  PDFString,
  popGraphicsState,
  pushGraphicsState,
  scale,
  StandardFonts,
  translate
} from "pdf-lib";
import type { FuneralFormData } from "@/lib/funeral-application";

function safeFilenamePart(value: string) {
  return value.replace(/[<>:"/\\|?*]+/g, " ").replace(/\s+/g, "-").replace(/^[ .-]+|[ .-]+$/g, "") || "onbekende-persoon";
}

export function avgFuneralApplicationFilename(data: FuneralFormData) {
  return `AVG-${safeFilenamePart(`${data.deceasedFirstName} ${data.deceasedLastName}`)}.pdf`;
}

export function avgFuneralApplicationMailFilename(data: FuneralFormData) {
  return `AVG-${safeFilenamePart(`${data.deceasedFirstName} ${data.deceasedLastName}`)}-om-te-mailen.pdf`;
}

function formatDutchDate(value?: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${Number(day)}-${Number(month)}-${year}` : value;
}

function flattenSignatureFields(form: PDFForm) {
  const signatureNames = new Set(["Handtekening ondernemer", "Handtekening", "Handtekening uitvaartondernemer"]);
  const allFields = form.getFields();
  const mutableForm = form as PDFForm & { getFields: () => ReturnType<PDFForm["getFields"]> };
  const originalGetFields = form.getFields.bind(form);
  mutableForm.getFields = () => allFields.filter(field => signatureNames.has(field.getName()));
  try {
    form.flatten({ updateFieldAppearances: false });
  } finally {
    mutableForm.getFields = originalGetFields;
  }
}

function flattenSignatureStamps(pdf: PDFDocument) {
  for (const page of pdf.getPages()) {
    const annotations = page.node.Annots();
    if (!annotations) continue;
    const keptAnnotations = [];

    for (const annotationRef of annotations.asArray()) {
      const annotation = pdf.context.lookup(annotationRef);
      if (!(annotation instanceof PDFDict)) {
        keptAnnotations.push(annotationRef);
        continue;
      }
      const subtype = annotation.get(PDFName.of("Subtype"));
      const titleObject = annotation.get(PDFName.of("T"));
      const title = titleObject instanceof PDFString || titleObject instanceof PDFHexString ? titleObject.decodeText() : "";
      const isSignatureStamp = subtype === PDFName.of("Stamp") && title.toLowerCase() === "sadel";
      const isPopup = subtype === PDFName.of("Popup");

      if (isSignatureStamp) {
        const appearanceDictionary = annotation.lookupMaybe(PDFName.of("AP"), PDFDict);
        const normalAppearance = appearanceDictionary?.get(PDFName.of("N"));
        const appearanceRef = normalAppearance instanceof PDFRef ? normalAppearance : undefined;
        const appearance = appearanceRef ? pdf.context.lookup(appearanceRef, PDFStream) : undefined;
        const rectangle = annotation.lookupMaybe(PDFName.of("Rect"), PDFArray);
        const boundingBox = appearance?.dict.lookupMaybe(PDFName.of("BBox"), PDFArray);

        if (appearanceRef && appearance && rectangle && boundingBox) {
          const [x1, y1, x2, y2] = [0, 1, 2, 3].map(index => rectangle.lookup(index, PDFNumber).asNumber());
          const [bx1, by1, bx2, by2] = [0, 1, 2, 3].map(index => boundingBox.lookup(index, PDFNumber).asNumber());
          const width = Math.abs(x2 - x1);
          const height = Math.abs(y2 - y1);
          const appearanceWidth = Math.abs(bx2 - bx1);
          const appearanceHeight = Math.abs(by2 - by1);
          const xObjectKey = page.node.newXObject("FixedSignature", appearanceRef);
          page.pushOperators(
            pushGraphicsState(),
            translate(Math.min(x1, x2), Math.min(y1, y2)),
            scale(width / appearanceWidth, height / appearanceHeight),
            translate(-Math.min(bx1, bx2), -Math.min(by1, by2)),
            drawObject(xObjectKey),
            popGraphicsState()
          );
        }
        continue;
      }

      if (!isPopup) keptAnnotations.push(annotationRef);
    }

    page.node.set(PDFName.of("Annots"), pdf.context.obj(keptAnnotations));
  }
}

async function createFilledAvgPdf(data: FuneralFormData) {
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
    "Datum begrafenis": formatDutchDate(data.funeralDate),
    "Tijd begrafenis": data.funeralTime ?? "",
    "11-yyyymmdd-nr": data.coffinRegistrationNumber ?? "",
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
  return { pdf, form };
}

export async function generateAvgFuneralApplicationPdf(data: FuneralFormData) {
  const { pdf, form } = await createFilledAvgPdf(data);
  // Alleen de bestaande handtekeningafbeeldingen worden vastgezet. De overige
  // velden blijven intact, zodat alle vooraf ingevulde templategegevens behouden blijven.
  flattenSignatureFields(form);
  flattenSignatureStamps(pdf);
  return Buffer.from(await pdf.save({ useObjectStreams: true }));
}

export async function generateAvgFuneralApplicationMailPdf(data: FuneralFormData) {
  const { pdf, form } = await createFilledAvgPdf(data);
  flattenSignatureFields(form);
  flattenSignatureStamps(pdf);

  // Maak een zelfstandige, compacte versie met de externe gegevens en pagina 7 t/m 10.
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  const boldFont = await output.embedFont(StandardFonts.HelveticaBold);
  const summary = output.addPage([595.28, 841.89]);
  summary.drawText("Aanvullende begrafenisgegevens", { x: 55, y: 760, size: 18, font: boldFont });
  summary.drawText(`${data.deceasedFirstName} ${data.deceasedLastName}`, { x: 55, y: 728, size: 12, font });
  const summaryValues = [
    ["Datum begrafenis", formatDutchDate(data.funeralDate) || "-"],
    ["Tijd begrafenis", data.funeralTime || "-"],
    ["Kist registratienummer", data.coffinRegistrationNumber || "-"]
  ];
  summaryValues.forEach(([label, value], index) => {
    const y = 665 - (index * 62);
    summary.drawText(label, { x: 55, y, size: 10, font: boldFont });
    summary.drawText(value, { x: 55, y: y - 22, size: 11, font });
  });
  const pages = await output.copyPages(pdf, [6, 7, 8, 9]);
  pages.forEach(page => output.addPage(page));
  return Buffer.from(await output.save({ useObjectStreams: true }));
}
