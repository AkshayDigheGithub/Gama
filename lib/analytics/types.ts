import type { AnalyticsEventMap, AnalyticsEventName } from "./events";

/**
 * The seam between the app and whatever measures it.
 *
 * Nothing in the UI imports a vendor SDK; it calls `trackEvent`. Swapping in
 * PostHog, GA or a self-hosted collector later means writing one class that
 * satisfies this interface and registering it — no component changes.
 */
export interface AnalyticsProvider {
  readonly name: string;
  track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]): void;
  /** Attach an anonymous local player id to subsequent events. */
  identify?(playerId: string, traits?: Record<string, unknown>): void;
  page?(path: string): void;
}
