import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";
import { signOut } from "@/lib/auth";
import { canManageDonors, canManageSettings, isAdminRole } from "@/lib/permissions";
import { roleHomePath } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";

const linkClass = "flex min-h-11 items-center rounded-lg px-3 py-2.5 font-semibold text-white/95 hover:bg-white/10";
const sectionClass = "mt-2 border-t border-white/15 pt-2";

export function MobileNavbar({ session }: { session: Session | null }) {
  const role = session?.user?.role;
  const admin = isAdminRole(role);
  const donorAdmin = canManageDonors(role);
  const settingsAdmin = canManageSettings(role);
  const donor = role === "DONOR";
  const headerClass = admin ? "border-[#0f5f9f] bg-[#1483d6]" : "border-[#c99a2e]/60 bg-[#07583f]";

  return (
    <header className={`sticky top-0 z-30 border-b shadow-sm ${headerClass}`}>
      <nav className="mx-auto grid max-w-7xl gap-3 px-3 py-3">
        <Link href={roleHomePath(role)} className="flex min-w-0 items-center gap-3 leading-tight">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full">
            <Image alt="Logo Ghausia uitvaart commissie" className="h-full w-full rounded-full object-cover" height={48} src="/ghausia-uitvaart-commissie-logo.png" width={48} priority />
          </span>
          <span className="grid min-w-0 text-white">
            <span className="flex items-baseline gap-1 leading-none"><span className="text-[0.62rem] font-bold uppercase tracking-wider">St.</span><span className="truncate text-lg font-black">Ghausia</span></span>
            <span className="mt-1 text-[0.65rem] font-semibold tracking-wide text-[#f2d789]">Begrafeniscommissie</span>
          </span>
        </Link>

        <details className="rounded-lg border border-white/20 bg-white/10">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 py-2.5 font-bold text-white marker:content-none">
            Menu <span aria-hidden="true">⌄</span>
          </summary>
          <div className="grid border-t border-white/15 p-2 text-sm">
            {!role ? <><Link className={linkClass} href="/over-masjid-ghausia">Over</Link><Link className={linkClass} href="/doneren">Doneren</Link><Link className={linkClass} href="/contact">Contact</Link><Link className={linkClass} href="/login">Inloggen</Link><Link className="mt-1 flex min-h-11 items-center rounded-lg bg-white px-3 py-2.5 font-bold text-[#0f5f9f]" href="/register">Inschrijven</Link></> : null}
            {donor ? <><Link className={linkClass} href="/dashboard">Dashboard</Link><Link className={linkClass} href="/account">Mijn account</Link></> : null}
            {admin ? (
              <>
                <Link className={linkClass} href="/admin">Admin dashboard</Link>
                {donorAdmin ? <Link className={linkClass} href="/admin/control-center">Controlecentrum</Link> : null}
                <Link className={linkClass} href="/admin/registrations">Registraties</Link>
                {donorAdmin ? (
                  <>
                    <div className={sectionClass}><p className="px-3 pb-1 text-xs font-black uppercase tracking-wide text-white/60">Donateurs</p></div>
                    <Link className={linkClass} href="/admin/donors">Alle donateurs</Link>
                    <Link className={linkClass} href="/admin/donors?status=ACTIVE">Actieve donateurs</Link>
                    <Link className={linkClass} href="/admin/family-transitions">Gezinswijzigingen</Link>
                    <Link className={linkClass} href="/admin/change-requests">Wijzigingsverzoeken</Link>
                    <div className={sectionClass}><p className="px-3 pb-1 text-xs font-black uppercase tracking-wide text-white/60">E-mail</p></div>
                    <Link className={linkClass} href="/admin/email-send">Verzenden</Link>
                    <Link className={linkClass} href="/admin/email-templates">Templates</Link>
                    <Link className={linkClass} href="/admin/email-log">E-maillog</Link>
                    <div className={sectionClass}><p className="px-3 pb-1 text-xs font-black uppercase tracking-wide text-white/60">Instellingen</p></div>
                    <Link className={linkClass} href="/admin/settings">Alle instellingen</Link>
                    <Link className={linkClass} href="/admin/settings/pricing">Prijsinstellingen</Link>
                    <Link className={linkClass} href="/admin/import">Import</Link>
                    <Link className={linkClass} href="/admin/export">Export</Link>
                    {settingsAdmin ? <Link className={linkClass} href="/admin/audit-log">Auditlog</Link> : null}
                  </>
                ) : null}
              </>
            ) : null}
            {role ? (
              <form className={sectionClass} action={async () => { "use server"; await signOut({ redirectTo: absoluteUrl("/login?loggedOut=1") }); }}>
                <button className={`${linkClass} w-full`} type="submit">Uitloggen</button>
              </form>
            ) : null}
          </div>
        </details>
      </nav>
    </header>
  );
}
