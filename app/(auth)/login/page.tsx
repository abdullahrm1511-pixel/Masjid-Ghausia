import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/donor/SubmitButton";

export const dynamic = "force-dynamic";

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").toLowerCase();

  try {
    await signIn("credentials", {
      email,
      password: String(formData.get("password") ?? ""),
      redirect: false
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true }
  });

  if (isAdminRole(user?.role)) {
    redirect("/admin");
  }
  redirect("/dashboard");
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ registered?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();

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
      {params.error === "1" ? (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          Inloggen is niet gelukt. Controleer uw gegevens.
        </div>
      ) : null}
      <form action={loginAction} className="mt-8 grid gap-4">
        <label>
          E-mailadres
          <input name="email" type="email" autoComplete="email" required />
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
