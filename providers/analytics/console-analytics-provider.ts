import type { AnalyticsProvider } from "@/lib/analytics/types";
import type { AnalyticsEventMap, AnalyticsEventName } from "@/lib/analytics/events";

/**
 * Development provider: prints every event so the funnel is visible while
 * building. Deliberately does not send anything anywhere.
 */
export class ConsoleAnalyticsProvider implements AnalyticsProvider {
  readonly name = "console";
  private playerId: string | null = null;

  track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]): void {
    console.info(
      `%c ONE MORE %c ${event}`,
      "background:#c9ff3b;color:#0a1000;border-radius:3px;font-weight:700",
      "color:#c9ff3b;font-weight:600",
      { ...properties, playerId: this.playerId },
    );
  }

  identify(playerId: string): void {
    this.playerId = playerId;
  }
}
