import { resetPassword } from "./actions";
import { SubmitButton } from "@/components/donor/SubmitButton";

export default async function ResetPasswordPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  return (
    <main className="donor-auth-page px-4 py-12">
      <section className="donor-auth-card">
      <p className="donor-eyebrow">Account</p>
      <h1 className="text-3xl font-black text-slate-900">Nieuw wachtwoord</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Kies een nieuw wachtwoord van minimaal 8 tekens.</p>
      {error ? <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div> : null}
      <form action={resetPassword} className="mt-8 grid gap-4">
        <input name="token" type="hidden" value={token} />
        <label>Nieuw wachtwoord<input name="password" type="password" minLength={8} required /></label>
        <label>Bevestig wachtwoord<input name="confirmPassword" type="password" minLength={8} required /></label>
        <SubmitButton className="w-full" pendingLabel="Opslaan...">Opslaan</SubmitButton>
      </form>
      </section>
    </main>
  );
}
