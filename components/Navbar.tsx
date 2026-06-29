import Link from "next/link";
import Image from "next/image";
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
    ["Inactief", "/admin/donors?status=INACTIVE"],
    ["Actie vereist", "/admin/donors?status=ACTION_REQUIRED"],
    ["Gezinswijzigingen", "/admin/family-transitions"],
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
    "invisible absolute right-0 top-full z-20 min-w-60 rounded-lg border border-slate-200 bg-white p-2 text-slate-700 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100";
  const navLink = "shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-white/90 hover:bg-white/10 hover:text-white";

  return (
    <header className="sticky top-0 z-30 border-b border-[#0f5f9f] bg-[#1483d6] shadow-sm">
      <nav className="mx-auto grid max-w-7xl gap-3 px-4 py-3 lg:flex lg:items-center lg:justify-between">
        <Link href="/" className="flex min-w-0 items-center gap-3 leading-tight">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-white/40">
            <Image alt="Masjid Ghausia logo" className="h-full w-full object-cover" height={44} src="/masjid-ghausia-logo.png" width={44} />
          </span>
          <span className="grid min-w-0">
            <span className="truncate text-lg font-black text-white">Masjid Ghausia</span>
            <span className="text-xs font-semibold text-[#f0c08d]">Donateursportaal</span>
          </span>
        </Link>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm font-semibold lg:mx-0 lg:flex-1 lg:flex-wrap lg:items-center lg:justify-end lg:overflow-visible lg:px-0 lg:pb-0">
          {!role ? (
            <>
              <Link className={navLink} href="/login">
                Inloggen
              </Link>
              <Link className="rounded-md bg-white px-3 py-2 text-[#0f5f9f] hover:bg-[#f0c08d]" href="/register">
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
              {donorAdmin ? (
                <Link className={navLink} href="/admin/control-center">
                  Controlecentrum
                </Link>
              ) : null}
              <Link className={navLink} href="/admin/registrations">
                Registraties
              </Link>
              {donorAdmin ? (
              <div className="group relative shrink-0">
                  <Link className={`block ${navLink}`} href="/admin/donors">
                    Donateurs
                  </Link>
                  <div className="invisible absolute left-0 top-full z-20 min-w-64 rounded-lg border border-slate-200 bg-white p-2 text-slate-700 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    {donorLinks.map(([label, href]) => (
                      <Link className="block rounded-md px-3 py-2 text-sm hover:bg-sky-50 hover:text-[#0f5f9f]" href={href} key={href}>
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
                  <div className="group relative shrink-0">
                    <Link className={`block ${navLink}`} href="/admin/email-templates">
                      E-mail
                    </Link>
                    <div className={dropdownClass}>
                      {emailLinks.map(([label, href]) => (
                        <Link className="block rounded-md px-3 py-2 text-sm hover:bg-sky-50 hover:text-[#0f5f9f]" href={href} key={href}>
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="group relative shrink-0 lg:ml-auto">
                    <Link className={`block ${navLink}`} href="/admin/settings">
                      Instellingen
                    </Link>
                    <div className={dropdownClass}>
                      {settingsLinks.map(([label, href]) => (
                        <Link className="block rounded-md px-3 py-2 text-sm hover:bg-sky-50 hover:text-[#0f5f9f]" href={href} key={href}>
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
