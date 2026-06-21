import Link from "next/link";
import { auth } from "@/lib/auth";
import { syncAdultChildTransitions } from "@/lib/adult-child-transitions";
import { canManageDonors } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isNearlyEighteen } from "@/lib/pricing";

export const dynamic = "force-dynamic";

type DashboardCard = readonly [string, number, string];

export default async function AdminDashboardPage() {
  const session = await auth();
  const fullAdmin = canManageDonors(session?.user.role);
  if (fullAdmin) await syncAdultChildTransitions();
  const registeredDonorWhere = { registrationNumber: { not: null } };
  const [pendingRegistrations, registrationCorrections, donorActionRequired, activeDonors, inactiveDonors, rejected, deceased, children, adultTransitions, householdsNeedingGuardian] = await Promise.all([
    prisma.registrationRequest.count({ where: { status: "PENDING" } }),
    prisma.registrationRequest.count({ where: { status: "ACTION_REQUIRED" } }),
    prisma.donorProfile.count({ where: { AND: [registeredDonorWhere, { status: "ACTION_REQUIRED" }] } }),
    prisma.donorProfile.count({ where: { AND: [registeredDonorWhere, { status: "ACTIVE", NOT: { paymentObligations: { some: { status: "DUE", obligationType: "ANNUAL" } } } }] } }),
    prisma.donorProfile.count({
      where: {
        AND: [
          registeredDonorWhere,
          { OR: [{ status: { in: ["INACTIVE", "PAYMENT_REQUIRED"] } }, { paymentObligations: { some: { status: "DUE", obligationType: "ANNUAL" } } }] }
        ]
      }
    }),
    prisma.donorProfile.count({ where: { AND: [registeredDonorWhere, { status: "REJECTED" }] } }),
    prisma.donorProfile.count({ where: { AND: [registeredDonorWhere, { status: "DECEASED" }] } }),
    prisma.familyMember.findMany({
      where: { type: "CHILD", isActive: true, status: { in: ["UNDER_18", "ACTIVE_DEPENDENT"] } },
      include: { donorProfile: { include: { paymentObligations: true } } },
      orderBy: { dateOfBirth: "asc" }
    }),
    prisma.adultChildTransition.findMany({
      where: { status: "NEEDS_REGISTRATION" },
      include: { familyMember: true, previousDonorProfile: true },
      orderBy: { turned18At: "asc" },
      take: 25
    }),
    prisma.donorProfile.findMany({
      where: {
        status: "DECEASED",
        familyMembers: {
          some: {
            type: "CHILD",
            status: "UNDER_18"
          }
        },
        NOT: {
          familyMembers: {
            some: {
              type: "PARTNER",
              status: "ACTIVE_DEPENDENT"
            }
          }
        }
      },
      include: {
        familyMembers: true
      },
      take: 20
    })
  ]);

  const nearlyAdults = children.filter((child) => isNearlyEighteen(child.dateOfBirth));

  const actionItems: DashboardCard[] = [["Registraties beoordelen", pendingRegistrations, "/admin/registrations"]];
  if (fullAdmin) {
    actionItems.push(
      ["Registratiecorrecties nodig", registrationCorrections, "/admin/registrations"],
      ["Donateuractie nodig", donorActionRequired, "/admin/donors?status=ACTION_REQUIRED"],
      ["Betaling afwachtend", inactiveDonors, "/admin/donors?status=INACTIVE_OR_PAYMENT_REQUIRED"],
      ["Kinderen bijna 18", nearlyAdults.length, "#bijna-18"],
      ["18+ inschrijving nodig", adultTransitions.length, "/admin/family-transitions"],
      ["Voogd/contact nodig", householdsNeedingGuardian.length, "/admin/family-transitions"]
    );
  }

  const cards: DashboardCard[] = [["Registraties in afwachting", pendingRegistrations, "/admin/registrations"]];
  if (fullAdmin) {
    cards.push(
      ["Actieve donateurs", activeDonors, "/admin/donors?status=ACTIVE"],
      ["Inactief / betaling afwachtend", inactiveDonors, "/admin/donors?status=INACTIVE_OR_PAYMENT_REQUIRED"],
      ["Registratiecorrecties", registrationCorrections, "/admin/registrations"],
      ["Donateuractie vereist", donorActionRequired, "/admin/donors?status=ACTION_REQUIRED"],
      ["Afgewezen", rejected, "/admin/donors?status=REJECTED"],
      ["Overleden", deceased, "/admin/donors?status=DECEASED"]
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Beheercentrum</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Admin dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Begin hier met het hoofdoverzicht. Alle blokken zijn klikbaar.</p>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_0.85fr]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([label, value, href]) => (
            <Link className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300 hover:shadow-md" href={href} key={label}>
              <p className="text-sm font-bold text-slate-600">{label}</p>
              <p className="mt-3 text-4xl font-black text-emerald-800">{value}</p>
            </Link>
          ))}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Vandaag aandacht nodig</h2>
          <div className="mt-4 grid gap-3">
            {actionItems.map(([label, value, href]) => (
              <Link className="rounded-md border border-slate-200 p-4 hover:border-emerald-300 hover:bg-emerald-50" href={href} key={label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-700">{label}</p>
                  <p className={`text-2xl font-black ${value > 0 ? "text-red-700" : "text-slate-900"}`}>{value}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {fullAdmin ? (
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" id="bijna-18">
            <h2 className="text-xl font-black text-slate-950">Kinderen die binnenkort 18 worden</h2>
            <p className="mt-2 text-sm text-slate-600">Vanaf 17 jaar en 6 maanden. Ze blijven zichtbaar als kind bij het gezin.</p>
            <div className="mt-4 grid gap-2 text-sm">
              {nearlyAdults.length ? (
                nearlyAdults.map((child) => (
                  <p className="rounded-md bg-slate-50 p-3" key={child.id}>
                    <strong>{child.firstName} {child.lastName}</strong> - geboren {child.dateOfBirth.toLocaleDateString("nl-NL")} - hoofddonateur: {child.donorProfile.firstName} {child.donorProfile.lastName}
                  </p>
                ))
              ) : (
                <p className="rounded-md bg-slate-50 p-3 text-slate-600">Geen kinderen gevonden die binnenkort 18 worden.</p>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" id="kinderen-18">
            <h2 className="text-xl font-black text-slate-950">18+ inschrijving nodig</h2>
            <p className="mt-2 text-sm text-slate-600">Deze personen zijn 18+ geworden, tellen niet meer mee onder het gezin en moeten zichzelf inschrijven.</p>
            <div className="mt-4 grid gap-2 text-sm">
              {adultTransitions.length ? (
                adultTransitions.map((item) => (
                  <p className="rounded-md bg-red-50 p-3 text-red-900" key={item.id}>
                    <strong>{item.familyMember.firstName} {item.familyMember.lastName}</strong> - 18 geworden op {item.turned18At.toLocaleDateString("nl-NL")} - oud gezin: {item.previousDonorProfile.firstName} {item.previousDonorProfile.lastName}
                  </p>
                ))
              ) : (
                <p className="rounded-md bg-slate-50 p-3 text-slate-600">Geen 18+ personen gevonden die zichzelf nog moeten inschrijven.</p>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2" id="voogd-nodig">
            <h2 className="text-xl font-black text-slate-950">Huishoudens zonder actieve ouder</h2>
            <p className="mt-2 text-sm text-slate-600">Primaire persoon is overleden, er is geen actieve partner geregistreerd en er zijn nog kinderen onder 18.</p>
            <div className="mt-4 grid gap-2 text-sm">
              {householdsNeedingGuardian.length ? (
                householdsNeedingGuardian.map((donor) => (
                  <Link className="rounded-md bg-red-50 p-3 text-red-900 hover:bg-red-100" href={`/admin/donors/${donor.id}?tab=family`} key={donor.id}>
                    <strong>{donor.firstName} {donor.lastName}</strong> - {donor.familyMembers.filter((member) => member.type === "CHILD" && member.status === "UNDER_18").length} kind(eren) onder 18 - voogd/contactpersoon nodig
                  </Link>
                ))
              ) : (
                <p className="rounded-md bg-slate-50 p-3 text-slate-600">Geen huishoudens gevonden waar een voogd/contactpersoon nodig is.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
