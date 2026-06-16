import type { DonorProfile, FamilyMember, RegistrationRequest, User } from "@prisma/client";
import { formatIban } from "@/lib/iban";

type RegistrationWithDetails = RegistrationRequest & {
  requestedBy: User;
  donorProfile: (DonorProfile & { familyMembers: FamilyMember[] }) | null;
};

function pdfEscape(input: string) {
  return input.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(input: string, maxLength = 92) {
  const words = input.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function createPdf(lines: string[]) {
  const linesPerPage = 48;
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / linesPerPage)) }, (_, index) =>
    lines.slice(index * linesPerPage, (index + 1) * linesPerPage)
  );

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];
  const pagePlaceholders: Array<{ id: number; content: string }> = [];

  for (const pageLines of pages) {
    const stream = [
      "BT",
      "/F1 11 Tf",
      "14 TL",
      "50 800 Td",
      ...pageLines.flatMap((line) => [`(${pdfEscape(line)}) Tj`, "T*"]),
      "ET"
    ].join("\n");
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject("");
    pageIds.push(pageId);
    pagePlaceholders.push({ id: pageId, content: `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>` });
  }

  const pagesId = addObject(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  for (const placeholder of pagePlaceholders) {
    objects[placeholder.id - 1] = placeholder.content.replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`);
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function yesNo(value?: boolean) {
  return value ? "Ja" : "Nee";
}

export function buildRegistrationSummaryLines(request: RegistrationWithDetails) {
  const donor = request.donorProfile;
  const submitted = request.submittedData as {
    healthDeclaration?: boolean;
    legalResidence?: boolean;
    termsAccepted?: boolean;
  };

  if (!donor) {
    return ["Inschrijfoverzicht St. GBC", "", "Geen donateursprofiel gevonden bij deze inschrijving."];
  }

  const partner = donor.familyMembers.find((member) => member.type === "PARTNER");
  const children = donor.familyMembers.filter((member) => member.type === "CHILD");
  const rawLines = [
    "Inschrijfoverzicht St. GBC",
    "",
    `Inzenddatum: ${(request.submittedAt ?? request.createdAt).toLocaleDateString("nl-NL")}`,
    `Status: ${request.status}`,
    "",
    "Hoofddonateur",
    `Naam: ${donor.firstName} ${donor.lastName}`,
    `E-mail: ${request.requestedBy.email}`,
    `Telefoon: ${donor.phone}`,
    `Adres: ${donor.addressLine1}, ${donor.postalCode} ${donor.city}`,
    `Geboortedatum: ${donor.dateOfBirth.toLocaleDateString("nl-NL")}`,
    `Geboorteplaats: ${donor.birthPlace}`,
    `Geslacht: ${donor.gender ?? "-"}`,
    `Burgerlijke staat: ${donor.maritalStatus ?? "-"}`,
    `IBAN: ${formatIban(donor.iban)}`,
    `Rekeninghouder: ${donor.accountHolderName}`,
    "",
    "Partner",
    partner
      ? `${partner.firstName} ${partner.lastName}, geboren op ${partner.dateOfBirth.toLocaleDateString("nl-NL")} te ${partner.birthPlace ?? "-"}`
      : "Geen partner opgegeven.",
    "",
    "Kinderen",
    ...(children.length
      ? children.map((child, index) => `${index + 1}. ${child.firstName} ${child.lastName}, geboren op ${child.dateOfBirth.toLocaleDateString("nl-NL")} te ${child.birthPlace ?? "-"}`)
      : ["Geen kinderen opgegeven."]),
    "",
    "Contact Pakistan",
    `Naam: ${donor.pakistanContactName || "-"}`,
    `Telefoon: ${donor.pakistanContactPhone || "-"}`,
    "",
    "Uitvaartwensen",
    donor.funeralWishes || "-",
    "",
    "Verklaringen",
    `Gezondheidsverklaring geaccepteerd: ${yesNo(submitted.healthDeclaration)}`,
    `Verblijf in Nederland bevestigd: ${yesNo(submitted.legalResidence)}`,
    `Voorwaarden en privacy akkoord: ${yesNo(submitted.termsAccepted)}`,
    "",
    "Dit document is een kopie van de ingevulde inschrijving."
  ];

  return rawLines.flatMap((line) => wrapLine(line));
}

export function createRegistrationSummaryPdf(request: RegistrationWithDetails) {
  return createPdf(buildRegistrationSummaryLines(request));
}
