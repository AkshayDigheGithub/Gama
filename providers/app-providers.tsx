"use client";

import type { ReactNode } from "react";
import { ServiceWorker } from "@/components/layout/service-worker";
import { AnalyticsContextProvider } from "./analytics/analytics-context";
import { MotionProvider } from "./motion-provider";
import { PlayerContextProvider } from "./player/player-context";

/**
 * Every seam the app depends on, composed in one place.
 *
 * v2 adds an auth/session provider and swaps the local implementations behind
 * these same contexts; components keep importing `usePlayer()` and friends.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AnalyticsContextProvider>
      <PlayerContextProvider>
        <ServiceWorker />
        <MotionProvider>{children}</MotionProvider>
      </PlayerContextProvider>
    </AnalyticsContextProvider>
  );
}
