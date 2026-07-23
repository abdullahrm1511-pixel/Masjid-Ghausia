import type { Metadata } from "next";
import Link from "next/link";
import { resetPassword } from "./actions";
import { SubmitButton } from "@/components/donor/SubmitButton";
import { privateMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/password-reset/tokens";

export const metadata: Metadata = privateMetadata;

export default async function ResetPasswordPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { id: true, usedAt: true, expiresAt: true }
  });
  const validToken = Boolean(resetRecord && !resetRecord.usedAt && resetRecord.expiresAt >= new Date());

  return (
    <main className="donor-auth-page px-4 py-12">
      <section className="donor-auth-card">
      <p className="donor-eyebrow">Account</p>
      <h1 className="text-3xl font-black text-slate-900">Nieuw wachtwoord</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Kies een nieuw wachtwoord na verificatie via uw e-mail.</p>
      {!validToken ? (
        <div className="mt-5 grid gap-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          <p>Deze resetlink is ongeldig, verlopen of al gebruikt.</p>
          <Link className="text-[#0f5f9f] hover:underline" href="/forgot-password">
            Nieuwe resetlink aanvragen
          </Link>
        </div>
      ) : null}
      {error ? <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div> : null}
      {validToken ? (
        <form action={resetPassword} className="mt-8 grid gap-4">
          <input name="token" type="hidden" value={token} />
          <label>
            Nieuw wachtwoord
            <input name="password" type="password" minLength={8} required />
            <span className="text-xs font-semibold text-slate-500">Minimaal 8 tekens, 1 hoofdletter, 1 kleine letter en 1 speciaal teken.</span>
          </label>
          <label>Bevestig wachtwoord<input name="confirmPassword" type="password" minLength={8} required /></label>
          <SubmitButton className="w-full" pendingLabel="Opslaan...">Wachtwoord opslaan</SubmitButton>
        </form>
      ) : null}
      </section>
    </main>
  );
}
