import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { roleHomePath } from "@/lib/routes";
import { breadcrumbJsonLd, createPublicMetadata, jsonLd, webPageJsonLd } from "@/lib/seo";

const homeSeo = {
  title: "Donateursportaal Masjid Ghausia Rotterdam",
  description: "Welkom bij het donateursportaal van St. Ghausia Begrafeniscommissie voor registratie, inloggen en doneren in Rotterdam.",
  path: "/",
  keywords: ["GBC donateursportaal", "moskee donateursportaal", "St. GBC Rotterdam"]
};

export function generateMetadata(): Metadata {
  return createPublicMetadata(homeSeo);
}

export default async function HomePage() {
  const session = await auth();
  const homePath = roleHomePath(session?.user.role);

  if (homePath !== "/") {
    redirect(homePath);
  }

  return (
    <main className="donor-home px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          webPageJsonLd(homeSeo),
          breadcrumbJsonLd([{ name: "Donateursportaal", path: "/" }])
        ])}
      />
      <section className="donor-hero">
        <div className="donor-hero-copy">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 p-1 ring-1 ring-white/25">
              <Image alt="Logo Ghausia uitvaart commissie" className="h-full w-full object-contain" height={64} src="/ghausia-uitvaart-commissie-logo.png" width={64} priority />
            </span>
            <div>
              <p className="donor-eyebrow">St. Ghausia Begrafeniscommissie · BC</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">Rotterdam</p>
            </div>
          </div>
          <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">Donateursportaal</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
            Registreer als donateur van Masjid Ghausia Rotterdam, bekijk uw gegevens en volg de status van uw lidmaatschap op een rustige en veilige plek.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="donor-primary-link" href="/login">
              Inloggen
            </Link>
            <Link className="donor-secondary-link" href="/register">
              Nieuwe inschrijving
            </Link>
          </div>
        </div>

        <aside className="donor-hero-panel">
          <h2 className="text-2xl font-black text-slate-950">Snel geregeld</h2>
          <div className="mt-5 grid gap-3">
            <div className="donor-feature-row">
              <span>1</span>
              <p>Uw aanvraag en PDF-kopie blijven overzichtelijk bij elkaar.</p>
            </div>
            <div className="donor-feature-row">
              <span>2</span>
              <p>Na goedkeuring ziet u uw lidnummer en betalingen direct terug.</p>
            </div>
            <div className="donor-feature-row">
              <span>3</span>
              <p>Wijzigingen kunt u later vanuit uw profiel aanvragen.</p>
            </div>
          </div>
          <p className="mt-5 text-sm font-semibold leading-6 text-slate-600">
            Wilt u doneren aan Masjid Ghausia of uw donateursgegevens beheren? Start met een nieuwe inschrijving of log in op uw bestaande account.
          </p>
        </aside>
      </section>
    </main>
  );
}
