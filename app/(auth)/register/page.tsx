import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { roleHomePath } from "@/lib/routes";
import { RegisterForm } from "./RegisterForm";
import { breadcrumbJsonLd, createPublicMetadata, jsonLd, webPageJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

const registerSeo = {
  title: "Inschrijven en Doneren Masjid Ghausia Rotterdam",
  description: "Schrijf u in als donateur van St. Ghausia Begrafeniscommissie via het officiële donateursportaal.",
  path: "/register",
  keywords: ["Doneren Masjid Ghausia", "inschrijven Masjid Ghausia", "donateur worden moskee Rotterdam"]
};

export function generateMetadata(): Metadata {
  return createPublicMetadata(registerSeo);
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const session = await auth();

  if (isAdminRole(session?.user.role)) {
    redirect(roleHomePath(session.user.role));
  }

  if (session?.user.role === "DONOR") {
    redirect(roleHomePath(session.user.role));
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          webPageJsonLd(registerSeo),
          breadcrumbJsonLd([
            { name: "Donateursportaal", path: "/" },
            { name: "Nieuwe inschrijving", path: "/register" }
          ])
        ])}
      />
      <header>
        <p className="donor-eyebrow">Doneren Masjid Ghausia</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Nieuwe inschrijving</h1>
        <p className="mt-3 text-slate-700">Vul de gegevens volledig in om donateur te worden van St. Ghausia Begrafeniscommissie. Het bestuur beoordeelt uw aanvraag.</p>
      </header>
      <div className="mt-8">
        <RegisterForm error={params.error} />
      </div>
    </main>
  );
}
