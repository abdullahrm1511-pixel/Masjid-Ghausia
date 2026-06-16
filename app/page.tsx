import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export default async function HomePage() {
  const session = await auth();

  if (isAdminRole(session?.user.role)) {
    redirect("/admin");
  }
  if (session?.user.role === "DONOR") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl content-center px-4 py-12">
      <section className="max-w-2xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-emerald-700">St. GBC Masjid Ghausia</p>
        <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">St. GBC Donateursportaal</h1>
        <p className="mt-5 text-lg leading-8 text-slate-700">
          Welkom bij het donateursportaal van St. GBC.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800" href="/login">
            Inloggen
          </Link>
          <Link className="rounded-md border border-stone-300 px-5 py-3 font-semibold text-slate-800 hover:bg-white" href="/register">
            Nieuwe inschrijving
          </Link>
        </div>
      </section>
    </main>
  );
}
