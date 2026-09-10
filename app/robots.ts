import type { MetadataRoute } from "next";
import { IS_CANONICAL_HOST, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // A preview deployment is a full copy of the site on a different host. Left
  // crawlable it competes with the real domain for its own content.
  if (!IS_CANONICAL_HOST) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Challenge links are personal, unbounded and score-bearing.
        disallow: ["/challenge"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
