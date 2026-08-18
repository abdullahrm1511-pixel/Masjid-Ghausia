import Link from "next/link";
import { notFound } from "next/navigation";
import { DonorStatus, Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/display";
import { DEFAULT_EMAIL_TEMPLATES, type EmailTemplateKey } from "@/lib/email/defaults";
import { ensureDefaultEmailTemplates, renderEmailTemplate } from "@/lib/email/templates";
import { normalizeIban } from "@/lib/iban";
import { canManageDonors } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isNearlyEighteen } from "@/lib/pricing";
import { sendBatchEmail } from "./actions";

export const dynamic = "force-dynamic";

const targetFilters = [
  ["Open betaling", "open-payment"],
  ["Actieve donateurs", "active"],
  ["Inactief", "inactive"],
  ["Actie vereist", "action-required"],
  ["Kind bijna 18", "child-nearly-18"],
  ["Alle donateurs", "all"]
] as const;

const sendTemplateKeys: EmailTemplateKey[] = [
  "PAYMENT_REMINDER",
  "PAYMENT_REMINDER_SECOND",
  "MOSQUE_DONATION_REMINDER",
  "MASJID_GHAUSIA_MEMBERSHIP_PROOF_REQUEST",
  "CORRECTION_REQUIRED",
  "CHANGE_REQUEST_RECEIVED",
  "ADULT_CHILD_REMINDER"
];

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function templateKey(value: string): EmailTemplateKey {
  return DEFAULT_EMAIL_TEMPLATES.some((template) => template.key === value) ? (value as EmailTemplateKey) : "PAYMENT_REMINDER";
}

function targetWhere(target: string): Prisma.DonorProfileWhereInput {
  if (target === "open-payment") {
    return { paymentObligations: { some: { status: "DUE", amountCents: { gt: 0 } } } };
  }
  if (target === "active") return { status: "ACTIVE" };
  if (target === "inactive") return { status: "INACTIVE" };
  if (target === "action-required") return { status: "ACTION_REQUIRED" };
  if (target === "child-nearly-18") return { familyMembers: { some: { type: "CHILD", isActive: true } } };
  return {};
}

function nearlyEighteenChildName(familyMembers: { type: string; isActive: boolean; dateOfBirth: Date; firstName: string; lastName: string }[]) {
  const child = familyMembers.find((member) => member.type === "CHILD" && member.isActive && isNearlyEighteen(member.dateOfBirth));
  return child ? `${child.firstName} ${child.lastName}`.trim() : "";
}

export default async function EmailSendPage({
  searchParams
}: {
  searchParams: Promise<{ target?: string | string[]; q?: string | string[]; template?: string | string[]; sent?: string; error?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  if (!canManageDonors(session?.user.role)) notFound();

  await ensureDefaultEmailTemplates();
  const target = firstParam(params.target) || "open-payment";
  const q = firstParam(params.q).trim();
  const selectedTemplate = templateKey(firstParam(params.template));
  const normalizedIban = normalizeIban(q);
  const typedStatus = Object.values(DonorStatus).find((item) => item === q.toUpperCase());
  const searchWhere: Prisma.DonorProfileWhereInput | undefined = q
    ? {
        OR: [
          { registrationNumber: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { postalCode: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
          { iban: { contains: normalizedIban, mode: "insensitive" } },
          { user: { email: { contains: q, mode: "insensitive" } } },
          ...(typedStatus ? [{ status: typedStatus }] : [])
        ]
      }
    : undefined;
  const where: Prisma.DonorProfileWhereInput = {
    AND: [{ registrationNumber: { not: null } }, targetWhere(target), ...(searchWhere ? [searchWhere] : [])]
  };
  const donorsRaw = await prisma.donorProfile.findMany({
    where,
    include: { user: true, paymentObligations: true, familyMembers: true },
    orderBy: [{ registrationNumber: "asc" }, { createdAt: "desc" }],
    take: target === "child-nearly-18" || target === "all" ? undefined : 200
  });
  const donors = target === "child-nearly-18" ? donorsRaw.filter((donor) => nearlyEighteenChildName(donor.familyMembers)) : donorsRaw;
  const templates = await prisma.emailTemplate.findMany({
    where: { key: { in: sendTemplateKeys } },
    orderBy: { key: "asc" }
  });
  const firstDonor = donors[0];
  const firstOpenAmount = firstDonor?.paymentObligations
    .filter((item) => item.status === "DUE" && item.amountCents > 0)
    .reduce((sum, item) => sum + item.amountCents, 0) ?? 0;
  const siteUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  const preview = firstDonor
    ? await renderEmailTemplate(selectedTemplate, {
        naam: `${firstDonor.firstName} ${firstDonor.lastName}`.trim(),
        voornaam: firstDonor.firstName,
        achternaam: firstDonor.lastName,
        registratienummer: firstDonor.registrationNumber ?? "",
        status: firstDonor.status,
        bedrag: formatCurrency(firstOpenAmount),
        jaarlijks_bedrag: formatCurrency(firstOpenAmount),
        eenmalig_bedrag: formatCurrency(firstOpenAmount),
        donatie_bedrag: formatCurrency(firstOpenAmount),
        rekeningnummer: "NL72ABNA0808763342",
        boete: "",
        kind_naam: nearlyEighteenChildName(firstDonor.familyMembers) || "uw kind",
        loginlink: selectedTemplate === "ADULT_CHILD_REMINDER" ? `${siteUrl}/register` : `${siteUrl}/login`,
        organisatie: "St. GBC Masjid Ghausia"
      })
    : null;
  const currentQuery = `/admin/email-send?target=${encodeURIComponent(target)}&template=${encodeURIComponent(selectedTemplate)}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#1483d6]">Communicatie</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">E-mail verzenden</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Kies een doelgroep, controleer de selectie en verstuur een nette template in een keer.</p>
          </div>
          <Link className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-800 hover:bg-slate-100" href="/admin/email-log">
            E-maillog bekijken
          </Link>
        </div>
        {params.sent ? <p className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-4 font-semibold text-teal-900">{params.sent} e-mail(s) verstuurd of klaargezet.</p> : null}
        {params.error ? <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 font-semibold text-red-800">{params.error}</p> : null}
        <form className="mt-5 grid gap-3 lg:grid-cols-[190px_240px_1fr_auto]">
          <select name="target" defaultValue={target}>
            {targetFilters.map(([label, value]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select name="template" defaultValue={selectedTemplate}>
            {templates.map((template) => <option key={template.key} value={template.key}>{template.name}</option>)}
          </select>
          <input name="q" defaultValue={q} placeholder="Zoek op registratienummer, naam, e-mail, telefoon, postcode, woonplaats of IBAN" />
          <button className="rounded-lg bg-[#1483d6] px-5 py-3 font-bold text-white shadow-sm hover:bg-[#0f5f9f]" type="submit">Filteren</button>
        </form>
      </section>

      <form action={sendBatchEmail} className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
        <input name="templateKey" type="hidden" value={selectedTemplate} />
        <input name="returnTo" type="hidden" value={currentQuery} />
        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Selectie</th>
                <th className="p-3">Registratienummer</th>
                <th className="p-3">Naam</th>
                <th className="p-3">E-mail</th>
                <th className="p-3">Open bedrag</th>
                <th className="p-3">Actie</th>
              </tr>
            </thead>
            <tbody>
              {donors.map((donor) => {
                const openAmount = donor.paymentObligations
                  .filter((item) => item.status === "DUE" && item.amountCents > 0)
                  .reduce((sum, item) => sum + item.amountCents, 0);
                const usableEmail = !(donor.user.email.startsWith("legacy+") && donor.user.email.endsWith("@stgbc.local"));
                return (
                  <tr className="border-t border-slate-200 align-top hover:bg-sky-50/40" key={donor.id}>
                    <td className="p-3">
                      <input defaultChecked={usableEmail} disabled={!usableEmail} name="donorId" type="checkbox" value={donor.id} />
                    </td>
                    <td className="p-3 font-semibold">{donor.registrationNumber ?? "-"}</td>
                    <td className="p-3 font-semibold">{donor.firstName} {donor.lastName}</td>
                    <td className="p-3">{usableEmail ? donor.user.email : "Geen geldig e-mailadres"}</td>
                    <td className={`p-3 font-black ${openAmount > 0 ? "text-red-700" : "text-slate-900"}`}>{formatCurrency(openAmount)}</td>
                    <td className="p-3"><Link className="font-bold text-[#0f5f9f]" href={`/admin/donors/${donor.id}`}>Profiel</Link></td>
                  </tr>
                );
              })}
              {donors.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-slate-600" colSpan={6}>Geen ontvangers gevonden.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <aside className="grid gap-5 self-start">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Versturen</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">Standaard zijn alle zichtbare ontvangers met geldig e-mailadres aangevinkt.</p>
            <label className="mt-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              <input className="mt-1 h-4 w-4" name="confirmed" type="checkbox" value="yes" />
              Ik heb de ontvangers en template gecontroleerd.
            </label>
            <button className="mt-4 w-full rounded-lg bg-[#1483d6] px-5 py-3 font-bold text-white shadow-sm hover:bg-[#0f5f9f]" type="submit">
              Geselecteerde e-mails verzenden
            </button>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <details>
              <summary className="cursor-pointer text-xl font-black text-slate-950">Preview bekijken</summary>
              {preview ? (
                <>
                  <p className="mt-4 text-sm font-semibold text-slate-700">Voorbeeld voor {firstDonor?.firstName} {firstDonor?.lastName}</p>
                  <p className="mt-3 text-sm font-semibold text-slate-700">Onderwerp</p>
                  <p className="mt-1 rounded-md bg-slate-50 p-3 text-sm">{preview.subject}</p>
                  <p className="mt-3 text-sm font-semibold text-slate-700">Bericht</p>
                  <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs">{preview.bodyText}</pre>
                </>
              ) : (
                <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">Geen preview beschikbaar zonder ontvanger.</p>
              )}
            </details>
          </section>
        </aside>
      </form>
    </main>
  );
}
