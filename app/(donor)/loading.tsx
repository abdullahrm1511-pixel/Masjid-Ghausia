export default function DonorLoading() {
  return (
    <main className="donor-loading-shell">
      <div className="donor-loading-card">
        <span aria-hidden="true" className="donor-page-spinner" />
        <p className="text-sm font-bold">Uw gegevens worden geladen...</p>
      </div>
    </main>
  );
}
