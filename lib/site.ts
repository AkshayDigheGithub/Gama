/** Single source of truth for branding + absolute URLs used across metadata. */
export const SITE = {
  name: "ONE MORE",
  tagline: "Play. Beat. One More.",
  /** Kept to 140-160 characters so search results never truncate it. */
  description:
    "Seven fast browser games — reflex, memory, aim and nerve. Play instantly, beat your best score and challenge a friend. No account, no download.",
  /** The full pitch, for places with no length limit. */
  longDescription:
    "ONE MORE is a fast browser game platform. Seven instant games — Reaction, Crowd Pick, Memory, Chain, Rush, Ascent and Salvo — plus a daily challenge, streaks and shareable head-to-head links. No account, no download, no waiting.",
  locale: "en_US",
} as const;

/**
 * The canonical production origin.
 *
 * Hardcoded rather than derived from Vercel's env: `VERCEL_PROJECT_PRODUCTION_URL`
 * reports the *.vercel.app deployment domain, not the custom domain, so relying
 * on it pointed every canonical, sitemap entry and share link at the wrong host.
 *
 * Apex, not www — Vercel is configured to redirect one to the other, and the
 * canonical must name the destination or every page advertises a redirect.
 */
const PRODUCTION_ORIGIN = "https://onemoregame.site";

function resolveSiteUrl(): string {
  // An explicit override always wins — useful for a staging host.
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // Local development: share links have to point at the machine you are on.
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";

  // Preview deployments describe themselves, so a preview's share links and OG
  // tags resolve to that preview rather than to production.
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return PRODUCTION_ORIGIN;
}

export const SITE_URL = resolveSiteUrl();

/**
 * True only on the real domain. Previews and local builds serve the same pages,
 * and now that a canonical domain exists they must not be indexed alongside it.
 */
export const IS_CANONICAL_HOST = SITE_URL === PRODUCTION_ORIGIN;

export function canonical(path = "/"): string {
  // No trailing slash on the root. Next normalises `alternates.canonical`
  // against `trailingSlash: false` and strips one anyway, so adding it here
  // only desynced the sitemap (which uses this helper directly) from the
  // rendered canonical tag. "https://host" and "https://host/" are the same
  // URL per RFC 3986 and Google treats them as such.
  return `${SITE_URL}${path === "/" ? "" : path}`;
}
