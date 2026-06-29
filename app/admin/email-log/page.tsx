import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function EmailLogPage() {
  const logs = await prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">E-maillog</h1>
      <p className="mt-2 text-slate-700">Voorbereide e-mails. Er wordt nog niets automatisch verzonden.</p>
      <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[950px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="p-3">Datum</th>
              <th className="p-3">Ontvanger</th>
              <th className="p-3">Template</th>
              <th className="p-3">Onderwerp</th>
              <th className="p-3">Status</th>
              <th className="p-3">Preview</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr className="border-t border-slate-200 align-top" key={log.id}>
                <td className="p-3">{formatDate(log.createdAt)}</td>
                <td className="p-3">{log.recipient}</td>
                <td className="p-3 font-mono text-xs">{log.templateKey}</td>
                <td className="p-3 font-semibold">{log.subject}</td>
                <td className="p-3">{log.status}</td>
                <td className="p-3">
                  <details>
                    <summary className="cursor-pointer font-semibold text-[#0f5f9f]">Open</summary>
                    <pre className="mt-2 max-w-xl whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs">{log.bodyText || log.bodyHtml}</pre>
                  </details>
                </td>
              </tr>
            ))}
            {!logs.length ? (
              <tr>
                <td className="p-6 text-center text-slate-600" colSpan={6}>
                  Nog geen voorbereide e-mails.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
