import { AuthError } from "next-auth";
import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/donor/SubmitButton";

export const dynamic = "force-dynamic";

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
  searchParams: Promise<{ registered?: string; error?: string; email?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const errorMessage = loginErrorMessage(params.error);

  if (isAdminRole(session?.user.role)) {
    redirect("/admin");
  }

  if (session?.user.role === "DONOR") {
    redirect("/dashboard");
  }

  return (
    <main className="donor-auth-page px-4 py-12">
      <section className="donor-auth-card">
      <p className="donor-eyebrow">Masjid Ghausia</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">Inloggen</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Log in om uw gegevens, lidnummer en betalingen te bekijken.</p>
      {params.registered === "1" ? (
        <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-900">
          Uw registratie is succesvol ontvangen. U kunt inloggen zodra uw account is goedgekeurd door het bestuur.
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
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <SubmitButton className="w-full" pendingLabel="Inloggen...">Inloggen</SubmitButton>
      </form>
      </section>
    </main>
  );
}
