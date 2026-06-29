import Link from "next/link";
import Image from "next/image";
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
      <section className="max-w-2xl rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-5 flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <Image alt="Masjid Ghausia logo" className="h-full w-full object-cover" height={64} src="/masjid-ghausia-logo.png" width={64} />
          </span>
          <p className="text-sm font-bold uppercase tracking-wide text-[#1483d6]">St. GBC Masjid Ghausia</p>
        </div>
        <h1 className="text-4xl font-black text-slate-950 sm:text-5xl">Donateursportaal</h1>
        <p className="mt-5 text-lg leading-8 text-slate-700">
          Welkom bij het donateursportaal van St. GBC.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-lg bg-[#1483d6] px-5 py-3 font-semibold text-white shadow-sm hover:bg-[#0f5f9f]" href="/login">
            Inloggen
          </Link>
          <Link className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50" href="/register">
            Nieuwe inschrijving
          </Link>
        </div>
      </section>
    </main>
  );
}
