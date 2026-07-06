export default function AuthLoading() {
  return (
    <main className="donor-loading-shell">
      <div className="donor-loading-card">
        <span aria-hidden="true" className="donor-page-spinner" />
        <p className="text-sm font-bold">Pagina laden...</p>
      </div>
    </main>
  );
}
