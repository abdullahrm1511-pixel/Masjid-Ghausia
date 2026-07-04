import type { EmailLog } from "@prisma/client";
import { formatDate } from "@/lib/display";

type EmailLogOverviewProps = {
  logs: EmailLog[];
  emptyMessage?: string;
};

export function EmailLogOverview({ logs, emptyMessage = "Nog geen e-mails geregistreerd." }: EmailLogOverviewProps) {
  const groupedLogs = Array.from(
    logs.reduce((map, log) => {
      const items = map.get(log.recipient) ?? [];
      items.push(log);
      map.set(log.recipient, items);
      return map;
    }, new Map<string, EmailLog[]>())
  ).map(([recipient, items]) => ({ recipient, items }));

  if (!groupedLogs.length) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
        {emptyMessage}
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {groupedLogs.map(({ recipient, items }) => (
        <details className="rounded-lg border border-slate-200 bg-white shadow-sm" key={recipient}>
          <summary className="grid cursor-pointer gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{recipient}</h2>
              <p className="mt-1 text-sm text-slate-600">{items.length} e-mail{items.length === 1 ? "" : "s"} geregistreerd</p>
            </div>
            <p className="w-fit rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">Laatste: {formatDate(items[0]?.createdAt)}</p>
          </summary>
          <div className="grid gap-3 border-t border-slate-200 p-5 pt-4">
            {items.map((log) => (
              <details className="rounded-md border border-slate-200 bg-slate-50" key={log.id}>
                <summary className="cursor-pointer px-3 py-3 font-semibold text-[#0f5f9f]">
                  {formatDate(log.createdAt)} - {log.subject}
                </summary>
                <div className="border-t border-slate-200 p-3">
                  <dl className="grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="font-semibold text-slate-600">Template</dt>
                      <dd className="font-mono text-xs">{log.templateKey}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-600">Status</dt>
                      <dd>{log.status}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-600">Onderwerp</dt>
                      <dd>{log.subject}</dd>
                    </div>
                  </dl>
                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-xs text-slate-700">{log.bodyText || log.bodyHtml}</pre>
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
