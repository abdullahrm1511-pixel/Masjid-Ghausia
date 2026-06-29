import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { DEFAULT_EMAIL_TEMPLATES, EMAIL_PLACEHOLDERS, type EmailTemplateKey } from "@/lib/email/defaults";
import { ensureDefaultEmailTemplates, renderEmailTemplate } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";
import { resetTemplateToDefault, updateEmailTemplate } from "../actions";

export const dynamic = "force-dynamic";

const sampleData = {
  naam: "Mohammed Khan",
  voornaam: "Mohammed",
  achternaam: "Khan",
  lidnummer: "11-001",
  status: "PAYMENT_REQUIRED",
  bedrag: "€ 125,00",
  betaaldatum: "07-06-2026",
  reden: "Voorbeeldreden van het bestuur.",
  correctiebericht: "Controleer uw IBAN en telefoonnummer.",
  loginlink: "http://localhost:3001/login",
  contact_email: "info@stgbc.nl",
  organisatie: "St. GBC Masjid Ghausia",
  verification_link: "http://localhost:3001/verify/example",
  reset_link: "http://localhost:3001/reset-password/example"
};

function isTemplateKey(key: string): key is EmailTemplateKey {
  return DEFAULT_EMAIL_TEMPLATES.some((template) => template.key === key);
}

export default async function EmailTemplateDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ saved?: string; reset?: string }>;
}) {
  const [{ key }, state] = await Promise.all([params, searchParams]);
  if (!isTemplateKey(key)) notFound();

  await ensureDefaultEmailTemplates();
  const template = await prisma.emailTemplate.findUnique({ where: { key } });
  if (!template) notFound();
  const preview = await renderEmailTemplate(key, sampleData);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <BackButton fallbackHref="/admin/email-templates" />
      <h1 className="mt-5 text-3xl font-bold text-slate-900">{template.name}</h1>
      <p className="mt-2 font-mono text-xs text-slate-600">{template.key}</p>
      {state.saved ? <p className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 font-semibold text-[#0f5f9f]">Template opgeslagen.</p> : null}
      {state.reset ? <p className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 font-semibold text-[#0f5f9f]">Template teruggezet naar standaard.</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
        <form action={updateEmailTemplate} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <input name="key" type="hidden" value={template.key} />
          <label>
            Onderwerp
            <input name="subject" defaultValue={template.subject} required />
          </label>
          <label>
            Tekst
            <textarea name="bodyText" defaultValue={template.bodyText ?? ""} rows={16} required />
          </label>
          <div>
            <p className="text-sm font-semibold text-slate-700">Beschikbare placeholders</p>
            <p className="mt-2 text-sm text-slate-600">{EMAIL_PLACEHOLDERS.map((item) => `{{${item}}}`).join(", ")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-md bg-[#1483d6] px-4 py-3 font-semibold text-white" type="submit">
              Opslaan
            </button>
          </div>
        </form>

        <aside className="grid gap-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Preview</h2>
            <p className="mt-4 text-sm font-semibold text-slate-700">Onderwerp</p>
            <p className="mt-1 rounded-md bg-slate-50 p-3">{preview.subject}</p>
            <p className="mt-4 text-sm font-semibold text-slate-700">Body</p>
            <pre className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm">{preview.bodyText}</pre>
          </section>
          <form action={resetTemplateToDefault} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <input name="key" type="hidden" value={template.key} />
            <button className="rounded-md border border-red-300 px-4 py-3 font-semibold text-red-700" type="submit">
              Terug naar standaard
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}
