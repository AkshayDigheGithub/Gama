import type { AnalyticsProvider } from "@/lib/analytics/types";
import { ConsoleAnalyticsProvider } from "./console-analytics-provider";
import { NoopAnalyticsProvider } from "./noop-analytics-provider";

export { ConsoleAnalyticsProvider, NoopAnalyticsProvider };

/**
 * Chooses the provider for this build. A future `ApiAnalyticsProvider` or
 * `PostHogAnalyticsProvider` slots in here and nowhere else.
 */
export function createAnalyticsProvider(): AnalyticsProvider {
  return process.env.NODE_ENV === "production"
    ? new NoopAnalyticsProvider()
    : new ConsoleAnalyticsProvider();
}
