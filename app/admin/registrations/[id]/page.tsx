import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { formatDateWithAge } from "@/lib/display";
import { formatIban } from "@/lib/iban";
import { prisma } from "@/lib/prisma";
import { approveRegistration, rejectRegistration, requestCorrection } from "./actions";

export const dynamic = "force-dynamic";

export default async function RegistrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await prisma.registrationRequest.findUnique({
    where: { id },
    include: {
      requestedBy: true,
      donorProfile: {
        include: {
          familyMembers: true,
          changeRequests: { orderBy: { submittedAt: "desc" }, take: 5 }
        }
      }
    }
  });

  if (!request?.donorProfile) {
    notFound();
  }

  const donor = request.donorProfile;
  const partner = donor.familyMembers.find((member) => member.type === "PARTNER");
  const children = donor.familyMembers.filter((member) => member.type === "CHILD");
  const submittedData = request.submittedData as {
    healthDeclaration?: boolean;
    legalResidence?: boolean;
    termsAccepted?: boolean;
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <BackButton fallbackHref="/admin/registrations" />
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{donor.firstName} {donor.lastName}</h1>
          <p className="mt-2 text-slate-700">Status: {request.status}</p>
          {donor.registrationNumber ? <p className="mt-1 font-semibold text-[#0f5f9f]">Lidnummer: {donor.registrationNumber}</p> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-md border border-slate-300 px-4 py-3 font-semibold text-slate-800" href={`/admin/registrations/${request.id}/pdf`}>
            PDF downloaden
          </Link>
          <form action={approveRegistration}>
            <input name="id" type="hidden" value={request.id} />
            <button className="rounded-md bg-[#1483d6] px-4 py-3 font-semibold text-white" type="submit">Goedkeuren</button>
          </form>
        </div>
      </div>

      <section className="mt-8 grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <p><strong>E-mail:</strong> {request.requestedBy.email}</p>
        <p><strong>Telefoon:</strong> {donor.phone}</p>
        <p><strong>Adres:</strong> {donor.addressLine1}, {donor.postalCode} {donor.city}</p>
        <p><strong>Geboortedatum:</strong> {formatDateWithAge(donor.dateOfBirth)}</p>
        <p><strong>Geboorteplaats:</strong> {donor.birthPlace}</p>
        <p><strong>Geslacht:</strong> {donor.gender ?? "-"}</p>
        <p><strong>IBAN:</strong> {formatIban(donor.iban)}</p>
        <p><strong>Rekeninghouder:</strong> {donor.accountHolderName}</p>
        <p><strong>Burgerlijke staat:</strong> {donor.maritalStatus ?? "-"}</p>
        <p><strong>Contact Pakistan:</strong> {donor.pakistanContactName || "-"}</p>
        <p><strong>Telefoon Pakistan:</strong> {donor.pakistanContactPhone || "-"}</p>
        <p className="sm:col-span-2"><strong>Uitvaartwensen:</strong> {donor.funeralWishes || "-"}</p>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Gezin</h2>
        <div className="mt-4 grid gap-3">
          {partner ? <p><strong>Partner:</strong> {partner.firstName} {partner.lastName}</p> : <p>Geen partner opgegeven.</p>}
          {children.length ? children.map((child) => <p key={child.id}><strong>Kind:</strong> {child.firstName} {child.lastName}</p>) : <p>Geen kinderen opgegeven.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Verklaringen</h2>
        <div className="mt-4 grid gap-2 text-sm">
          <p><strong>Gezondheidsverklaring:</strong> {submittedData.healthDeclaration ? "Bevestigd" : "Niet bevestigd"}</p>
          <p><strong>Verblijf in Nederland:</strong> {submittedData.legalResidence ? "Bevestigd" : "Niet bevestigd"}</p>
          <p><strong>Voorwaarden en privacy:</strong> {submittedData.termsAccepted ? "Akkoord" : "Niet akkoord"}</p>
        </div>
      </section>

      {(request.reviewNotes || request.donorMessage || request.rejectionReason) ? (
        <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-xl font-bold text-amber-950">Correctie / beoordeling</h2>
          <div className="mt-4 grid gap-3 text-sm">
            {request.donorMessage ? <p><strong>Bericht aan donateur:</strong> {request.donorMessage}</p> : null}
            {request.reviewNotes ? <p><strong>Interne notitie:</strong> {request.reviewNotes}</p> : null}
            {request.rejectionReason ? <p><strong>Afwijsreden:</strong> {request.rejectionReason}</p> : null}
          </div>
        </section>
      ) : null}

      {donor.changeRequests.length ? (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Reacties / wijzigingsverzoeken van deze persoon</h2>
          <div className="mt-4 grid gap-3">
            {donor.changeRequests.map((change) => (
              <Link className="rounded-md border border-slate-200 bg-slate-50 p-3 hover:border-[#1483d6]/40" href={`/admin/change-requests/${change.id}`} key={change.id}>
                <p className="font-semibold text-slate-950">{change.changeType} - {change.status}</p>
                <p className="mt-1 text-sm text-slate-600">Ingediend op {change.submittedAt.toLocaleDateString("nl-NL")}</p>
                {change.donorNote ? <p className="mt-2 text-sm text-slate-700">Toelichting: {change.donorNote}</p> : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Afwijzen of correctie vragen</h2>
        <form action={requestCorrection} className="grid gap-3">
          <input name="id" type="hidden" value={request.id} />
          <label>Interne notitie<textarea name="reviewNotes" rows={3} /></label>
          <label>Bericht voor donateur<textarea name="donorMessage" rows={3} required /></label>
          <button className="w-fit rounded-md border border-amber-600 px-4 py-2 font-semibold text-amber-800" type="submit">Correctie vragen</button>
        </form>
        <form action={rejectRegistration} className="grid gap-3 border-t border-slate-200 pt-4">
          <input name="id" type="hidden" value={request.id} />
          <label>Interne notitie<textarea name="reviewNotes" rows={3} required /></label>
          <label>Bericht voor donateur<textarea name="donorMessage" rows={3} required /></label>
          <button className="w-fit rounded-md border border-red-600 px-4 py-2 font-semibold text-red-800" type="submit">Afwijzen</button>
        </form>
      </section>
    </main>
  );
}
