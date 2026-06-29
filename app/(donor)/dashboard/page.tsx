import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIban } from "@/lib/iban";
import { formatCurrency, formatDate } from "@/lib/display";
import { calculateDonorCharges, calculateTotalOneTimeContribution, getPricingConfig } from "@/lib/pricing";

export const dynamic = "force-dynamic";

function statusText(status: string, message?: string | null) {
  if (status === "PENDING") return "Uw aanvraag is in afwachting van beoordeling.";
  if (status === "ACTION_REQUIRED") return message ? `Actie vereist: ${message}` : "Actie vereist: het bestuur vraagt om een correctie.";
  if (status === "PAYMENT_REQUIRED") return "Uw account is niet actief. Er staat nog een betaling open.";
  if (status === "ACTIVE") return "Uw account is actief.";
  if (status === "INACTIVE") return "Uw account is niet actief. Controleer of er nog een betaling openstaat.";
  if (status === "REJECTED") return message ? `Uw aanvraag is afgewezen. ${message}` : "Uw aanvraag is afgewezen.";
  if (status === "DECEASED") return "Status: overleden.";
  return status;
}

function paymentYear(item: { dueDate?: Date | null; paidAt?: Date | null; createdAt: Date }) {
  return (item.dueDate ?? item.paidAt ?? item.createdAt).getFullYear();
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user.id) {
    redirect("/login");
  }

  const profile = await prisma.donorProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true,
      familyMembers: true,
      paymentObligations: { orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }] },
      registrationRequests: { orderBy: { createdAt: "desc" }, take: 1 },
      changeRequests: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });

  if (!profile) {
    redirect("/");
  }

  const latestRegistration = profile.registrationRequests[0];
  const latestChange = profile.changeRequests[0];
  const visibleMessage = latestRegistration?.donorMessage ?? latestChange?.donorMessage;
  const totalPaid = profile.paymentObligations.filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.amountCents, 0);
  const latestPaymentDate = profile.paymentObligations.find((item) => item.status === "PAID")?.paidAt;
  const pricing = await getPricingConfig();
  const mainCharge = calculateDonorCharges(profile, profile.familyMembers, pricing, { hasAnnualPayment: false })[0];
  const oneTimeTotal = calculateTotalOneTimeContribution(profile, profile.familyMembers, pricing, profile.approvedAt ?? new Date());
  const oneTimePaid = profile.paymentObligations
    .filter((item) => item.status === "PAID" && item.obligationType === "ONE_TIME")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const currentYear = new Date().getFullYear();
  const annualPaid = profile.paymentObligations
    .filter((item) => item.status === "PAID" && item.obligationType === "ANNUAL" && paymentYear(item) === currentYear)
    .reduce((sum, item) => sum + item.amountCents, 0);
  const annualOpenRegistered = profile.paymentObligations
    .filter((item) => item.status === "DUE" && item.obligationType === "ANNUAL" && paymentYear(item) === currentYear)
    .reduce((sum, item) => sum + item.amountCents, 0);
  const oneTimeRequired = profile.approvedAt ? oneTimeTotal * 100 : 0;
  const oneTimeRemaining = Math.max(oneTimeRequired - oneTimePaid, 0);
  const annualRequired = profile.approvedAt ? (mainCharge?.annualContribution ?? 0) * 100 : annualOpenRegistered;
  const annualRemaining = profile.approvedAt
    ? Math.max(annualRequired - annualPaid, 0)
    : Math.max(annualRequired - annualPaid, annualOpenRegistered, 0);
  const penaltyRequired = profile.approvedAt?.getFullYear() === currentYear ? 0 : (mainCharge?.penaltyContribution ?? 0) * 100;
  const totalDue = Math.max(annualRequired + oneTimeRequired + penaltyRequired - totalPaid, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-[#1483d6]">Mijn portaal</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-950">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">Uw gegevens en betalingen bij St. GBC Masjid Ghausia.</p>
          </div>
          {profile.registrationNumber ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-xs font-bold uppercase text-slate-500">Lidnummer</p>
              <p className="mt-1 text-2xl font-black text-[#0f5f9f]">{profile.registrationNumber}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase text-[#1483d6]">Status</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">{statusText(profile.status, visibleMessage)}</p>
      </section>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Betaaloverzicht</h2>
            <p className="mt-1 text-sm text-slate-600">Betalingen worden door de administratie gecontroleerd op basis van bankoverschrijvingen.</p>
          </div>
          <div className={`rounded-xl px-4 py-3 text-right ${totalDue > 0 ? "bg-red-50 text-red-800" : "bg-teal-50 text-teal-800"}`}>
            <p className="text-xs font-bold uppercase">{totalDue > 0 ? "Openstaand" : "Bijgewerkt"}</p>
            <p className="mt-1 text-2xl font-black">{formatCurrency(totalDue)}</p>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4"><dt className="text-sm font-semibold text-slate-600">Totaal betaald</dt><dd className="mt-1 text-xl font-black text-slate-900">{formatCurrency(totalPaid)}</dd></div>
          <div className="rounded-lg bg-slate-50 p-4"><dt className="text-sm font-semibold text-slate-600">Openstaand bedrag</dt><dd className={`mt-1 text-xl font-black ${totalDue > 0 ? "text-red-700" : "text-slate-900"}`}>{formatCurrency(totalDue)}</dd></div>
          <div className="rounded-lg bg-slate-50 p-4"><dt className="text-sm font-semibold text-slate-600">Laatste betaling</dt><dd className="mt-1 text-xl font-black text-slate-900">{formatDate(latestPaymentDate)}</dd></div>
          <div className="rounded-lg bg-slate-50 p-4"><dt className="text-sm font-semibold text-slate-600">IBAN</dt><dd className="mt-1 font-black text-slate-900">{formatIban(profile.iban)}</dd></div>
        </dl>
      </section>

      {oneTimeRequired > 0 ? (
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Eenmalige bijdrage</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div><dt className="text-sm font-semibold text-slate-600">Bedrag</dt><dd className="mt-1 font-bold text-slate-900">{formatCurrency(oneTimeRequired)}</dd></div>
            <div><dt className="text-sm font-semibold text-slate-600">Restant</dt><dd className={`mt-1 font-bold ${oneTimeRemaining > 0 ? "text-red-700" : "text-slate-900"}`}>{formatCurrency(oneTimeRemaining)}</dd></div>
            <div><dt className="text-sm font-semibold text-slate-600">Voorwaarde</dt><dd className="mt-1 font-bold text-slate-900">Volledig betalen</dd></div>
          </dl>
          <p className="mt-3 text-sm font-bold text-slate-700">Nieuwe leden worden pas actief nadat het volledige bedrag is betaald.</p>
        </section>
      ) : null}

      {annualRequired > 0 ? (
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Jaarlijkse bijdrage</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div><dt className="text-sm font-semibold text-slate-600">Bedrag</dt><dd className="mt-1 font-bold text-slate-900">{formatCurrency(annualRequired)}</dd></div>
            <div><dt className="text-sm font-semibold text-slate-600">Betaald</dt><dd className="mt-1 font-bold text-slate-900">{formatCurrency(annualPaid)}</dd></div>
            <div><dt className="text-sm font-semibold text-slate-600">Restant</dt><dd className={`mt-1 font-bold ${annualRemaining > 0 ? "text-red-700" : "text-slate-900"}`}>{formatCurrency(annualRemaining)}</dd></div>
          </dl>
          <p className="mt-3 text-sm font-bold text-slate-700">
            Na volledige betaling van de jaarlijkse bijdrage kan het account actief worden gezet.
          </p>
        </section>
      ) : null}

      {profile.status === "INACTIVE" && totalDue > 0 ? (
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Betaling</h2>
          <p className="mt-2 text-slate-700">Uw betaling wordt extern verwerkt. Zodra het bestuur uw betaling heeft bevestigd, wordt uw status bijgewerkt.</p>
        </section>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Account</h2>
          <dl className="mt-4 grid gap-2 text-sm">
            <div><dt className="font-semibold">Naam</dt><dd>{profile.firstName} {profile.lastName}</dd></div>
            <div><dt className="font-semibold">IBAN</dt><dd>{formatIban(profile.iban)}</dd></div>
          </dl>
          <Link className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50" href="/account">
            Mijn account bekijken
          </Link>
          {latestRegistration ? (
            <Link className="ml-3 mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50" href="/dashboard/registration-pdf">
              Inschrijfoverzicht downloaden
            </Link>
          ) : null}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Gezin</h2>
          <div className="mt-4 grid gap-2 text-sm">
            {profile.familyMembers.length ? (
              profile.familyMembers.map((member) => <p key={member.id}>{member.type === "PARTNER" ? "Partner" : "Kind"}: {member.firstName} {member.lastName}</p>)
            ) : (
              <p>Geen gezinsleden geregistreerd.</p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Laatste wijzigingsverzoek</h2>
        <p className="mt-2 text-slate-700">{latestChange ? `${latestChange.changeType}: ${latestChange.status}` : "Geen wijzigingsverzoeken."}</p>
      </section>
    </main>
  );
}
