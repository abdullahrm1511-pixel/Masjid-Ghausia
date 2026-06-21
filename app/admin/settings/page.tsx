import Link from "next/link";

export const dynamic = "force-dynamic";

const groups = [
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
      }
    ]
  }
] as const;

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Instellingen</h1>
      <p className="mt-2 text-slate-700">Alle beheeronderdelen die niet dagelijks in de hoofdnavigatie hoeven te staan.</p>
      <div className="mt-8 grid gap-6">
        {groups.map((group) => (
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm" key={group.title}>
            <h2 className="text-xl font-bold text-slate-900">{group.title}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <Link className="rounded-md border border-stone-200 p-4 hover:border-emerald-300 hover:bg-emerald-50" href={item.href} key={item.href}>
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
