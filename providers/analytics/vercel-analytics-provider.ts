import { track } from "@vercel/analytics";
import type { AnalyticsProvider } from "@/lib/analytics/types";
import type { AnalyticsEventMap, AnalyticsEventName } from "@/lib/analytics/events";

/** What Vercel accepts as a custom-event property value. */
type AllowedValue = string | number | boolean | null;

/**
 * Vercel rejects an event whose properties are not flat scalars, and it drops
 * the whole event rather than the offending key. The event map already types
 * every payload as flat, but game logic computes these values at runtime, so a
 * stray NaN or object would silently cost us the event. Filtering here keeps a
 * bad value from taking the rest of the payload with it.
 */
function toProperties(properties: Record<string, unknown>): Record<string, AllowedValue> {
  const clean: Record<string, AllowedValue> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
      clean[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      // Vercel stores numbers as-is; rounding keeps score/duration buckets readable.
      clean[key] = Math.round(value);
    }
  }
  return clean;
}

/**
 * Sends the existing event vocabulary to Vercel Web Analytics.
 *
 * Pageviews are deliberately NOT sent from here: `<Analytics />` in the root
 * layout already reports every route change, so implementing `page()` would
 * double every pageview in the dashboard.
 */
export class VercelAnalyticsProvider implements AnalyticsProvider {
  readonly name = "vercel";

  track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]): void {
    track(event, toProperties(properties));
  }

  /**
   * Intentionally a no-op. The anonymous player id is per-browser and unbounded,
   * and Vercel aggregates custom events by property value — attaching it would
   * turn every event into a near-unique row and tell us nothing. The id stays in
   * local storage where the rest of the player state lives.
   */
  identify(): void {}
}
