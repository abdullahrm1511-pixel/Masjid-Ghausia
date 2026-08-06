import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  outputFileTracingIncludes: {
    "/*": ["./public/templates/inschrijf-formulier-stgbc.pdf", "./public/templates/gegevens-aanvraag-overledene.pdf", "./public/templates/avg-zuiderbegraafplaats-2026.pdf"]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  }
};

export default nextConfig;
