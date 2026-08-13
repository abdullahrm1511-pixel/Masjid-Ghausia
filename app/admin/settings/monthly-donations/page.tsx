import Link from "next/link";
import { getSepaConfig, sepaConfigComplete } from "@/lib/monthly-donation-agreement";
import { SepaSettingsForm } from "./SepaSettingsForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const config = await getSepaConfig();
  const complete = sepaConfigComplete(config);

  return <main className="mx-auto max-w-4xl px-4 py-10">
    <Link className="font-bold text-[#0f5f9f]" href="/admin/settings">← Instellingen</Link>
    <header className="mt-4">
      <p className="font-bold text-[#0f766e]">Masjid Ghausia</p>
      <h1 className="text-3xl font-bold">SEPA-instellingen</h1>
      <p className="mt-2 text-slate-600">Deze officiële gegevens komen letterlijk op iedere digitale machtiging.</p>
    </header>
    <div className={`mt-6 rounded-lg border p-4 font-semibold ${complete ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
      {complete ? "Compleet – machtigingen kunnen veilig worden opgesteld." : "Nog niet compleet – maandelijkse machtigingen blijven geblokkeerd."}
    </div>
    <SepaSettingsForm config={config} />
  </main>;
}
