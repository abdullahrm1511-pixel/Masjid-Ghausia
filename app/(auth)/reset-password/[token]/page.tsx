import { resetPassword } from "./actions";

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
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Nieuw wachtwoord</h1>
      {error ? <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div> : null}
      <form action={resetPassword} className="mt-8 grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <input name="token" type="hidden" value={token} />
        <label>Nieuw wachtwoord<input name="password" type="password" minLength={8} required /></label>
        <label>Bevestig wachtwoord<input name="confirmPassword" type="password" minLength={8} required /></label>
        <button className="rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">Opslaan</button>
      </form>
    </main>
  );
}
