import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; responseId: string; documentId: string }> }) {
  const session = await auth();
  if (!session?.user.id || !canManageSettings(session.user.role)) return new NextResponse("Geen toegang", { status: 403 });
  const { id, responseId, documentId } = await params;
  const document = await prisma.surveyResponseDocument.findFirst({ where: { id: documentId, surveyResponseId: responseId, surveyResponse: { surveyId: id } } });
  if (!document) return new NextResponse("Niet gevonden", { status: 404 });
  return new NextResponse(new Uint8Array(document.data), { headers: { "Content-Type": document.contentType, "Content-Length": String(document.fileSize), "Content-Disposition": `attachment; filename="${document.filename.replace(/[\r\n"]/g, "_")}"`, "X-Content-Type-Options": "nosniff" } });
}
