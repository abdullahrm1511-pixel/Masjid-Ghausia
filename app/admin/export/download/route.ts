import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { DonorStatus, FamilyMemberType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { displayEmail, formatDate } from "@/lib/display";
import { formatIban } from "@/lib/iban";

export const dynamic = "force-dynamic";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function donorWhere(filter: string): Prisma.DonorProfileWhereInput | undefined {
  if (filter === "active") return { status: DonorStatus.ACTIVE, NOT: { paymentObligations: { some: { status: "DUE", obligationType: "ANNUAL" } } } };
  if (filter === "inactive") {
    return {
      OR: [
        { status: DonorStatus.INACTIVE },
        { paymentObligations: { some: { status: "DUE", obligationType: "ANNUAL" } } }
      ]
    };
  }
  if (filter === "rejected") return { status: DonorStatus.REJECTED };
  if (filter === "deceased") return { status: DonorStatus.DECEASED };
  if (filter === "payment_required") return { status: DonorStatus.INACTIVE };
  if (filter === "open_change_requests") return { changeRequests: { some: { status: "PENDING" } } };
  return undefined;
}

async function exportRows(filter: string) {
  const donors = await prisma.donorProfile.findMany({
    where: donorWhere(filter),
    include: {
      user: true,
      familyMembers: true,
      paymentObligations: true
    },
    orderBy: [{ registrationNumber: "asc" }, { createdAt: "desc" }]
  });

  return donors.map((donor) => {
    const paid = donor.paymentObligations.filter((item) => item.status === "PAID");
    const due = donor.paymentObligations.filter((item) => item.status === "DUE");
    return {
      Lidnummer: donor.registrationNumber ?? "",
      IBAN: formatIban(donor.iban),
      Naam: `${donor.firstName} ${donor.lastName}`.trim(),
      Status: donor.status,
      Email: displayEmail(donor.user.email),
      Telefoon: donor.phone,
      Adres: `${donor.addressLine1} ${donor.postalCode} ${donor.city}`.trim(),
      Gezin: donor.familyMembers.map((member) => `${member.type}: ${member.firstName} ${member.lastName}`.trim()).join(" | "),
      "Berekende verplichtingen": "",
      "Geimporteerd betaald bedrag": paid.reduce((sum, item) => sum + item.amountCents, 0) / 100,
      Betaaldatum: paid.map((item) => formatDate(item.paidAt)).filter((item) => item !== "-").join(" | "),
      Betaalstatus: due.length ? "Openstaand" : paid.length ? "Betaald" : "",
      "Openstaand bedrag": due.reduce((sum, item) => sum + item.amountCents, 0) / 100
    };
  });
}

function nextNumericKey(existing: Array<string | null | undefined>) {
  return existing.reduce((max, value) => {
    const number = Number(String(value ?? "").replace(/\D/g, ""));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
}

function formatLegacyKey(value: string | null | undefined, fallbackNumber: number) {
  const raw = String(value ?? "").trim();
  const numeric = raw ? Number(raw.replace(/\D/g, "")) : fallbackNumber;
  return String(Number.isFinite(numeric) && numeric > 0 ? numeric : fallbackNumber).padStart(5, "0");
}

function displayRegistrationNumber(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  const match = text.match(/^11-(\d{1,5})$/);
  return match ? `11-${match[1].padStart(5, "0")}` : text;
}

function relationshipLabel(type?: FamilyMemberType) {
  if (type === "PARTNER") return "Member's Partner";
  if (type === "CHILD") return "Member's Child";
  return "Primary Member";
}

function genderLabel(value: string | null | undefined) {
  if (value === "MALE") return "Male";
  if (value === "FEMALE") return "Female";
  return "";
}

function maritalLabel(value: string | null | undefined) {
  if (value === "MARRIED") return "Married";
  if (value === "SINGLE") return "Single";
  if (value === "DIVORCED") return "Divorced";
  if (value === "WIDOWED") return "Widowed";
  return "";
}

function isoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function recordStatus(value: string | boolean | null | undefined) {
  if (value === false) return "Inactive";
  if (value === "DECEASED") return "Deceased";
  if (value === "REJECTED") return "Cancelled";
  if (value === "INACTIVE" || value === "PAYMENT_REQUIRED") return "Inactive";
  return "";
}

async function exportMemberPersonalDetailsRows() {
  const donors = await prisma.donorProfile.findMany({
    include: {
      user: true,
      familyMembers: { orderBy: [{ type: "asc" }, { dateOfBirth: "asc" }, { createdAt: "asc" }] }
    },
    orderBy: [{ registrationNumber: "asc" }, { createdAt: "asc" }]
  });

  const existingMemberKeys = [
    ...donors.map((donor) => donor.legacyMemberDetailKey),
    ...donors.flatMap((donor) => donor.familyMembers.map((member) => member.legacyMemberDetailKey))
  ];
  const existingAddressKeys = [
    ...donors.map((donor) => donor.legacyAddressKey),
    ...donors.flatMap((donor) => donor.familyMembers.map((member) => member.legacyAddressKey))
  ];
  let nextMemberKey = nextNumericKey(existingMemberKeys) + 1;
  let nextAddressKey = nextNumericKey(existingAddressKeys) + 1;
  const generatedAddressKeys = new Map<string, number>();

  return donors.flatMap((donor) => {
    const donorAddressFallback = donor.legacyAddressKey
      ? Number(donor.legacyAddressKey.replace(/\D/g, ""))
      : generatedAddressKeys.get(donor.id) ?? nextAddressKey++;
    generatedAddressKeys.set(donor.id, donorAddressFallback);
    const registrationNumber = displayRegistrationNumber(donor.registrationNumber);
    const addressKey = formatLegacyKey(donor.legacyAddressKey, donorAddressFallback);

    const primary = {
      "MEM DETAIL NR KEY": formatLegacyKey(donor.legacyMemberDetailKey, nextMemberKey++),
      "REGISTRATION NR KEY": registrationNumber,
      "ADDR NR KEY": addressKey,
      "ADDRESS LINE 1 Display Only": donor.addressLine1,
      "FIRST NAME": donor.firstName,
      "MIDDLE NAME": "",
      SURNAME: donor.lastName,
      "RELATIONSHIP TO MEMBER": relationshipLabel(),
      "DATE OF BIRTH": isoDate(donor.dateOfBirth),
      "PLACE OF BIRTH": donor.birthPlace,
      GENDER: genderLabel(donor.gender),
      "MARITAL STATUS": maritalLabel(donor.maritalStatus),
      TELEPHONE: donor.phone,
      EMAIL: displayEmail(donor.user.email),
      "RECORD STATUS": recordStatus(donor.status),
      "BEFORE 18 YR": ""
    };

    const familyRows = donor.familyMembers.map((member) => ({
      "MEM DETAIL NR KEY": formatLegacyKey(member.legacyMemberDetailKey, nextMemberKey++),
      "REGISTRATION NR KEY": registrationNumber,
      "ADDR NR KEY": formatLegacyKey(member.legacyAddressKey ?? donor.legacyAddressKey, donorAddressFallback),
      "ADDRESS LINE 1 Display Only": donor.addressLine1,
      "FIRST NAME": member.firstName,
      "MIDDLE NAME": "",
      SURNAME: member.lastName,
      "RELATIONSHIP TO MEMBER": relationshipLabel(member.type),
      "DATE OF BIRTH": isoDate(member.dateOfBirth),
      "PLACE OF BIRTH": member.birthPlace ?? "",
      GENDER: genderLabel(member.gender),
      "MARITAL STATUS": "",
      TELEPHONE: "",
      EMAIL: "",
      "RECORD STATUS": recordStatus(member.isActive),
      "BEFORE 18 YR": ""
    }));

    return [primary, ...familyRows];
  });
}

export async function GET(request: NextRequest) {
  const filter = request.nextUrl.searchParams.get("filter") ?? "all";
  const format = request.nextUrl.searchParams.get("format") ?? "xlsx";
  const template = request.nextUrl.searchParams.get("template") ?? "";

  if (template === "member-personal-details") {
    const rows = await exportMemberPersonalDetailsRows();
    const headers = [
      "MEM DETAIL NR KEY",
      "REGISTRATION NR KEY",
      "ADDR NR KEY",
      "ADDRESS LINE 1 Display Only",
      "FIRST NAME",
      "MIDDLE NAME",
      "SURNAME",
      "RELATIONSHIP TO MEMBER",
      "DATE OF BIRTH",
      "PLACE OF BIRTH",
      "GENDER",
      "MARITAL STATUS",
      "TELEPHONE",
      "EMAIL",
      "RECORD STATUS",
      "BEFORE 18 YR"
    ];

    if (format === "csv") {
      const csv = [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header as keyof typeof row])).join(","))].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="members-personal-details-export.csv"`
        }
      });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Members Personal Details");
    worksheet.getCell("A1").value = "Next Seq Nr Available";
    worksheet.mergeCells("F1:J1");
    worksheet.getCell("F1").value = "Members Personal Details";
    worksheet.getCell("F1").font = { bold: true, size: 18 };
    worksheet.getRow(2).values = headers;
    worksheet.getRow(2).font = { bold: true };
    worksheet.columns = headers.map((header) => ({ key: header, width: header.length < 12 ? 14 : 24 }));
    rows.forEach((row) => worksheet.addRow(row));
    worksheet.views = [{ state: "frozen", ySplit: 2 }];
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="members-personal-details-export.xlsx"`
      }
    });
  }

  const rows = await exportRows(filter);
  const headers = Object.keys(rows[0] ?? {
    Lidnummer: "",
    IBAN: "",
    Naam: "",
    Status: "",
    Email: "",
    Telefoon: "",
    Adres: "",
    Gezin: "",
    "Berekende verplichtingen": "",
    "Geimporteerd betaald bedrag": "",
    Betaaldatum: "",
    Betaalstatus: "",
    "Openstaand bedrag": ""
  });

  if (format === "csv") {
    const csv = [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header as keyof typeof row])).join(","))].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="st-gbc-export-${filter}.csv"`
      }
    });
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Donateurs");
  worksheet.columns = headers.map((header) => ({ header, key: header, width: 24 }));
  rows.forEach((row) => worksheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="st-gbc-export-${filter}.xlsx"`
    }
  });
}
