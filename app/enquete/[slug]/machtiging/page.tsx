import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { syncMonthlyMolliePayment } from "@/lib/monthly-donations";

export const dynamic = "force-dynamic";

export default async function MandateReturnPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ donor?: string }> }) {
  const { slug } = await params;
  const { donor: donorId } = await searchParams;
  if (!donorId) notFound();
  const donor = await prisma.surveyDonor.findUnique({ where: { id: donorId }, include: { monthlyPayments: { where: { sequenceType: "first" }, orderBy: { createdAt: "desc" }, take: 1, include: { surveyResponse: { include: { survey: true } } } } } });
  const firstPayment = donor?.monthlyPayments[0];
  if (!donor || !firstPayment || firstPayment.surveyResponse?.survey.slug !== slug) notFound();

  let status = firstPayment.status;
  try {
    const synced = await syncMonthlyMolliePayment(firstPayment.molliePaymentId);
    status = synced.payment.status;
  } catch (error) {
    console.error("Mollie-machtiging controleren mislukt", error);
  }
  const current = await prisma.surveyDonor.findUnique({ where: { id: donor.id } });
  const active = current?.status === "ACTIVE";
  const failed = ["failed", "canceled", "expired"].includes(status);
  const pendingMandate = status === "paid" && !active;

  return <main className="survey-page"><section className="survey-card survey-finished">
    {pendingMandate ? <meta content="5" httpEquiv="refresh" /> : null}
    <div className="survey-check">{active ? "✓" : "i"}</div>
    <p className="donor-eyebrow">Maandelijkse donatie · Masjid Ghausia</p>
    <h1>{active ? "Uw maanddonatie is actief" : failed ? "Machtiging niet afgerond" : "Machtiging wordt verwerkt"}</h1>
    <p>{active ? `Hartelijk dank. Uw eerste donatie is ontvangen en vervolgens wordt € ${((current?.monthlyAmountCents ?? 0) / 100).toFixed(2).replace(".", ",")} iedere maand via Mollie geïncasseerd.` : failed ? "De eerste betaling of machtiging is niet afgerond. U kunt het formulier opnieuw openen en het nogmaals proberen." : "Mollie verwerkt uw betaling en SEPA-machtiging. Deze pagina controleert de status automatisch opnieuw."}</p>
    {failed ? <Link className="donor-submit-button survey-submit mt-5 inline-block" href={`/enquete/${slug}`}>Opnieuw proberen</Link> : null}
    <Link className="mt-5 block font-semibold text-[#0f5f9f] underline" href={`/enquete/${slug}`}>Terug naar het donatieformulier</Link>
  </section></main>;
}
