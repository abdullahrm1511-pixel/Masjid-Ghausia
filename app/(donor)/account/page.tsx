import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { auth } from "@/lib/auth";
import { formatIban } from "@/lib/iban";
import { prisma } from "@/lib/prisma";
import { submitChangeRequest } from "./actions";

export const dynamic = "force-dynamic";

function dateInputValue(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  if (!session?.user.id) {
    redirect("/login");
  }

  const profile = await prisma.donorProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: true, familyMembers: { orderBy: [{ type: "asc" }, { dateOfBirth: "asc" }] } }
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
        <form action={submitChangeRequest} className="mt-4 grid gap-6">
          <section className="grid gap-4 rounded-md bg-slate-50 p-4 sm:grid-cols-2">
            <h3 className="text-lg font-bold text-slate-900 sm:col-span-2">Persoonlijke gegevens</h3>
            <label>Voornaam<input name="firstName" defaultValue={profile.firstName} required /></label>
            <label>Achternaam<input name="lastName" defaultValue={profile.lastName} required /></label>
            <label>
              Geslacht
              <select name="gender" defaultValue={profile.gender ?? ""}>
                <option value="">Onbekend</option>
                <option value="MALE">Man</option>
                <option value="FEMALE">Vrouw</option>
              </select>
            </label>
            <label>Geboortedatum<input name="dateOfBirth" type="date" defaultValue={dateInputValue(profile.dateOfBirth)} required /></label>
            <label>Geboorteplaats<input name="birthPlace" defaultValue={profile.birthPlace} required /></label>
            <label>Telefoon<input name="phone" defaultValue={profile.phone} required /></label>
            <label>E-mail<input name="email" type="email" defaultValue={profile.user.email} required /></label>
            <label>
              Burgerlijke staat
              <select name="maritalStatus" defaultValue={profile.maritalStatus ?? ""}>
                <option value="">Onbekend</option>
                <option value="SINGLE">Ongehuwd</option>
                <option value="MARRIED">Gehuwd</option>
                <option value="WIDOWED">Weduwe/weduwnaar</option>
                <option value="DIVORCED">Gescheiden</option>
              </select>
            </label>
          </section>

          <section className="grid gap-4 rounded-md bg-slate-50 p-4 sm:grid-cols-2">
            <h3 className="text-lg font-bold text-slate-900 sm:col-span-2">Adres en betaling</h3>
            <label>Adresregel 1<input name="addressLine1" defaultValue={profile.addressLine1} required /></label>
            <label>Adresregel 2<input name="addressLine2" defaultValue={profile.addressLine2 ?? ""} /></label>
            <label>Postcode<input name="postalCode" defaultValue={profile.postalCode} required /></label>
            <label>Woonplaats<input name="city" defaultValue={profile.city} required /></label>
            <label>Land<input name="country" defaultValue={profile.country} required /></label>
            <label>IBAN<input name="iban" defaultValue={formatIban(profile.iban)} required /></label>
            <label>Rekeninghouder<input name="accountHolderName" defaultValue={profile.accountHolderName} required /></label>
          </section>

          <section className="grid gap-4 rounded-md bg-slate-50 p-4 sm:grid-cols-2">
            <h3 className="text-lg font-bold text-slate-900 sm:col-span-2">Overige gegevens</h3>
            <label>Contact Pakistan<input name="pakistanContactName" defaultValue={profile.pakistanContactName ?? ""} /></label>
            <label>Telefoon Pakistan<input name="pakistanContactPhone" defaultValue={profile.pakistanContactPhone ?? ""} /></label>
            <label className="sm:col-span-2">Uitvaartwensen<textarea name="funeralWishes" defaultValue={profile.funeralWishes ?? ""} rows={4} /></label>
            <label className="sm:col-span-2">Notities<textarea name="notes" defaultValue={profile.notes ?? ""} rows={4} /></label>
          </section>

          <section className="grid gap-4 rounded-md bg-slate-50 p-4">
            <h3 className="text-lg font-bold text-slate-900">Gezinsleden</h3>
            <input name="familyMemberCount" type="hidden" value={profile.familyMembers.length} />
            {profile.familyMembers.length ? profile.familyMembers.map((member, index) => (
              <div className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 sm:grid-cols-2" key={member.id}>
                <input name={`family.${index}.id`} type="hidden" value={member.id} />
                <p className="text-sm font-bold uppercase text-slate-600 sm:col-span-2">{member.type === "PARTNER" ? "Partner" : member.type === "CHILD" ? "Kind" : "Gezinslid"}</p>
                <label>Voornaam<input name={`family.${index}.firstName`} defaultValue={member.firstName} required /></label>
                <label>Achternaam<input name={`family.${index}.lastName`} defaultValue={member.lastName} required /></label>
                <label>
                  Geslacht
                  <select name={`family.${index}.gender`} defaultValue={member.gender ?? ""}>
                    <option value="">Onbekend</option>
                    <option value="MALE">Man</option>
                    <option value="FEMALE">Vrouw</option>
                  </select>
                </label>
                <label>Geboortedatum<input name={`family.${index}.dateOfBirth`} type="date" defaultValue={dateInputValue(member.dateOfBirth)} required /></label>
                <label>Geboorteplaats<input name={`family.${index}.birthPlace`} defaultValue={member.birthPlace ?? ""} /></label>
                <label>Relatie<input name={`family.${index}.relationship`} defaultValue={member.relationship ?? ""} /></label>
              </div>
            )) : <p className="text-sm font-semibold text-slate-600">Geen gezinsleden geregistreerd.</p>}
          </section>

          <label>Toelichting<textarea name="donorNote" rows={3} /></label>
          <button className="w-fit rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">Wijziging indienen</button>
        </form>
      </section>
    </main>
  );
}
