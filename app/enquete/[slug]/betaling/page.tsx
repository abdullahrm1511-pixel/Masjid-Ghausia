import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMolliePayment } from "@/lib/mollie";
import { donationFormPath } from "@/lib/donation-form-url";

export const dynamic = "force-dynamic";

export default async function DonationReturnPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ response?: string }> }) {
  const { slug } = await params;
  const { response: responseId } = await searchParams;
  if (!responseId) notFound();

  const paymentRecord = await prisma.donationPayment.findFirst({
    where: { surveyResponseId: responseId, surveyResponse: { survey: { slug } } },
    include: { surveyResponse: { include: { survey: true } } }
  });
  if (!paymentRecord) notFound();

  let status = paymentRecord.status;
  try {
    const payment = await getMolliePayment(paymentRecord.molliePaymentId);
    status = payment.status;
    if (status !== paymentRecord.status) {
      await prisma.donationPayment.update({
        where: { id: paymentRecord.id },
        data: { status, paidAt: status === "paid" && payment.paidAt ? new Date(payment.paidAt) : null }
      });
    }
  } catch {
    // De webhook werkt de status alsnog bij als Mollie tijdelijk niet bereikbaar is.
  }

  const paid = status === "paid";
  const retry = ["failed", "canceled", "expired"].includes(status);
  const formPath = donationFormPath(paymentRecord.surveyResponse.survey.templateKey, slug);
  return <main className="survey-page"><section className="survey-card survey-finished">
    <div className="survey-check">{paid ? "✓" : "i"}</div>
    <p className="donor-eyebrow">{paymentRecord.surveyResponse.survey.title}</p>
    <h1>{paid ? "Donatie ontvangen" : retry ? "Betaling niet afgerond" : "Betaling wordt verwerkt"}</h1>
    <p>{paid ? "Hartelijk dank voor uw donatie. De betaling is succesvol ontvangen." : retry ? "De betaling is niet gelukt of geannuleerd. U kunt het opnieuw proberen." : "Mollie verwerkt de betaling nog. U kunt deze pagina later opnieuw openen."}</p>
    {retry ? <Link className="donor-submit-button survey-submit mt-5 inline-block" href={formPath}>Opnieuw proberen</Link> : null}
    <Link className="mt-5 block font-semibold text-[#0f5f9f] underline" href={formPath}>Terug naar de actie</Link>
  </section></main>;
}
