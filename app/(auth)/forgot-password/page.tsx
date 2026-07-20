import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { roleHomePath } from "@/lib/routes";
import { requestPasswordReset } from "./actions";
import { SubmitButton } from "@/components/donor/SubmitButton";
import { breadcrumbJsonLd, createPublicMetadata, jsonLd, webPageJsonLd } from "@/lib/seo";

const forgotPasswordSeo = {
  title: "Wachtwoord Vergeten Masjid Ghausia Donateursportaal",
  description: "Vraag een nieuw wachtwoord aan voor het St. GBC Masjid Ghausia donateursportaal.",
  path: "/forgot-password",
  keywords: ["Masjid Ghausia wachtwoord", "GBC account herstellen", "donateursportaal wachtwoord vergeten"]
};

export function generateMetadata(): Metadata {
  return createPublicMetadata(forgotPasswordSeo);
}

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string; devToken?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();

  if (session?.user.id) {
    redirect(roleHomePath(session.user.role));
  }

  return (
    <main className="donor-auth-page px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          webPageJsonLd(forgotPasswordSeo),
          breadcrumbJsonLd([
            { name: "Donateursportaal", path: "/" },
            { name: "Wachtwoord vergeten", path: "/forgot-password" }
          ])
        ])}
      />
      <section className="donor-auth-card">
      <p className="donor-eyebrow">Account</p>
      <h1 className="text-3xl font-black text-slate-900">Wachtwoord vergeten</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Vul uw e-mailadres in om een nieuw wachtwoord aan te maken.</p>
      {params.sent === "1" ? (
        <div className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-900">
          Als het e-mailadres bestaat, is er een resetlink voorbereid.
          {params.devToken ? <p className="mt-2 break-all">Lokale resetlink: /reset-password/{params.devToken}</p> : null}
        </div>
      ) : null}
      <form action={requestPasswordReset} className="mt-8 grid gap-4">
        <label>E-mailadres<input name="email" type="email" required /></label>
        <SubmitButton className="w-full" pendingLabel="Versturen...">Reset voorbereiden</SubmitButton>
      </form>
      <Link className="mt-5 inline-flex text-sm font-semibold text-[#0f5f9f] hover:underline" href="/login">
        Terug naar inloggen
      </Link>
      </section>
    </main>
  );
}
