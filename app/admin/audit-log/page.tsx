import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageSettings } from "@/lib/permissions";
import { formatDate } from "@/lib/display";

export const dynamic = "force-dynamic";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const session = await auth();
  if (!canManageSettings(session?.user.role)) notFound();

  const params = await searchParams;
  const q = firstParam(params.q).trim();
  const logs = await prisma.auditLog.findMany({
    where: q
      ? {
          OR: [
            { message: { contains: q, mode: "insensitive" } },
            { entityType: { contains: q, mode: "insensitive" } },
            { entityId: { contains: q, mode: "insensitive" } },
            { actor: { email: { contains: q, mode: "insensitive" } } },
            { actor: { name: { contains: q, mode: "insensitive" } } }
          ]
        }
      : undefined,
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#1483d6]">Controle</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Auditlog</h1>
            <p className="mt-2 text-sm text-slate-600">Laatste 200 acties in het adminportaal.</p>
          </div>
          <Link className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-800 hover:bg-slate-100" href="/admin/settings">
            Terug naar instellingen
          </Link>
        </div>
        <form className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <input name="q" defaultValue={q} placeholder="Zoek op admin, actie, type of ID" />
          <button className="rounded-lg bg-[#1483d6] px-5 py-3 font-bold text-white shadow-sm hover:bg-[#0f5f9f]" type="submit">
            Zoeken
          </button>
        </form>
      </section>

      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3">Datum</th>
              <th className="p-3">Admin</th>
              <th className="p-3">Actie</th>
              <th className="p-3">Onderdeel</th>
              <th className="p-3">Bericht</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr className="border-t border-slate-200 align-top hover:bg-sky-50/40" key={log.id}>
                <td className="p-3 font-semibold">{formatDate(log.createdAt)}</td>
                <td className="p-3">{log.actor?.name ?? log.actor?.email ?? "Systeem"}</td>
                <td className="p-3 font-bold">{log.action}</td>
                <td className="p-3">{log.entityType}{log.entityId ? ` / ${log.entityId}` : ""}</td>
                <td className="p-3">{log.message}</td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td className="p-6 text-center text-slate-600" colSpan={5}>Geen auditregels gevonden.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
