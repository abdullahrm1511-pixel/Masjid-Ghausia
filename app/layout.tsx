import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { InteractionFeedback } from "@/components/InteractionFeedback";
import { isAdminRole } from "@/lib/permissions";
import { defaultDescription, jsonLd, organizationJsonLd, seoKeywords, siteName, siteUrl, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${siteName} | Masjid Ghausia Rotterdam`,
    template: `%s | ${siteName}`
  },
  description: defaultDescription,
  keywords: seoKeywords,
  alternates: {
    canonical: "/"
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "google-site-verification-placeholder"
  },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: siteUrl,
    siteName,
    title: `${siteName} | Masjid Ghausia Rotterdam`,
    description: defaultDescription,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Masjid Ghausia Donateursportaal"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Masjid Ghausia Rotterdam`,
    description: defaultDescription,
    images: ["/opengraph-image"]
  },
  robots: {
    index: true,
    follow: true
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const admin = isAdminRole(session?.user.role);

  return (
    <html lang="nl">
      <body className={admin ? undefined : "donor-portal"}>
        <InteractionFeedback />
        <Navbar session={session} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd([organizationJsonLd(), websiteJsonLd()])}
        />
        {children}
      </body>
    </html>
  );
}
