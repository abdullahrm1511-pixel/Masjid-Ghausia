import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { auth } from "@/lib/auth";
import { formatIban } from "@/lib/iban";
import { prisma } from "@/lib/prisma";
import { submitChangeRequest } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  if (!session?.user.id) {
    redirect("/login");
  }

  const profile = await prisma.donorProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: true, familyMembers: true }
  });

  if (!profile) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <BackButton fallbackHref="/dashboard" />
      <h1 className="mt-5 text-3xl font-bold text-slate-900">Mijn account</h1>
      {params.error ? <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{params.error}</div> : null}

      <section className="mt-8 grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        {profile.registrationNumber ? <p><strong>Lidnummer:</strong> {profile.registrationNumber}</p> : null}
        <p><strong>Naam:</strong> {profile.firstName} {profile.lastName}</p>
        <p><strong>E-mail:</strong> {profile.user.email}</p>
        <p><strong>Telefoon:</strong> {profile.phone}</p>
        <p><strong>Adres:</strong> {profile.addressLine1}, {profile.postalCode} {profile.city}</p>
        <p><strong>Geboortedatum:</strong> {profile.dateOfBirth.toLocaleDateString("nl-NL")}</p>
        <p><strong>Geboorteplaats:</strong> {profile.birthPlace}</p>
        <p><strong>Geslacht:</strong> {profile.gender ?? "-"}</p>
        <p><strong>IBAN:</strong> {formatIban(profile.iban)}</p>
        <p><strong>Rekeninghouder:</strong> {profile.accountHolderName}</p>
        <p><strong>Contact Pakistan:</strong> {profile.pakistanContactName || "-"}</p>
        <p><strong>Telefoon Pakistan:</strong> {profile.pakistanContactPhone || "-"}</p>
        <p className="sm:col-span-2"><strong>Uitvaartwensen:</strong> {profile.funeralWishes || "-"}</p>
      </section>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Gezin</h2>
        <div className="mt-4 grid gap-2">
          {profile.familyMembers.length ? profile.familyMembers.map((member) => <p key={member.id}>{member.type === "PARTNER" ? "Partner" : "Kind"}: {member.firstName} {member.lastName}</p>) : <p>Geen gezinsleden geregistreerd.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Wijziging aanvragen</h2>
        <form action={submitChangeRequest} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>Adres<input name="addressLine1" defaultValue={profile.addressLine1} required /></label>
          <label>Postcode<input name="postalCode" defaultValue={profile.postalCode} required /></label>
          <label>Woonplaats<input name="city" defaultValue={profile.city} required /></label>
          <label>Telefoon<input name="phone" defaultValue={profile.phone} required /></label>
          <label>E-mail<input name="email" type="email" defaultValue={profile.user.email} required /></label>
          <label>IBAN<input name="iban" defaultValue={formatIban(profile.iban)} required /></label>
          <label>Rekeninghouder<input name="accountHolderName" defaultValue={profile.accountHolderName} required /></label>
          <label>Contact Pakistan<input name="pakistanContactName" defaultValue={profile.pakistanContactName ?? ""} /></label>
          <label>Telefoon Pakistan<input name="pakistanContactPhone" defaultValue={profile.pakistanContactPhone ?? ""} /></label>
          <label className="sm:col-span-2">Uitvaartwensen<textarea name="funeralWishes" defaultValue={profile.funeralWishes ?? ""} rows={4} /></label>
          <label className="sm:col-span-2">Toelichting<textarea name="donorNote" rows={3} /></label>
          <button className="w-fit rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">Wijziging indienen</button>
        </form>
      </section>
    </main>
  );
}
