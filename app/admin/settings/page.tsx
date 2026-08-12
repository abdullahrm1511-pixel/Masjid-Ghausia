import Link from "next/link";
import { auth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function groups(showSuperAdminItems: boolean) {
  return [
  {
    title: "Financieel",
    items: [
      {
        title: "Prijsinstellingen",
        description: "Jaarlijkse bedragen, eenmalige bijdragen, betaalperiode en boete.",
        href: "/admin/settings/pricing"
      },
      {
        title: "Import",
        description: "Excel- of CSV-bestanden controleren en verwerken.",
        href: "/admin/import"
      },
      {
        title: "Export",
        description: "Donateurslijsten downloaden voor administratie en controle.",
        href: "/admin/export"
      },
      {
        title: "Betaling/schuld corrigeren",
        description: "Afgeschermde super-admin correcties op lidnummer met extra code.",
        href: "/admin/settings/payment-corrections"
      }
    ]
  },
  {
    title: "Communicatie",
    items: [
      {
        title: "E-mail verzenden",
        description: "Batchgewijs of per donateur een template versturen.",
        href: "/admin/email-send"
      },
      {
        title: "E-mailtemplates",
        description: "Teksten beheren die klaargezet worden voor donateurs.",
        href: "/admin/email-templates"
      },
      {
        title: "E-maillog",
        description: "Alle voorbereide e-mails controleren.",
        href: "/admin/email-log"
      }
    ]
  },
  {
    title: "Beheer",
    items: [
      {
        title: "Begrafenisaanvragen",
        description: "Unieke invullinks maken en ingevulde aanvragen als PDF bekijken.",
        href: "/admin/settings/funeral-applications"
      },
      ...(showSuperAdminItems
        ? [{
            title: "Donatiebeheer",
            description: "Maandelijks donateurschap en eenmalige donatiecampagnes beheren.",
            href: "/admin/settings/surveys"
          }]
        : []),
      {
        title: "Controlecentrum",
        description: "Dagelijkse werklijst voor betalingen, importsignalen, gezinswijzigingen en statussen.",
        href: "/admin/control-center"
      },
      {
        title: "Registraties",
        description: "Nieuwe aanvragen beoordelen en subadmins laten meekijken.",
        href: "/admin/registrations"
      },
      {
        title: "Donateurs",
        description: "Ledenstatus, betaalstatus en gezinsgegevens controleren.",
        href: "/admin/donors"
      },
      ...(showSuperAdminItems
        ? [
            {
              title: "Auditlog",
              description: "Bekijk welke admin welke actie heeft uitgevoerd.",
              href: "/admin/audit-log"
            }
          ]
        : [])
    ]
  }
] as const;
}

export default async function SettingsPage() {
  const session = await auth();
  const visibleGroups = groups(canManageSettings(session?.user.role));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Instellingen</h1>
      <p className="mt-2 text-slate-700">Alle beheeronderdelen die niet dagelijks in de hoofdnavigatie hoeven te staan.</p>
      <div className="mt-8 grid gap-6">
        {visibleGroups.map((group) => (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={group.title}>
            <h2 className="text-xl font-bold text-slate-900">{group.title}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <Link className="rounded-md border border-slate-200 p-4 hover:border-[#1483d6]/40 hover:bg-sky-50" href={item.href} key={item.href}>
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
