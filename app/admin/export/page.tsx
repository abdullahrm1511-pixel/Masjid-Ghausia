export default function ExportPage() {
  const filters = [
    ["all", "Alle donateurs"],
    ["active", "Actieve donateurs"],
    ["inactive", "Inactief"],
    ["rejected", "Afgewezen"],
    ["deceased", "Overleden"],
    ["payment_required", "Betaling vereist"],
    ["open_change_requests", "Open wijzigingsverzoeken"]
  ] as const;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Export</h1>
      <section className="mt-8 rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Alle leden exporteren</h2>
        <p className="mt-2 text-sm font-semibold text-teal-950">
          Exporteert primary, partner en kinderen in dezelfde kolomstructuur als Members Personal Details.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="rounded-md bg-[#1483d6] px-3 py-2 text-sm font-semibold text-white" href="/admin/export/download?template=member-personal-details&format=xlsx">
            Leden Excel
          </a>
          <a className="rounded-md border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-900" href="/admin/export/download?template=member-personal-details&format=csv">
            Leden CSV
          </a>
        </div>
      </section>
      <section className="mt-8 grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {filters.map(([value, label]) => (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 last:border-b-0" key={value}>
            <span className="font-semibold text-slate-800">{label}</span>
            <div className="flex gap-2">
              <a className="rounded-md bg-[#1483d6] px-3 py-2 text-sm font-semibold text-white" href={`/admin/export/download?filter=${value}&format=xlsx`}>Excel</a>
              <a className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800" href={`/admin/export/download?filter=${value}&format=csv`}>CSV</a>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
