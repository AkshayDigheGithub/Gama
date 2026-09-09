import type { AnalyticsProvider } from "@/lib/analytics/types";

/** Production default until a real analytics vendor is wired up. */
export class NoopAnalyticsProvider implements AnalyticsProvider {
  readonly name = "noop";
  track(): void {}
  identify(): void {}
  page(): void {}
}
