import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createRegistrationSummaryPdf } from "@/lib/pdf/registration-summary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return new NextResponse("Niet ingelogd", { status: 401 });
  }

  const request = await prisma.registrationRequest.findFirst({
    where: { requestedById: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: true,
      donorProfile: { include: { familyMembers: true } }
    }
  });

  if (!request) {
    return new NextResponse("Geen inschrijving gevonden", { status: 404 });
  }

  const pdf = createRegistrationSummaryPdf(request);
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="inschrijfoverzicht-stgbc.pdf"'
    }
  });
}
