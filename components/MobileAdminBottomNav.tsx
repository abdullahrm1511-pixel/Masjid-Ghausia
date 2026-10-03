"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Dashboard", href: "/admin", icon: "▣", exact: true },
  { label: "Aanvragen", href: "/admin/settings/funeral-applications", icon: "▤" },
  { label: "Donateurs", href: "/admin/donors", icon: "♙" },
  { label: "Instellingen", href: "/admin/settings", icon: "⚙" }
] as const;

export function MobileAdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-admin-bottom-nav" aria-label="Mobiele adminnavigatie">
      {items.map((item) => {
        const active = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined} href={item.href} key={item.href}>
            <span aria-hidden="true" className="mobile-admin-bottom-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
