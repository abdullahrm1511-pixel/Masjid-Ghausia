import Link from "next/link";
import { signOut } from "@/lib/auth";
import { canManageDonors, isAdminRole } from "@/lib/permissions";
import type { Session } from "next-auth";

export function Navbar({ session }: { session: Session | null }) {
  const role = session?.user?.role;
  const admin = isAdminRole(role);
  const donorAdmin = canManageDonors(role);
  const donor = role === "DONOR";
  const donorLinks = [
    ["Alle donateurs", "/admin/donors"],
    ["Actieve donateurs", "/admin/donors?status=ACTIVE"],
    ["Inactief / betaling afwachtend", "/admin/donors?status=INACTIVE_OR_PAYMENT_REQUIRED"],
    ["Actie vereist", "/admin/donors?status=ACTION_REQUIRED"],
    ["Afgewezen", "/admin/donors?status=REJECTED"],
    ["Overleden", "/admin/donors?status=DECEASED"]
  ] as const;
  const emailLinks = [
    ["Templates", "/admin/email-templates"],
    ["E-maillog", "/admin/email-log"]
  ] as const;
  const settingsLinks = [
    ["Prijsinstellingen", "/admin/settings/pricing"],
    ["Import", "/admin/import"],
    ["Export", "/admin/export"]
  ] as const;
  const dropdownClass =
    "invisible absolute right-0 top-full z-20 min-w-60 rounded-md border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100";
  const navLink = "rounded-md px-3 py-2 hover:bg-slate-100";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="grid leading-tight">
          <span className="text-lg font-black text-emerald-800">Masjid Ghausia</span>
          <span className="text-xs font-semibold text-slate-500">Donateursportaal</span>
        </Link>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 text-sm font-semibold text-slate-700">
          {!role ? (
            <>
              <Link className={navLink} href="/login">
                Inloggen
              </Link>
              <Link className="rounded-md bg-emerald-700 px-3 py-2 text-white hover:bg-emerald-800" href="/register">
                Inschrijven
              </Link>
            </>
          ) : null}
          {donor ? (
            <>
              <Link className={navLink} href="/dashboard">
                Dashboard
              </Link>
              <Link className={navLink} href="/account">
                Mijn account
              </Link>
            </>
          ) : null}
          {admin ? (
            <>
              <Link className={navLink} href="/admin">
                Admin dashboard
              </Link>
              <Link className={navLink} href="/admin/registrations">
                Registraties
              </Link>
              {donorAdmin ? (
                <div className="group relative">
                  <Link className={`block ${navLink}`} href="/admin/donors">
                    Donateurs
                  </Link>
                  <div className="invisible absolute left-0 top-full z-20 min-w-64 rounded-md border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    {donorLinks.map(([label, href]) => (
                      <Link className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100" href={href} key={href}>
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
              {donorAdmin ? (
                <>
                  <Link className={navLink} href="/admin/change-requests">
                    Wijzigingsverzoeken
                  </Link>
                  <div className="group relative">
                    <Link className={`block ${navLink}`} href="/admin/email-templates">
                      E-mail
                    </Link>
                    <div className={dropdownClass}>
                      {emailLinks.map(([label, href]) => (
                        <Link className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100" href={href} key={href}>
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="group relative ml-auto">
                    <Link className={`block ${navLink}`} href="/admin/settings">
                      Instellingen
                    </Link>
                    <div className={dropdownClass}>
                      {settingsLinks.map(([label, href]) => (
                        <Link className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100" href={href} key={href}>
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
          {role ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className={navLink} type="submit">
                Uitloggen
              </button>
            </form>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
