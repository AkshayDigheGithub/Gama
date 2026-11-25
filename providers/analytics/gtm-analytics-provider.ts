import type { AnalyticsProvider } from "@/lib/analytics/types";
import type { AnalyticsEventMap, AnalyticsEventName } from "@/lib/analytics/events";

/**
 * What GTM's data layer is: a plain array the container drains. Declared
 * locally rather than globally so nothing else in the app is tempted to push
 * to it directly — the container's contract lives in this one file.
 */
type DataLayerEvent = Record<string, unknown> & { event: string };

/**
 * Pushes the event vocabulary into GTM's data layer, where the container turns
 * each one into a GA4 event.
 *
 * Nothing here knows about GA4. A `game_completed` push becomes a GA4 event
 * only once a tag in the container is pointed at it, which means new
 * measurement — a funnel, a conversion, a different destination entirely — is
 * configured in GTM instead of shipped as a deploy.
 */
export class GtmAnalyticsProvider implements AnalyticsProvider {
  readonly name = "gtm";

  /**
   * `w[l] = w[l] || []` is how GTM's own loader opens, so creating the array
   * here when it does not exist yet is safe: the loader adopts whatever is
   * already in it. That ordering matters, because this provider is installed
   * from an effect while the loader runs `afterInteractive`, and either can win.
   * Events pushed before the container arrives are replayed by it on load.
   */
  private get dataLayer(): DataLayerEvent[] | null {
    if (typeof window === "undefined") return null;
    const w = window as typeof window & { dataLayer?: DataLayerEvent[] };
    w.dataLayer ??= [];
    return w.dataLayer;
  }

  track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]): void {
    // Flat spread, not `{ event, properties }`: GTM variables read top-level
    // data layer keys, and a nested object would have to be unpacked by hand
    // in the container for every single event.
    this.dataLayer?.push({ event, ...properties });
  }

  /**
   * Intentionally absent: `page()`. GTM's built-in History Change trigger
   * already sees Next's client-side navigation, and the container's Page View
   * trigger covers the first load, so pushing route changes from here would
   * report every navigation twice.
   */
}
