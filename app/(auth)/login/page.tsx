import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

async function loginAction(formData: FormData) {
  "use server";

  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error;
  }

  const session = await auth();
  if (isAdminRole(session?.user.role)) {
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

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Inloggen</h1>
      {params.registered === "1" ? (
        <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          Uw registratie is succesvol ontvangen. U kunt inloggen zodra uw account is goedgekeurd door het bestuur.
        </div>
      ) : null}
      {params.error === "1" ? (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          Inloggen is niet gelukt. Controleer uw gegevens.
        </div>
      ) : null}
      <form action={loginAction} className="mt-8 grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <label>
          E-mailadres
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Wachtwoord
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800" type="submit">
          Inloggen
        </button>
      </form>
    </main>
  );
}
