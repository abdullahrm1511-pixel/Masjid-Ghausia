import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export default async function HomePage() {
  const session = await auth();

  if (isAdminRole(session?.user.role)) {
    redirect("/admin");
  }
  if (session?.user.role === "DONOR") {
    redirect("/dashboard");
  }

  return (
    <main className="donor-home px-4">
      <section className="donor-hero">
        <div>
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 p-1 ring-1 ring-white/25">
              <Image alt="Masjid Ghausia logo" className="h-full w-full object-contain" height={64} src="/masjid-ghausia-logo.png" width={64} priority />
            </span>
            <div>
              <p className="donor-eyebrow">St. GBC Masjid Ghausia</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">Rotterdam</p>
            </div>
          </div>
          <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">Donateursportaal</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
            Registreer, bekijk uw gegevens en volg de status van uw lidmaatschap op een rustige en veilige plek.
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
        </aside>
      </section>
    </main>
  );
}
