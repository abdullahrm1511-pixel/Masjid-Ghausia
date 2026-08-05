import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageDonors } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const session = await auth();
  if (!canManageDonors(session?.user.role)) return new NextResponse("Geen toegang", { status: 403 });
  const { id, documentId } = await params;
  const document = await prisma.funeralApplicationDocument.findFirst({ where: { id: documentId, funeralApplicationId: id } });
  if (!document) return new NextResponse("Document niet gevonden", { status: 404 });
  const filename = document.filename.replace(/[\r\n"\\]/g, "-");
  return new NextResponse(new Uint8Array(document.data), { headers: { "Content-Type": document.contentType, "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
