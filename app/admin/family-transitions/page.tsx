import Link from "next/link";
import { auth } from "@/lib/auth";
import { syncAdultChildTransitions } from "@/lib/adult-child-transitions";
import { formatDate } from "@/lib/display";
import { familyMemberStatusBadgeClass, familyMemberStatusLabel } from "@/lib/family-status";
import { canManageSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { dismissAdultTransition, linkAdultTransitionToDonor, markAdultTransitionInvited, markPartnerPrimaryContact, saveGuardianContact } from "./actions";

export const dynamic = "force-dynamic";

export default async function FamilyTransitionsPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  if (!canManageSettings(session?.user.role)) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-black text-slate-950">Geen toegang</h1>
      </main>
    );
  }

  await syncAdultChildTransitions();

  const [adultTransitions, deceasedWithPartner, guardianNeeded] = await Promise.all([
    prisma.adultChildTransition.findMany({
      where: { status: { in: ["NEEDS_REGISTRATION", "INVITED"] } },
      include: { familyMember: true, previousDonorProfile: true, newDonorProfile: true },
      orderBy: [{ status: "asc" }, { turned18At: "asc" }]
    }),
    prisma.donorProfile.findMany({
      where: {
        status: "DECEASED",
        familyMembers: { some: { type: "PARTNER", status: "ACTIVE_DEPENDENT" } }
      },
      include: { familyMembers: { where: { type: "PARTNER" } } },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.donorProfile.findMany({
      where: {
        status: "DECEASED",
        familyMembers: { some: { type: "CHILD", status: "UNDER_18" } },
        NOT: { familyMembers: { some: { type: "PARTNER", status: "ACTIVE_DEPENDENT" } } }
      },
      include: { familyMembers: true },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Gezinsbeheer</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Gezinswijzigingen</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Beheer 18+ kinderen zonder lidnummer, overleden primaire leden en huishoudens waar een voogd/contactpersoon nodig is.
        </p>
      </div>

      {params.message ? <p className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-900">{params.message}</p> : null}

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">18+ inschrijving nodig</h2>
            <p className="mt-1 text-sm text-slate-600">Deze personen tellen niet meer mee onder het oude gezin en moeten zichzelf inschrijven.</p>
          </div>
          <span className="rounded-md bg-amber-50 px-3 py-2 text-sm font-black text-amber-900">{adultTransitions.length}</span>
        </div>
        <div className="mt-4 grid gap-4">
          {adultTransitions.length ? (
            adultTransitions.map((item) => (
              <article className="rounded-md border border-slate-200 p-4" key={item.id}>
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-950">{item.familyMember.firstName} {item.familyMember.lastName}</h3>
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${familyMemberStatusBadgeClass(item.familyMember.status)}`}>
                        {familyMemberStatusLabel(item.familyMember.status)}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{item.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">18 geworden op {formatDate(item.turned18At)}. Oud gezin: <Link className="font-bold text-emerald-800 underline" href={`/admin/donors/${item.previousDonorProfileId}?tab=family`}>{item.previousDonorProfile.firstName} {item.previousDonorProfile.lastName}</Link>.</p>
                    {item.notes ? <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{item.notes}</p> : null}
                  </div>
                  <div className="grid gap-3">
                    <form action={markAdultTransitionInvited} className="grid gap-2 rounded-md bg-slate-50 p-3">
                      <input name="id" type="hidden" value={item.id} />
                      <input name="note" placeholder="Interne notitie bij uitnodiging" />
                      <button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold" type="submit">Markeer als uitgenodigd</button>
                    </form>
                    <form action={linkAdultTransitionToDonor} className="grid gap-2 rounded-md bg-emerald-50 p-3">
                      <input name="id" type="hidden" value={item.id} />
                      <input name="registrationNumber" placeholder="Nieuw zelfstandig lidnummer, bijv. 11-01001" />
                      <input name="note" placeholder="Interne koppelnotitie" />
                      <button className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-bold text-white" type="submit">Koppel aan zelfstandig lid</button>
                    </form>
                    <form action={dismissAdultTransition} className="grid gap-2 rounded-md bg-red-50 p-3">
                      <input name="id" type="hidden" value={item.id} />
                      <input name="note" placeholder="Waarom geen lid / geen interesse?" required />
                      <button className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-bold text-red-800" type="submit">Markeer als geen lid</button>
                    </form>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-md bg-slate-50 p-4 text-sm font-semibold text-slate-600">Geen 18+ personen die zichzelf nog moeten inschrijven.</p>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Partner als primaire contactpersoon</h2>
          <p className="mt-1 text-sm text-slate-600">Primaire persoon is overleden, maar er is een actieve partner. Dit verplaatst geen lidnummer; het legt de partner als contactpersoon vast.</p>
          <div className="mt-4 grid gap-3">
            {deceasedWithPartner.length ? (
              deceasedWithPartner.map((donor) => (
                <article className="rounded-md border border-slate-200 p-3" key={donor.id}>
                  <p className="font-black text-slate-950">{donor.firstName} {donor.lastName}</p>
                  <p className="text-sm text-slate-600">Overleden primair lid. Partner(s): {donor.familyMembers.map((member) => `${member.firstName} ${member.lastName}`).join(", ")}</p>
                  {donor.familyMembers.map((partner) => (
                    <form action={markPartnerPrimaryContact} className="mt-3 grid gap-2" key={partner.id}>
                      <input name="donorId" type="hidden" value={donor.id} />
                      <input name="familyMemberId" type="hidden" value={partner.id} />
                      <input name="note" placeholder="Interne notitie" />
                      <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold" type="submit">{partner.firstName} als primaire contactpersoon</button>
                    </form>
                  ))}
                </article>
              ))
            ) : (
              <p className="rounded-md bg-slate-50 p-4 text-sm font-semibold text-slate-600">Geen overleden primaire leden met actieve partner gevonden.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Voogd/contact nodig</h2>
          <p className="mt-1 text-sm text-slate-600">Primaire persoon is overleden, geen actieve partner, en er zijn kinderen onder 18.</p>
          <div className="mt-4 grid gap-3">
            {guardianNeeded.length ? (
              guardianNeeded.map((donor) => (
                <article className="rounded-md border border-red-200 bg-red-50 p-3" key={donor.id}>
                  <p className="font-black text-red-950">{donor.firstName} {donor.lastName}</p>
                  <p className="text-sm text-red-900">{donor.familyMembers.filter((member) => member.type === "CHILD" && member.status === "UNDER_18").length} kind(eren) onder 18.</p>
                  <form action={saveGuardianContact} className="mt-3 grid gap-2">
                    <input name="donorId" type="hidden" value={donor.id} />
                    <input name="name" placeholder="Naam voogd/contactpersoon" required />
                    <input name="phone" placeholder="Telefoon" required />
                    <input name="relation" placeholder="Relatie tot gezin" required />
                    <input name="note" placeholder="Interne notitie" />
                    <button className="rounded-md bg-red-700 px-3 py-2 text-sm font-bold text-white" type="submit">Voogd/contact opslaan</button>
                  </form>
                </article>
              ))
            ) : (
              <p className="rounded-md bg-slate-50 p-4 text-sm font-semibold text-slate-600">Geen huishoudens gevonden waar een voogd/contactpersoon nodig is.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
