/** Single source of truth for branding + absolute URLs used across metadata. */
export const SITE = {
  name: "ONE MORE",
  tagline: "Play. Beat. One More.",
  description:
    "ONE MORE is a fast browser game platform. Six instant games — Reaction, Crowd Pick, Memory, Chain, Rush and Ascent — a daily challenge, streaks and shareable head-to-head links. No account, no download, no waiting.",
  locale: "en_US",
  twitter: "@onemore",
} as const;

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  // Vercel exposes the production domain at build time; previews fall back to
  // their own deployment URL so OG tags always resolve to something real.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

export function canonical(path = "/"): string {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}
