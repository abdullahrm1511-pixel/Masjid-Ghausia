import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; agreementId: string }> }) {
  const session = await auth();
  if (!canManageSettings(session?.user.role)) return new NextResponse("Geen toegang", { status: 403 });
  const { id, agreementId } = await params;
  const agreement = await prisma.monthlyDonationAgreement.findFirst({ where: { id: agreementId, surveyDonorId: id } });
  if (!agreement?.pdfData) return new NextResponse("PDF nog niet beschikbaar", { status: 404 });
  const mode = new URL(request.url).searchParams.get("view") === "1" ? "inline" : "attachment";
  return new NextResponse(new Uint8Array(agreement.pdfData), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${mode}; filename="SEPA-machtiging-${agreement.agreementNumber}.pdf"`,
      "Cache-Control": "private, no-store"
    }
  });
}
