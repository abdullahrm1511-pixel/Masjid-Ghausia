import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

const publicRoutes = [
  { path: "/", priority: 1 },
  { path: "/register", priority: 0.9 },
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
