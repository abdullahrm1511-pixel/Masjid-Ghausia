import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { DonorStatus, Prisma } from "@prisma/client";
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
        { status: { in: [DonorStatus.INACTIVE, DonorStatus.PAYMENT_REQUIRED] } },
        { paymentObligations: { some: { status: "DUE", obligationType: "ANNUAL" } } }
      ]
    };
  }
  if (filter === "rejected") return { status: DonorStatus.REJECTED };
  if (filter === "deceased") return { status: DonorStatus.DECEASED };
  if (filter === "payment_required") return { status: DonorStatus.PAYMENT_REQUIRED };
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

export async function GET(request: NextRequest) {
  const filter = request.nextUrl.searchParams.get("filter") ?? "all";
  const format = request.nextUrl.searchParams.get("format") ?? "xlsx";
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
