import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Static social card, rendered once at build time. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "88px",
          background: "#05060a",
          color: "#f4f6fa",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#c9ff3b",
            fontWeight: 700,
          }}
        >
          One More
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 148,
            fontWeight: 800,
            letterSpacing: -6,
            lineHeight: 1,
            marginTop: 28,
          }}
        >
          Play. Beat.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 148,
            fontWeight: 800,
            letterSpacing: -6,
            lineHeight: 1,
            color: "#c9ff3b",
          }}
        >
          One More.
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#a3aabd", marginTop: 40 }}>
          Quick browser games. No account, no download.
        </div>
      </div>
    ),
    size,
  );
}
