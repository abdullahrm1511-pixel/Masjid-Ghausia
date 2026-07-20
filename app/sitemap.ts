import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

const publicRoutes = [
  { path: "/", priority: 1 },
  { path: "/doneren", priority: 0.95 },
  { path: "/register", priority: 0.9 },
  { path: "/over-masjid-ghausia", priority: 0.8 },
  { path: "/stgbc", priority: 0.8 },
  { path: "/contact", priority: 0.7 },
  { path: "/login", priority: 0.6 },
  { path: "/forgot-password", priority: 0.3 }
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: "weekly",
    priority: route.priority
  }));
}
