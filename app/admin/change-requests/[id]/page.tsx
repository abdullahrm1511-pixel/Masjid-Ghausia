import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { approveChangeRequest, rejectChangeRequest } from "./actions";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  "profile.firstName": "Voornaam",
  "profile.lastName": "Achternaam",
  "profile.gender": "Geslacht",
  "profile.dateOfBirth": "Geboortedatum",
  "profile.birthPlace": "Geboorteplaats",
  "profile.phone": "Telefoon",
  "profile.email": "E-mail",
  "profile.maritalStatus": "Burgerlijke staat",
  "profile.addressLine1": "Straat + huisnr",
  "profile.addressLine2": "Adresregel 2",
  "profile.postalCode": "Postcode",
  "profile.city": "Woonplaats",
  "profile.country": "Land",
  "profile.iban": "IBAN",
  "profile.accountHolderName": "Rekeninghouder",
  "profile.pakistanContactName": "Contact Pakistan",
  "profile.pakistanContactPhone": "Telefoon Pakistan",
  "profile.funeralWishes": "Uitvaartwensen",
  "profile.notes": "Notities"
};

function plain(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return value.toLocaleDateString("nl-NL");
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function flatten(value: unknown, prefix = ""): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return prefix ? { [prefix]: value } : {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((result, [key, item]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === "object" && !Array.isArray(item)) {
      Object.assign(result, flatten(item, nextKey));
    } else {
      result[nextKey] = item;
    }
    return result;
  }, {});
}

function changedRows(currentData: unknown, requestedData: unknown) {
  const current = flatten(currentData);
  const requested = flatten(requestedData);
  return Object.keys({ ...current, ...requested })
    .filter((key) => plain(current[key]) !== plain(requested[key]))
    .map((key) => ({
      key,
      label: labels[key] ?? key.replace(/^profile\./, "").replace(/\./g, " "),
      oldValue: plain(current[key]),
      newValue: plain(requested[key])
    }));
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
  const rows = changedRows(request.currentData, request.requestedData);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <BackButton fallbackHref="/admin/change-requests" />
      <h1 className="mt-5 text-3xl font-bold text-slate-900">Wijzigingsverzoek</h1>
      <p className="mt-2 text-slate-700">{request.donorProfile.firstName} {request.donorProfile.lastName} - {request.status}</p>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Aangevraagde wijzigingen</h2>
        <p className="mt-2 text-sm text-slate-600">Alleen velden die anders zijn worden hieronder getoond.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="p-3">Veld</th>
                <th className="p-3">Huidig</th>
                <th className="p-3">Nieuwe reactie / wijziging</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-t border-slate-200 align-top" key={row.key}>
                  <td className="p-3 font-semibold">{row.label}</td>
                  <td className="p-3 text-slate-700">{row.oldValue}</td>
                  <td className="p-3 font-semibold text-slate-950">{row.newValue}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="p-6 text-center text-slate-600" colSpan={3}>Geen verschil gevonden.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {request.donorNote ? <p className="mt-5 rounded-lg border border-slate-200 bg-white p-4"><strong>Toelichting donateur:</strong> {request.donorNote}</p> : null}
      {request.adminNote || request.donorMessage ? (
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-bold text-slate-900">Beoordeling</h2>
          {request.adminNote ? <p className="mt-2 text-sm"><strong>Interne notitie:</strong> {request.adminNote}</p> : null}
          {request.donorMessage ? <p className="mt-2 text-sm"><strong>Bericht aan donateur:</strong> {request.donorMessage}</p> : null}
        </section>
      ) : null}

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
