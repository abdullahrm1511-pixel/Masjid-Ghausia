import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, createPublicMetadata, jsonLd, webPageJsonLd } from "@/lib/seo";

const donateSeo = {
  title: "Doneren Masjid Ghausia Rotterdam",
  description:
    "Doneer via St. Ghausia Begrafeniscommissie of schrijf u in als donateur via het officiële donateursportaal.",
  path: "/doneren",
  keywords: ["Doneren Masjid Ghausia", "donatie moskee Rotterdam", "St. GBC doneren", "Masjid Ghausia donateur"]
};

export function generateMetadata(): Metadata {
  return createPublicMetadata(donateSeo);
}

export default function DonatePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          webPageJsonLd(donateSeo),
          breadcrumbJsonLd([
            { name: "Donateursportaal", path: "/" },
            { name: "Doneren", path: "/doneren" }
          ]),
          {
            "@context": "https://schema.org",
            "@type": "DonateAction",
            name: "Doneren aan Masjid Ghausia",
            target: "https://stgbc.masjidghausia.nl/register",
            recipient: {
              "@id": "https://stgbc.masjidghausia.nl/#organization"
            }
          }
        ])}
      />
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="donor-eyebrow">Doneren Masjid Ghausia</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">Doneren aan Masjid Ghausia Rotterdam</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">
          Via het donateursportaal van St. Ghausia Begrafeniscommissie kunt u zich inschrijven en uw gegevens veilig beheren.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="donor-primary-link" href="/register">
            Donateur worden
          </Link>
          <Link className="donor-secondary-link" href="/login">
            Inloggen
          </Link>
        </div>
      </header>

      <section className="mt-6 grid gap-5 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Donateur worden</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Nieuwe donateurs kunnen online een inschrijving starten. Na beoordeling door het bestuur wordt uw registratie verder verwerkt.
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Gegevens beheren</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Bestaande donateurs kunnen inloggen om hun lidnummer, contactgegevens en betalingen terug te vinden.
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Voor Rotterdam</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Het portaal is bedoeld voor de donateursadministratie van St. Ghausia Begrafeniscommissie in Rotterdam.
          </p>
        </article>
      </section>
    </main>
  );
}
