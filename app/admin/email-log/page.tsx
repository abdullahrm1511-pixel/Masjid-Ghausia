import { prisma } from "@/lib/prisma";
import { EmailLogOverview } from "@/components/admin/EmailLogOverview";

export const dynamic = "force-dynamic";

export default async function EmailLogPage() {
  const logs = await prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">E-maillog</h1>
      <p className="mt-2 text-slate-700">Alle geregistreerde e-mails gegroepeerd per ontvanger.</p>

      <div className="mt-8">
        <EmailLogOverview logs={logs} />
      </div>
    </main>
  );
}
