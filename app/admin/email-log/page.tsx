import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function EmailLogPage() {
  const logs = await prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const groupedLogs = Array.from(
    logs.reduce((map, log) => {
      const items = map.get(log.recipient) ?? [];
      items.push(log);
      map.set(log.recipient, items);
      return map;
    }, new Map<string, typeof logs>())
  ).map(([recipient, items]) => ({ recipient, items }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">E-maillog</h1>
      <p className="mt-2 text-slate-700">Alle voorbereide e-mails gegroepeerd per persoon. Er wordt nog niets automatisch verzonden.</p>

      <div className="mt-8 grid gap-4">
        {groupedLogs.map(({ recipient, items }) => (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={recipient}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{recipient}</h2>
                <p className="mt-1 text-sm text-slate-600">{items.length} e-mail{items.length === 1 ? "" : "s"} voorbereid</p>
              </div>
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">Laatste: {formatDate(items[0]?.createdAt)}</p>
            </div>
            <div className="mt-4 grid gap-3">
              {items.map((log) => (
                <details className="rounded-md border border-slate-200 bg-slate-50 p-3" key={log.id}>
                  <summary className="cursor-pointer font-semibold text-[#0f5f9f]">
                    {formatDate(log.createdAt)} - {log.subject}
                  </summary>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <div><dt className="font-semibold text-slate-600">Template</dt><dd className="font-mono text-xs">{log.templateKey}</dd></div>
                    <div><dt className="font-semibold text-slate-600">Status</dt><dd>{log.status}</dd></div>
                    <div><dt className="font-semibold text-slate-600">Onderwerp</dt><dd>{log.subject}</dd></div>
                  </dl>
                  <pre className="mt-3 whitespace-pre-wrap rounded-md bg-white p-3 text-xs text-slate-700">{log.bodyText || log.bodyHtml}</pre>
                </details>
              ))}
            </div>
          </section>
        ))}
        {!groupedLogs.length ? (
          <section className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
            Nog geen voorbereide e-mails.
          </section>
        ) : null}
      </div>
    </main>
  );
}
