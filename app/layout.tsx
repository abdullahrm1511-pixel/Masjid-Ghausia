import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { isAdminRole } from "@/lib/permissions";
import "./globals.css";

export const metadata: Metadata = {
  title: "St. GBC Donateursportaal",
  description: "Donateursportaal van St. GBC Masjid Ghausia"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const admin = isAdminRole(session?.user.role);

  return (
    <html lang="nl">
      <body className={admin ? undefined : "donor-portal"}>
        <Navbar session={session} />
        {children}
      </body>
    </html>
  );
}
