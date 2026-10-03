import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageDonors } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { FuneralFormData } from "@/lib/funeral-application";
import { avgFuneralApplicationMailFilename, generateAvgFuneralApplicationMailPdf } from "@/lib/pdf/avg-funeral-application";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canManageDonors(session.user.role)) return new NextResponse("Geen toegang", { status: 403 });
  const { id } = await params;
  const application = await prisma.funeralApplication.findUnique({ where: { id } });
  if (!application?.formData) return new NextResponse("Aanvraag is nog niet ingevuld", { status: 404 });
  const data = application.formData as FuneralFormData;
  const pdf = await generateAvgFuneralApplicationMailPdf(data);
  const mode = new URL(request.url).searchParams.get("view") === "1" ? "inline" : "attachment";
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${mode}; filename="${avgFuneralApplicationMailFilename(data)}"`, "Cache-Control": "private, no-store" } });
}
