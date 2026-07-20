import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, createPublicMetadata, jsonLd, webPageJsonLd } from "@/lib/seo";

const contactSeo = {
  title: "Contact Masjid Ghausia Donateursportaal",
  description:
    "Contactgegevens van St. GBC Masjid Ghausia Rotterdam en links naar het donateursportaal.",
  path: "/contact",
  keywords: ["Masjid Ghausia contact", "St. GBC contact", "Masjid Ghausia Rotterdam adres"]
};

export function generateMetadata(): Metadata {
  return createPublicMetadata(contactSeo);
}

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          webPageJsonLd(contactSeo),
          breadcrumbJsonLd([
            { name: "Donateursportaal", path: "/" },
            { name: "Contact", path: "/contact" }
          ])
        ])}
      />
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="donor-eyebrow">Contact</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">Contact Masjid Ghausia Donateursportaal</h1>
        <p className="mt-4 text-lg leading-8 text-slate-700">
          Voor donateurszaken gebruikt St. GBC Masjid Ghausia Rotterdam dit online portaal.
        </p>
      </header>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-slate-950">Gegevens</h2>
        <dl className="mt-5 grid gap-4 text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="font-bold text-slate-950">Naam</dt>
            <dd className="mt-1">St. GBC Masjid Ghausia</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-950">Plaats</dt>
            <dd className="mt-1">Rotterdam</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-950">Adres</dt>
            <dd className="mt-1">Boudewijnstraat 57, 3073 ZA Rotterdam</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-950">Telefoon</dt>
            <dd className="mt-1">010 484 5149</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="donor-primary-link" href="/register">
            Donateur worden
          </Link>
          <Link className="donor-secondary-link" href="/login">
            Inloggen
          </Link>
        </div>
      </section>
    </main>
  );
}
