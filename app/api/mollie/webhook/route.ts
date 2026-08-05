import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMolliePayment } from "@/lib/mollie";

export async function POST(request: Request) {
  const formData = await request.formData();
  const paymentId = String(formData.get("id") ?? "");
  if (!paymentId) return new NextResponse("Missing payment id", { status: 400 });
  const payment = await getMolliePayment(paymentId);
  await prisma.donationPayment.updateMany({
    where: { molliePaymentId: payment.id },
    data: { status: payment.status, paidAt: payment.status === "paid" && payment.paidAt ? new Date(payment.paidAt) : null }
  });
  return new NextResponse("OK", { status: 200 });
}
