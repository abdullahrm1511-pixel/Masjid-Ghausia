import { readFile } from "fs/promises";
import path from "path";
import type { DonorProfile, FamilyMember, RegistrationRequest, User } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatIban } from "@/lib/iban";
import { calculateCurrentAnnualAmount, calculateTotalOneTimeContribution, getPricingConfig } from "@/lib/pricing";

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

const NOT_APPLICABLE = "(n.v.t.)";

function formatDateOnly(date?: Date | null) {
  if (!date) return "";
  return date.toLocaleDateString("nl-NL");
}

function formatMoney(value?: number | string | null) {
  const amount = Number(String(value ?? 0).replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return amount.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatEuros(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fullName(person?: { firstName?: string | null; lastName?: string | null } | null) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ");
}

function setText(form: ReturnType<PDFDocument["getForm"]>, name: string, value?: string | null, fontSize = 10) {
  const text = value?.trim() || NOT_APPLICABLE;
  try {
    const field = form.getTextField(name);
    field.setText(text);
    field.setFontSize(fontSize);
  } catch {
    // The source PDF has a few unnamed/legacy fields. Missing fields should not block PDF generation.
  }
}

function setRadio(form: ReturnType<PDFDocument["getForm"]>, name: string, value?: string | null) {
  if (!value) return;
  try {
    form.getRadioGroup(name).select(value);
  } catch {
    // The source PDF uses legacy radio names. Missing fields should not block PDF generation.
  }
}

function removeField(form: ReturnType<PDFDocument["getForm"]>, name: string) {
  try {
    form.removeField(form.getField(name));
  } catch {
    // Some template versions may not contain this field.
  }
}

function genderRadioValue(gender?: string | null) {
  if (gender === "MALE") return "Yes";
  if (gender === "FEMALE") return "No";
  return null;
}

function pageTwoGenderValue(gender?: string | null) {
  if (gender === "MALE") return "0";
  if (gender === "FEMALE") return "1";
  return null;
}

function civilStatusValue(status?: string | null) {
  if (status === "MARRIED") return "1";
  if (status === "SINGLE") return "2";
  if (status === "DIVORCED") return "3";
  if (status === "WIDOWED") return "4";
  return null;
}

function drawPageTwoGenderMark(page: ReturnType<PDFDocument["addPage"]> | undefined, gender?: string | null) {
  if (!page || !gender) return;
  page.drawText("X", {
    x: gender === "MALE" ? 439 : 485,
    y: 548,
    size: 11,
    color: rgb(0.08, 0.1, 0.16)
  });
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
  const pricing = await getPricingConfig();
  const calculationDate = donor.approvedAt ?? request.reviewedAt ?? request.submittedAt ?? request.createdAt;
  const partner = donor.familyMembers.find((member) => member.type === "PARTNER");
  const children = donor.familyMembers.filter((member) => member.type === "CHILD");
  const donation = formatMoney(submitted.donationAmount);
  const oneTimeAmount = formatEuros(calculateTotalOneTimeContribution(donor, donor.familyMembers, pricing, calculationDate));
  const annualAmount = formatEuros(calculateCurrentAnnualAmount(donor, donor.familyMembers, pricing, calculationDate));
  const today = formatDateOnly(request.submittedAt ?? request.createdAt);
  const applicantName = fullName(donor);
  const address = [donor.addressLine1, donor.addressLine2].filter(Boolean).join(", ");
  const postalCity = [donor.postalCode, donor.city].filter(Boolean).join(" ");
  removeField(form, "Button1");
  setRadio(form, "Radio Button1", "1");
  setRadio(form, "Radio Button2", pageTwoGenderValue(donor.gender));
  setRadio(form, "Primery", genderRadioValue(donor.gender));
  setRadio(form, "Partner", genderRadioValue(partner?.gender));
  setRadio(form, "Burgelijkstaat", civilStatusValue(donor.maritalStatus));
  setText(form, "Een malig Donatie €", oneTimeAmount);
  setText(form, "Jaarlijks donatie €", annualAmount);
  setText(form, "Registratienummer", donor.registrationNumber);

  setText(form, "undefined", applicantName);
  setText(form, "undefined_2", address);
  setText(form, "Postcodeplaats", postalCity);
  setText(form, "undefined_3", donor.phone);
  setText(form, "Email", request.requestedBy.email, 9);
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

  [0, 1, 2].forEach((index) => {
    const child = children[index];
    const nameField = ["undefined_5", "undefined_6", "undefined_7"][index];
    const dateField = ["Geboortedatum_3", "Geboortedatum_4", "Geboortedatum_5"][index];
    const genderField = ["Kind1", "Kind2", "Kind3"][index];
    setText(form, nameField, fullName(child), 9);
    setText(form, dateField, formatDateOnly(child?.dateOfBirth), 9);
    setRadio(form, genderField, genderRadioValue(child?.gender));
  });

  setText(form, "Naam", applicantName);
  setText(form, "Adres", address);
  setText(form, "Post Code Woonplaats", postalCity);
  setText(form, "Tel nr", donor.phone);
  setText(form, "Donatie Beddrag €", donation);
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
        `${index + 4}. ${fullName(child) || NOT_APPLICABLE} - geboren op ${formatDateOnly(child.dateOfBirth) || NOT_APPLICABLE} te ${child.birthPlace || NOT_APPLICABLE}`,
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
  drawPageTwoGenderMark(pdfDoc.getPages()[1], donor.gender);

  return Buffer.from(await pdfDoc.save());
}
