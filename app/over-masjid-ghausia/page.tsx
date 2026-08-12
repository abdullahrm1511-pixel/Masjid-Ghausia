import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, createPublicMetadata, jsonLd, webPageJsonLd } from "@/lib/seo";

const aboutSeo = {
  title: "Over Masjid Ghausia Rotterdam",
  description:
    "Informatie over Masjid Ghausia Rotterdam en het donateursportaal van St. Ghausia Begrafeniscommissie.",
  path: "/over-masjid-ghausia",
  keywords: ["Masjid Ghausia Rotterdam", "Moskee Rotterdam", "St. GBC Masjid Ghausia", "GBC Rotterdam"]
};

export function generateMetadata(): Metadata {
  return createPublicMetadata(aboutSeo);
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          webPageJsonLd(aboutSeo),
          breadcrumbJsonLd([
            { name: "Donateursportaal", path: "/" },
            { name: "Over Masjid Ghausia", path: "/over-masjid-ghausia" }
          ])
        ])}
      />
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="donor-eyebrow">Masjid Ghausia Rotterdam</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">Over Masjid Ghausia</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">
          Masjid Ghausia is een islamitisch gebedshuis in Rotterdam. Dit subdomein ondersteunt de online donateursadministratie van St. Ghausia Begrafeniscommissie.
        </p>
      </header>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-slate-950">Donateursportaal van St. Ghausia Begrafeniscommissie</h2>
        <p className="mt-4 leading-7 text-slate-700">
          Het donateursportaal maakt het makkelijker voor donateurs om zich in te schrijven, gegevens actueel te houden en de status van hun registratie te volgen.
          Zo blijven aanvragen, lidnummers en betalingen overzichtelijk bij elkaar.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="donor-primary-link" href="/doneren">
            Doneren
          </Link>
          <Link className="donor-secondary-link" href="/contact">
            Contactgegevens
          </Link>
        </div>
      </section>
    </main>
  );
}
