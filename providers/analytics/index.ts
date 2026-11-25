import type { AnalyticsProvider } from "@/lib/analytics/types";
import { CompositeAnalyticsProvider } from "./composite-analytics-provider";
import { ConsoleAnalyticsProvider } from "./console-analytics-provider";
import { GtmAnalyticsProvider } from "./gtm-analytics-provider";
import { NoopAnalyticsProvider } from "./noop-analytics-provider";
import { VercelAnalyticsProvider } from "./vercel-analytics-provider";

export {
  CompositeAnalyticsProvider,
  ConsoleAnalyticsProvider,
  GtmAnalyticsProvider,
  NoopAnalyticsProvider,
  VercelAnalyticsProvider,
};

/** Whether the GTM container was rendered by the server for this request. */
export interface AnalyticsEnvironment {
  gtm: boolean;
}

/**
 * Chooses the provider for this build.
 *
 * Production sends the event vocabulary to Vercel Web Analytics, which is
 * already collecting pageviews through `<Analytics />` in the root layout, and
 * — wherever the container is actually loaded — to GTM's data layer, which is
 * what puts these events in GA4.
 *
 * `gtm` has to be passed in rather than read from `lib/gtm`: `IS_GTM_ENABLED`
 * depends on `VERCEL_ENV`, which exists only on the server, so a client bundle
 * evaluating it would always see `false`. The layout resolves it and threads it
 * down, which also keeps the two decisions — render the loader, send to the
 * data layer — reading from one value instead of two that can disagree.
 *
 * Development keeps printing to the console so the funnel stays visible locally
 * without putting test runs into the real dashboard.
 */
export function createAnalyticsProvider(env: AnalyticsEnvironment): AnalyticsProvider {
  if (process.env.NODE_ENV !== "production") return new ConsoleAnalyticsProvider();

  const providers: AnalyticsProvider[] = [new VercelAnalyticsProvider()];
  if (env.gtm) providers.push(new GtmAnalyticsProvider());

  return providers.length === 1 ? providers[0] : new CompositeAnalyticsProvider(providers);
}
