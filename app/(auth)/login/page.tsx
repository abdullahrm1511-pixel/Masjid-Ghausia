import { AuthError } from "next-auth";
import { compare } from "bcryptjs";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/donor/SubmitButton";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { roleHomePath } from "@/lib/routes";
import { breadcrumbJsonLd, createPublicMetadata, jsonLd, webPageJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

const loginSeo = {
  title: "Inloggen Donateursportaal Masjid Ghausia",
  description: "Log in op het beveiligde donateursportaal van St. GBC Masjid Ghausia Rotterdam.",
  path: "/login",
  keywords: ["Masjid Ghausia login", "GBC inloggen", "donateursportaal inloggen"]
};

export function generateMetadata(): Metadata {
  return createPublicMetadata(loginSeo);
}

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=empty");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, isActive: true, passwordHash: true }
  });

  if (!user) {
    redirect(`/login?error=email&email=${encodeURIComponent(email)}`);
  }

  if (!user.passwordHash) {
    redirect(`/login?error=no-password&email=${encodeURIComponent(email)}`);
  }

  if (!user.isActive) {
    redirect(`/login?error=inactive&email=${encodeURIComponent(email)}`);
  }

  const passwordMatches = await compare(password, user.passwordHash);
  if (!passwordMatches) {
    redirect(`/login?error=password&email=${encodeURIComponent(email)}`);
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=general&email=${encodeURIComponent(email)}`);
    }
    throw error;
  }

  if (isAdminRole(user.role)) {
    redirect("/admin");
  }
  redirect("/dashboard");
}

function loginErrorMessage(error?: string) {
  switch (error) {
    case "empty":
      return "Vul uw e-mailadres en wachtwoord in.";
    case "email":
      return "Dit e-mailadres staat niet in ons systeem. Controleer het adres of registreer opnieuw.";
    case "no-password":
      return "Voor dit account is nog geen wachtwoord ingesteld. Vraag een nieuw wachtwoord aan.";
    case "inactive":
      return "Dit account is nog niet actief. Wacht op goedkeuring van het bestuur.";
    case "password":
      return "Het wachtwoord is onjuist. Probeer opnieuw of gebruik wachtwoord vergeten.";
    case "general":
    case "1":
      return "Inloggen is niet gelukt. Controleer uw gegevens.";
    default:
      return null;
  }
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ registered?: string; loggedOut?: string; reset?: string; error?: string; email?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const errorMessage = loginErrorMessage(params.error);

  if (isAdminRole(session?.user.role)) {
    redirect(roleHomePath(session.user.role));
  }

  if (session?.user.role === "DONOR") {
    redirect(roleHomePath(session.user.role));
  }

  return (
    <main className="donor-auth-page px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          webPageJsonLd(loginSeo),
          breadcrumbJsonLd([
            { name: "Donateursportaal", path: "/" },
            { name: "Inloggen", path: "/login" }
          ])
        ])}
      />
      <section className="donor-auth-card">
      <p className="donor-eyebrow">Masjid Ghausia</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">Inloggen donateursportaal</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Log in om uw gegevens, lidnummer en betalingen bij St. GBC Masjid Ghausia Rotterdam te bekijken.</p>
      {params.registered === "1" ? (
        <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-900">
          Uw registratie is succesvol ontvangen. U kunt inloggen zodra uw account is goedgekeurd door het bestuur.
        </div>
      ) : null}
      {params.loggedOut === "1" ? (
        <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-900">
          U bent veilig uitgelogd.
        </div>
      ) : null}
      {params.reset === "1" ? (
        <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-900">
          Uw wachtwoord is aangepast. U kunt nu inloggen met uw nieuwe wachtwoord.
        </div>
      ) : null}
      {errorMessage ? (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      ) : null}
      <form action={loginAction} className="mt-8 grid gap-4">
        <label>
          E-mailadres
          <input name="email" type="email" autoComplete="email" defaultValue={params.email ?? ""} required />
        </label>
        <label>
          Wachtwoord
          <PasswordInput name="password" autoComplete="current-password" required />
        </label>
        <SubmitButton className="w-full" pendingLabel="Inloggen...">Inloggen</SubmitButton>
      </form>
      <div className="mt-5 grid gap-2 text-sm font-semibold text-slate-700">
        <Link className="text-[#0f5f9f] hover:underline" href="/forgot-password">
          Wachtwoord vergeten?
        </Link>
        <Link className="text-[#0f5f9f] hover:underline" href="/register">
          Nog geen account? Schrijf u in als donateur.
        </Link>
      </div>
      </section>
    </main>
  );
}
