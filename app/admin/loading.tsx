export default function AdminLoading() {
  return (
    <main className="admin-loading-shell">
      <section className="admin-loading-card" aria-live="polite" aria-busy="true">
        <span className="admin-page-spinner" />
        <div>
          <p className="text-sm font-black uppercase text-[#1483d6]">Admin</p>
          <p className="mt-1 font-semibold text-slate-700">Gegevens laden...</p>
        </div>
      </section>
    </main>
  );
}
