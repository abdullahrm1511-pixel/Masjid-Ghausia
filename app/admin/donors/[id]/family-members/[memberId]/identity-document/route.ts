import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "id-document";
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const session = await auth();
  if (!isAdminRole(session?.user.role)) {
    return new NextResponse("Geen toegang", { status: 403 });
  }

  const { id, memberId } = await params;
  const document = await prisma.identityDocument.findUnique({
    where: { familyMemberId: memberId },
    include: { familyMember: { select: { donorProfileId: true } } }
  });

  if (!document || document.familyMember?.donorProfileId !== id) {
    return new NextResponse("ID-document niet gevonden", { status: 404 });
  }

  return new NextResponse(document.data, {
    headers: {
      "Content-Type": document.contentType,
      "Content-Disposition": `inline; filename="${safeFilename(document.filename)}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
