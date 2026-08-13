import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMolliePayment } from "@/lib/mollie";
import { syncMonthlyMolliePayment } from "@/lib/monthly-donations";

export async function POST(request: Request) {
  const formData = await request.formData();
  const paymentId = String(formData.get("id") ?? "");
  if (!/^tr_[A-Za-z0-9]+$/.test(paymentId)) return new NextResponse("Missing payment id", { status: 400 });

  try {
    const monthly = await syncMonthlyMolliePayment(paymentId);
    if (monthly.mandatePending) return new NextResponse("Mandate not ready yet, please retry", { status: 503 });
    if (monthly.donor) return new NextResponse("OK", { status: 200 });

    const payment = monthly.payment ?? await getMolliePayment(paymentId);
    await prisma.donationPayment.updateMany({ where: { molliePaymentId: payment.id }, data: { status: payment.status, paidAt: payment.status === "paid" && payment.paidAt ? new Date(payment.paidAt) : null } });
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Mollie-webhook verwerken mislukt", error);
    return new NextResponse("Temporary processing error", { status: 500 });
  }
}
