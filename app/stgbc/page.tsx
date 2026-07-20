import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, createPublicMetadata, jsonLd, webPageJsonLd } from "@/lib/seo";

const stgbcSeo = {
  title: "St. GBC Masjid Ghausia Rotterdam",
  description:
    "St. GBC Masjid Ghausia Rotterdam beheert het donateursportaal voor inschrijvingen, donateursgegevens en administratieve opvolging.",
  path: "/stgbc",
  keywords: ["St. GBC", "Ghausia Begrafenis Commissie", "stGBC Masjid Ghausia", "St. GBC Rotterdam"]
};

export function generateMetadata(): Metadata {
  return createPublicMetadata(stgbcSeo);
}

export default function StGbcPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          webPageJsonLd(stgbcSeo),
          breadcrumbJsonLd([
            { name: "Donateursportaal", path: "/" },
            { name: "St. GBC", path: "/stgbc" }
          ])
        ])}
      />
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="donor-eyebrow">St. GBC</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">St. GBC Masjid Ghausia Rotterdam</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">
          St. GBC gebruikt dit portaal voor de online registratie en administratie van donateurs van Masjid Ghausia Rotterdam.
        </p>
      </header>

      <section className="mt-6 grid gap-5 md:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Online inschrijving</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Nieuwe donateurs kunnen via het formulier hun gegevens aanleveren. Het bestuur beoordeelt de aanvraag voordat het account volledig actief wordt.
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Administratief overzicht</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Na goedkeuring kunnen donateurs hun account, registratiegegevens en betalingsstatus in het portaal bekijken.
          </p>
        </article>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Snel naar het portaal</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="donor-primary-link" href="/register">
            Nieuwe inschrijving
          </Link>
          <Link className="donor-secondary-link" href="/login">
            Inloggen
          </Link>
        </div>
      </section>
    </main>
  );
}
