import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!canManageSettings(session?.user.role)) return new NextResponse("Geen toegang", { status: 403 });
  const { id } = await params;
  const survey = await prisma.survey.findUnique({ where: { id }, select: { slug: true } });
  if (!survey) return new NextResponse("Enquete niet gevonden", { status: 404 });
  const publicUrl = absoluteUrl(`/enquete/${survey.slug}`);
  const png = await QRCode.toBuffer(publicUrl, { type: "png", width: 1200, margin: 4, errorCorrectionLevel: "H", color: { dark: "#000000", light: "#ffffff" } });
  return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="enquete-${survey.slug}-qr.png"`, "Cache-Control": "private, no-store", "X-QR-Target": publicUrl } });
}
