import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const session = await auth();

  if (isAdminRole(session?.user.role)) {
    redirect("/admin");
  }

  if (session?.user.role === "DONOR") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Nieuwe inschrijving</h1>
      <p className="mt-3 text-slate-700">Vul de gegevens volledig in. Het bestuur beoordeelt uw aanvraag.</p>
      <div className="mt-8">
        <RegisterForm error={params.error} />
      </div>
    </main>
  );
}
