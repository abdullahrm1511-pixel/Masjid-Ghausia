import type { Metadata } from "next";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://stgbc.masjidghausia.nl";

export const siteName = "St. Ghausia Begrafeniscommissie";
export const organizationName = "St. Ghausia Begrafeniscommissie";
export const defaultDescription =
  "Het donateursportaal van St. Ghausia Begrafeniscommissie in Rotterdam voor inschrijven, inloggen en doneren.";

export const seoKeywords = [
  "Masjid Ghausia",
  "GBC",
  "Masjid Ghausia Rotterdam",
  "Donateursportaal",
  "Moskee Rotterdam",
  "Doneren Masjid Ghausia",
  "St. GBC Masjid Ghausia",
  "Ghausia Rotterdam",
  "donateursportaal moskee"
];

export type PublicPageSeo = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
};

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

export function createPublicMetadata({ title, description, path, keywords = [] }: PublicPageSeo): Metadata {
  const canonical = absoluteUrl(path);
  const mergedKeywords = Array.from(new Set([...seoKeywords, ...keywords]));

  return {
    title,
    description,
    keywords: mergedKeywords,
    alternates: {
      canonical
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1
      }
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      locale: "nl_NL",
      type: "website",
      images: [
        {
          url: absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: "St. Ghausia Begrafeniscommissie"
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl("/opengraph-image")]
    }
  };
}

export const privateMetadata: Metadata = {
  title: "Besloten portaal",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true
    }
  }
};

export function jsonLd(data: Record<string, unknown> | Record<string, unknown>[]) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c")
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "NGO"],
    "@id": `${siteUrl}/#organization`,
    name: organizationName,
    alternateName: ["Ghausia Begrafeniscommissie", "GBC", "St. Ghausia BC"],
    url: siteUrl,
    logo: absoluteUrl("/ghausia-uitvaart-commissie-logo.png"),
    telephone: "+31 10 484 5149",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Boudewijnstraat 57",
      postalCode: "3073 ZA",
      addressLocality: "Rotterdam",
      addressRegion: "Zuid-Holland",
      addressCountry: "NL"
    },
    sameAs: ["https://masjidghausia.nl/"]
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: siteName,
    url: siteUrl,
    inLanguage: "nl-NL",
    publisher: {
      "@id": `${siteUrl}/#organization`
    }
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export function webPageJsonLd({ title, description, path }: PublicPageSeo) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name: title,
    description,
    inLanguage: "nl-NL",
    isPartOf: {
      "@id": `${siteUrl}/#website`
    },
    about: {
      "@id": `${siteUrl}/#organization`
    }
  };
}
