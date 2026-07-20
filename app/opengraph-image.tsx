import { ImageResponse } from "next/og";
import { organizationName, siteName } from "@/lib/seo";

export const runtime = "edge";
export const alt = "Masjid Ghausia Donateursportaal";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f766e 0%, #1483d6 62%, #f0c08d 100%)",
          color: "white",
          padding: 72,
          fontFamily: "Arial, sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 116,
              height: 116,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 28,
              background: "rgba(255,255,255,0.18)",
              border: "2px solid rgba(255,255,255,0.36)",
              fontSize: 54,
              fontWeight: 900
            }}
          >
            GBC
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 34, fontWeight: 800 }}>{organizationName}</div>
            <div style={{ marginTop: 8, color: "#fff1d9", fontSize: 26, fontWeight: 700 }}>Rotterdam</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ maxWidth: 920, fontSize: 78, fontWeight: 900, lineHeight: 1.04 }}>{siteName}</div>
          <div style={{ maxWidth: 820, color: "#edfdfb", fontSize: 30, fontWeight: 700, lineHeight: 1.35 }}>
            Inschrijven, inloggen en doneren via het officiele donateursportaal.
          </div>
        </div>
      </div>
    ),
    size
  );
}
