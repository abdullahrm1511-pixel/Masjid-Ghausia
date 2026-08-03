import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageDonors } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { FuneralFormData } from "@/lib/funeral-application";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!canManageDonors(session?.user.role)) return new NextResponse("Geen toegang", { status: 403 });
  const { id } = await params;
  const application = await prisma.funeralApplication.findUnique({ where: { id } });
  if (!application?.formData) return new NextResponse("Aanvraag is nog niet ingevuld", { status: 404 });
  const data = application.formData as FuneralFormData;
  const source = await readFile(path.join(process.cwd(), "public", "templates", "gegevens-aanvraag-overledene.pdf"));
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
    "Burgerlijkstaat": data.maritalStatus,
    "Achternaam partner": data.partnerLastName,
    "Voornaam partner": data.partnerFirstName,
    "Geboortedatum partner": data.partnerBirthDate,
    "Achternaam Erfgenaam": data.applicantLastName,
    "Voornaam Erfgenaam": data.applicantFirstName,
    "Relatie Erfgenaam": data.applicantRelationship,
    "Geboortedatum Erfgenaam": data.applicantBirthDate,
    "Geboorteplaats Erfgenaam": data.applicantBirthPlace,
    "Straat  Erfgenaam": data.applicantStreet,
    "Huis nr Erfgenaam": data.applicantHouseNumber,
    "Pc Erfgenaam": data.applicantPostalCode,
    "Woonplaats Erfgenaam": data.applicantCity,
    "Land Erfgenaam": data.applicantCountry,
    "BSN Erfgenaam": data.applicantBsn,
    "Telefoon Erfgenaam": data.applicantPhone,
    "Email Erfgenaam": data.applicantEmail,
    "Waar wilt u overledene begraven": data.burialLocation,
    "Handtekening aanvrager": data.signatureName
  };
  for (const [name, value] of Object.entries(values)) {
    const field = form.getTextField(name);
    field.setText(String(value ?? ""));
    field.setFontSize(8);
  }
  const periodFields: Record<string, string> = { "15 jaar": "15j", "30 jaar": "30j", "Onbepaalde tijd": "OT" };
  const graveFields: Record<string, string> = { "Standaard graf": "st", "Graf met kelder": "GK", "Graf met gesloten kelder": "OK" };
  form.getCheckBox(periodFields[data.gravePeriod]).check();
  form.getCheckBox(graveFields[data.graveType]).check();
  form.updateFieldAppearances(font);
  const page = pdf.getPages()[0];
  const submitted = application.submittedAt ?? new Date();
  page.drawRectangle({ x: 70, y: 7, width: 170, height: 18, color: rgb(1, 1, 1) });
  page.drawText(`Datum: ${submitted.toLocaleDateString("nl-NL")}`, { x: 72, y: 13, size: 9, font });
  const bytes = await pdf.save();
  const filename = `begrafenisaanvraag-${data.deceasedLastName.replace(/[^a-zA-Z0-9-]/g, "-")}.pdf`;
  return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
