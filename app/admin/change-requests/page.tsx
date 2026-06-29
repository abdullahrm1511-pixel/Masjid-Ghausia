import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ChangeRequestsPage() {
  const requests = await prisma.changeRequest.findMany({
    orderBy: { submittedAt: "desc" },
    include: { donorProfile: true }
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Wijzigingsverzoeken</h1>
      <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="p-3">Donateur</th>
              <th className="p-3">Datum</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actie</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr className="border-t border-slate-200" key={request.id}>
                <td className="p-3 font-semibold">{request.donorProfile.firstName} {request.donorProfile.lastName}</td>
                <td className="p-3">{request.submittedAt.toLocaleDateString("nl-NL")}</td>
                <td className="p-3">{request.changeType}</td>
                <td className="p-3">{request.status}</td>
                <td className="p-3"><Link className="font-semibold text-[#0f5f9f]" href={`/admin/change-requests/${request.id}`}>Bekijken</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
