import type { AnalyticsEventMap, AnalyticsEventName } from "./events";
import type { AnalyticsProvider } from "./types";

export type { AnalyticsProvider } from "./types";
export type { AnalyticsEventMap, AnalyticsEventName, GameMode, ShareSurface } from "./events";

let provider: AnalyticsProvider | null = null;
const queue: Array<() => void> = [];

/** Installed once at app start; events fired before that are replayed. */
export function setAnalyticsProvider(next: AnalyticsProvider): void {
  provider = next;
  while (queue.length) queue.shift()?.();
}

export function getAnalyticsProvider(): AnalyticsProvider | null {
  return provider;
}

/**
 * Module-level entry point so plain game logic can emit events without being
 * dragged into React context.
 */
export function trackEvent<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEventMap[E],
): void {
  const run = () => provider?.track(event, properties);
  if (provider) run();
  else if (queue.length < 50) queue.push(run);
}

export function identifyPlayer(playerId: string, traits?: Record<string, unknown>): void {
  const run = () => provider?.identify?.(playerId, traits);
  if (provider) run();
  else if (queue.length < 50) queue.push(run);
}

export function trackPage(path: string): void {
  provider?.page?.(path);
}
