import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { approveChangeRequest, rejectChangeRequest } from "./actions";

export const dynamic = "force-dynamic";

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default async function ChangeRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await prisma.changeRequest.findUnique({
    where: { id },
    include: { donorProfile: true }
  });

  if (!request) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <BackButton fallbackHref="/admin/change-requests" />
      <h1 className="mt-5 text-3xl font-bold text-slate-900">Wijzigingsverzoek</h1>
      <p className="mt-2 text-slate-700">{request.donorProfile.firstName} {request.donorProfile.lastName} - {request.status}</p>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Oude waarde</h2>
          <pre className="mt-4 overflow-auto rounded-md bg-slate-50 p-4 text-xs">{pretty(request.currentData)}</pre>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Nieuwe waarde</h2>
          <pre className="mt-4 overflow-auto rounded-md bg-slate-50 p-4 text-xs">{pretty(request.requestedData)}</pre>
        </section>
      </div>

      {request.donorNote ? <p className="mt-5 rounded-lg border border-slate-200 bg-white p-4"><strong>Toelichting donateur:</strong> {request.donorNote}</p> : null}

      <section className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <form action={approveChangeRequest} className="grid gap-3">
          <input name="id" type="hidden" value={request.id} />
          <label>Interne notitie<textarea name="adminNote" rows={3} /></label>
          <button className="w-fit rounded-md bg-[#1483d6] px-4 py-3 font-semibold text-white" type="submit">Goedkeuren</button>
        </form>
        <form action={rejectChangeRequest} className="grid gap-3 border-t border-slate-200 pt-4">
          <input name="id" type="hidden" value={request.id} />
          <label>Interne notitie<textarea name="adminNote" rows={3} /></label>
          <label>Bericht voor donateur<textarea name="donorMessage" rows={3} required /></label>
          <button className="w-fit rounded-md border border-red-600 px-4 py-2 font-semibold text-red-800" type="submit">Afwijzen</button>
        </form>
      </section>
    </main>
  );
}
