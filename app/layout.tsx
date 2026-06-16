import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "St. GBC Donateursportaal",
  description: "Donateursportaal van St. GBC Masjid Ghausia"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="nl">
      <body>
        <Navbar session={session} />
        {children}
      </body>
    </html>
  );
}
