import { readFile } from "fs/promises";
import path from "path";
import type { DonorProfile, FamilyMember, RegistrationRequest, User } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatIban } from "@/lib/iban";

type RegistrationWithDetails = RegistrationRequest & {
  requestedBy: User;
  donorProfile: (DonorProfile & { familyMembers: FamilyMember[] }) | null;
};

type SubmittedRegistrationData = {
  donationAmount?: number | string | null;
  healthDeclaration?: boolean;
  legalResidence?: boolean;
  termsAccepted?: boolean;
};

function formatDateOnly(date?: Date | null) {
  if (!date) return "";
  return date.toLocaleDateString("nl-NL");
}

function formatMoney(value?: number | string | null) {
  const amount = Number(String(value ?? 0).replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return amount.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fullName(person?: { firstName?: string | null; lastName?: string | null } | null) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ");
}

function setText(form: ReturnType<PDFDocument["getForm"]>, name: string, value?: string | null, fontSize = 10) {
  if (!value) return;
  try {
    const field = form.getTextField(name);
    field.setText(value);
    field.setFontSize(fontSize);
  } catch {
    // The source PDF has a few unnamed/legacy fields. Missing fields should not block PDF generation.
  }
}

function drawWrappedText(page: ReturnType<PDFDocument["addPage"]>, text: string, x: number, y: number, maxWidth: number, size = 10) {
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length * size * 0.52 > maxWidth && line) {
      page.drawText(line, { x, y: cursorY, size, color: rgb(0.08, 0.1, 0.16) });
      cursorY -= size + 5;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) page.drawText(line, { x, y: cursorY, size, color: rgb(0.08, 0.1, 0.16) });
}

export async function createRegistrationSummaryPdf(request: RegistrationWithDetails) {
  const templatePath = path.join(process.cwd(), "public", "templates", "inschrijf-formulier-stgbc.pdf");
  const template = await readFile(templatePath);
  const pdfDoc = await PDFDocument.load(template);
  const form = pdfDoc.getForm();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const donor = request.donorProfile;

  if (!donor) {
    return Buffer.from(await pdfDoc.save());
  }

  const submitted = request.submittedData as SubmittedRegistrationData;
  const partner = donor.familyMembers.find((member) => member.type === "PARTNER");
  const children = donor.familyMembers.filter((member) => member.type === "CHILD");
  const donation = formatMoney(submitted.donationAmount);
  const today = formatDateOnly(request.submittedAt ?? request.createdAt);
  const applicantName = fullName(donor);
  const address = [donor.addressLine1, donor.addressLine2].filter(Boolean).join(", ");
  const postalCity = [donor.postalCode, donor.city].filter(Boolean).join(" ");

  setText(form, "Jaarlijks donatie €", donation);
  setText(form, "undefined", applicantName);
  setText(form, "undefined_2", address);
  setText(form, "Postcodeplaats", postalCity);
  setText(form, "undefined_3", donor.phone);
  setText(form, "Geboortedatum", formatDateOnly(donor.dateOfBirth));
  setText(form, "Geboorteplaats", donor.birthPlace);
  setText(form, "IBAN Rekening nr", formatIban(donor.iban));
  setText(form, "undefined_4", fullName(partner));
  setText(form, "Geboortedatum_2", formatDateOnly(partner?.dateOfBirth));
  setText(form, "Geboorteplaats_2", partner?.birthPlace);
  setText(form, "undefined_8", donor.pakistanContactName);
  setText(form, "undefined_9", donor.pakistanContactPhone);
  setText(form, "Begrafeniswensen", donor.funeralWishes);
  setText(form, "Datum", today);
  setText(form, "Akkoord aanvrager", applicantName);

  children.slice(0, 3).forEach((child, index) => {
    const nameField = ["undefined_5", "undefined_6", "undefined_7"][index];
    const dateField = ["Geboortedatum_3", "Geboortedatum_4", "Geboortedatum_5"][index];
    setText(form, nameField, fullName(child), 9);
    setText(form, dateField, formatDateOnly(child.dateOfBirth), 9);
  });

  setText(form, "Naam", applicantName);
  setText(form, "Adres", address);
  setText(form, "Post Code Woonplaats", postalCity);
  setText(form, "Tel nr", donor.phone);
  setText(form, "BankGiro Nummer", formatIban(donor.iban));
  setText(form, "Naam Rekening houder", donor.accountHolderName);

  if (children.length > 3) {
    const page = pdfDoc.insertPage(2, [595, 842]);
    page.drawText("Aanvullende kinderen", { x: 50, y: 790, size: 18, color: rgb(0.03, 0.22, 0.42) });
    page.drawText("Deze kinderen zijn aanvullend op de eerste drie kinderen op het inschrijfformulier.", {
      x: 50,
      y: 765,
      size: 10,
      color: rgb(0.29, 0.33, 0.41)
    });
    let y = 725;
    children.slice(3).forEach((child, index) => {
      drawWrappedText(
        page,
        `${index + 4}. ${fullName(child)} - geboren op ${formatDateOnly(child.dateOfBirth)} te ${child.birthPlace || "-"}`,
        50,
        y,
        495,
        11
      );
      y -= 34;
    });
  }

  form.updateFieldAppearances(font);
  form.flatten();

  const pages = pdfDoc.getPages();
  if (donation) {
    pages[0]?.drawText(donation, { x: 420, y: 722, size: 10, color: rgb(0.08, 0.1, 0.16) });
    pages[1]?.drawText(donation, { x: 165, y: 360, size: 10, color: rgb(0.08, 0.1, 0.16) });
  }
  pages[0]?.drawText(request.requestedBy.email, { x: 300, y: 569, size: 9, color: rgb(0.08, 0.1, 0.16) });
  pages[1]?.drawText(request.requestedBy.email, { x: 105, y: 389, size: 10, color: rgb(0.08, 0.1, 0.16) });

  return Buffer.from(await pdfDoc.save());
}
