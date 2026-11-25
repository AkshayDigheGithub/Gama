import { IS_CANONICAL_HOST } from "./site";

/**
 * The Google Tag Manager container.
 *
 * Overridable so a staging container can be used without a code change; the
 * production container is the default so a normal deploy needs no env var,
 * matching how `lib/site.ts` treats the production origin.
 */
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-MP9R2RSH";

/**
 * Only the real production deployment loads the container.
 *
 * Both halves of this are load-bearing. `IS_CANONICAL_HOST` is false on preview
 * deployments and whenever `NEXT_PUBLIC_SITE_URL` points a build elsewhere. The
 * `VERCEL_ENV` check covers local builds: `npm start` runs with
 * `NODE_ENV=production` and no `VERCEL_ENV`, so the host resolver hands back the
 * production origin and `IS_CANONICAL_HOST` alone is true on a laptop — which
 * would fire the live container every time anyone served the site locally.
 *
 * Evaluated on the server, where `VERCEL_ENV` is readable; the layout renders
 * nothing when it is false, so no tag reaches the client.
 */
export const IS_GTM_ENABLED =
  GTM_ID.length > 0 && IS_CANONICAL_HOST && process.env.VERCEL_ENV === "production";
