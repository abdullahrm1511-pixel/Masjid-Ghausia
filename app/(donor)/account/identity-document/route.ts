import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "id-document";
}

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return new NextResponse("Niet ingelogd", { status: 401 });
  }

  const profile = await prisma.donorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true }
  });

  if (!profile) {
    return new NextResponse("Profiel niet gevonden", { status: 404 });
  }

  const document = await prisma.identityDocument.findUnique({
    where: { donorProfileId: profile.id }
  });

  if (!document) {
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
