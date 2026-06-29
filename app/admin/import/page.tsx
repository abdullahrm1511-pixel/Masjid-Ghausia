import { ImportForm } from "./ImportForm";

export default function ImportPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-[#1483d6]">Oude administratie</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Import</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Upload een oude ledenlijst of bankexport. Eerst krijg je een preview; pas daarna wordt alles verwerkt.
        </p>
      </section>
      <ImportForm />
    </main>
  );
}
