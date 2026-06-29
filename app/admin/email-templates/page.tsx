import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ensureDefaultEmailTemplates } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

export default async function EmailTemplatesPage() {
  await ensureDefaultEmailTemplates();
  const templates = await prisma.emailTemplate.findMany({ orderBy: { key: "asc" } });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">E-mailtemplates</h1>
      <p className="mt-2 text-slate-700">Deze teksten worden voorbereid als e-maillog. Er wordt nog niets echt verzonden.</p>
      <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="p-3">Sleutel</th>
              <th className="p-3">Naam</th>
              <th className="p-3">Onderwerp</th>
              <th className="p-3">Acties</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr className="border-t border-slate-200" key={template.key}>
                <td className="p-3 font-mono text-xs">{template.key}</td>
                <td className="p-3 font-semibold">{template.name}</td>
                <td className="p-3">{template.subject}</td>
                <td className="p-3">
                  <Link className="font-semibold text-[#0f5f9f]" href={`/admin/email-templates/${template.key}`}>
                    Bewerken en preview
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
