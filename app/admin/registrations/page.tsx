import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RegistrationsPage() {
  const requests = await prisma.registrationRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: true,
      donorProfile: true
    }
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Registraties</h1>
      <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="p-3">Lidnummer</th>
              <th className="p-3">Naam</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Telefoon</th>
              <th className="p-3">Datum</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actie</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr className="border-t border-slate-200" key={request.id}>
                <td className="p-3">{request.donorProfile?.registrationNumber ?? "-"}</td>
                <td className="p-3 font-semibold">{request.donorProfile ? `${request.donorProfile.firstName} ${request.donorProfile.lastName}` : request.requestedBy.name}</td>
                <td className="p-3">{request.requestedBy.email}</td>
                <td className="p-3">{request.donorProfile?.phone ?? "-"}</td>
                <td className="p-3">{request.createdAt.toLocaleDateString("nl-NL")}</td>
                <td className="p-3">{request.status}</td>
                <td className="p-3"><Link className="font-semibold text-[#0f5f9f]" href={`/admin/registrations/${request.id}`}>Bekijken</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
