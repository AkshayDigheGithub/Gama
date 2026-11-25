import type { AnalyticsProvider } from "@/lib/analytics/types";
import type { AnalyticsEventMap, AnalyticsEventName } from "@/lib/analytics/events";

/**
 * Fans every event out to several providers.
 *
 * Two destinations now run side by side — Vercel for the built-in dashboard,
 * GTM for GA4 — and the rest of the app still installs exactly one provider.
 * A throw from one destination must not cost the others their event, so each
 * call is isolated; a third-party script that fails is a reporting problem, not
 * a reason for a game to stop.
 */
export class CompositeAnalyticsProvider implements AnalyticsProvider {
  readonly name: string;

  constructor(private readonly providers: AnalyticsProvider[]) {
    this.name = `composite(${providers.map((p) => p.name).join(",")})`;
  }

  track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]): void {
    for (const provider of this.providers) {
      try {
        provider.track(event, properties);
      } catch {
        // Swallowed deliberately: see the class comment.
      }
    }
  }

  identify(playerId: string, traits?: Record<string, unknown>): void {
    for (const provider of this.providers) {
      try {
        provider.identify?.(playerId, traits);
      } catch {
        // As above.
      }
    }
  }

  page(path: string): void {
    for (const provider of this.providers) {
      try {
        provider.page?.(path);
      } catch {
        // As above.
      }
    }
  }
}
