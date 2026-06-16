import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { createRegistrationSummaryPdf } from "@/lib/pdf/registration-summary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isAdminRole(session?.user.role)) {
    return new NextResponse("Geen toegang", { status: 403 });
  }

  const { id } = await params;
  const registration = await prisma.registrationRequest.findUnique({
    where: { id },
    include: {
      requestedBy: true,
      donorProfile: { include: { familyMembers: true } }
    }
  });

  if (!registration) {
    return new NextResponse("Registratie niet gevonden", { status: 404 });
  }

  const pdf = createRegistrationSummaryPdf(registration);
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="inschrijfoverzicht-${id}.pdf"`
    }
  });
}
