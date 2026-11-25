import type { AnalyticsProvider } from "@/lib/analytics/types";
import { ConsoleAnalyticsProvider } from "./console-analytics-provider";
import { NoopAnalyticsProvider } from "./noop-analytics-provider";
import { VercelAnalyticsProvider } from "./vercel-analytics-provider";

export { ConsoleAnalyticsProvider, NoopAnalyticsProvider, VercelAnalyticsProvider };

/**
 * Chooses the provider for this build. A future `PostHogAnalyticsProvider`
 * slots in here and nowhere else.
 *
 * Production sends the event vocabulary to Vercel Web Analytics, which is
 * already collecting pageviews through `<Analytics />` in the root layout.
 * Development keeps printing to the console so the funnel stays visible
 * locally without putting test runs into the real dashboard.
 */
export function createAnalyticsProvider(): AnalyticsProvider {
  return process.env.NODE_ENV === "production"
    ? new VercelAnalyticsProvider()
    : new ConsoleAnalyticsProvider();
}
