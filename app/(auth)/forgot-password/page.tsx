import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string; devToken?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Wachtwoord vergeten</h1>
      {params.sent === "1" ? (
        <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          Als het e-mailadres bestaat, is er een resetlink voorbereid.
          {params.devToken ? <p className="mt-2 break-all">Lokale resetlink: /reset-password/{params.devToken}</p> : null}
        </div>
      ) : null}
      <form action={requestPasswordReset} className="mt-8 grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <label>E-mailadres<input name="email" type="email" required /></label>
        <button className="rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">Reset voorbereiden</button>
      </form>
    </main>
  );
}
