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
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-[#1483d6]">Masjid Ghausia</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">Inloggen</h1>
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
        <button className="rounded-lg bg-[#1483d6] px-4 py-3 font-semibold text-white shadow-sm hover:bg-[#0f5f9f]" type="submit">
          Inloggen
        </button>
      </form>
      </section>
    </main>
  );
}
