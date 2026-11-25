"use client";

import type { ReactNode } from "react";
import { ServiceWorker } from "@/components/layout/service-worker";
import { AnalyticsContextProvider } from "./analytics/analytics-context";
import { AudioContextProvider } from "./audio/audio-context";
import { MotionProvider } from "./motion-provider";
import { PlayerContextProvider } from "./player/player-context";

/**
 * Every seam the app depends on, composed in one place.
 *
 * v2 adds an auth/session provider and swaps the local implementations behind
 * these same contexts; components keep importing `usePlayer()` and friends.
 */
export function AppProviders({
  children,
  gtmEnabled = false,
}: {
  children: ReactNode;
  /** Resolved on the server and threaded down; see `createAnalyticsProvider`. */
  gtmEnabled?: boolean;
}) {
  return (
    <AnalyticsContextProvider gtmEnabled={gtmEnabled}>
      <PlayerContextProvider>
        <ServiceWorker />
        {/* Inside the player provider: it mirrors the mute setting. */}
        <AudioContextProvider>
          <MotionProvider>{children}</MotionProvider>
        </AudioContextProvider>
      </PlayerContextProvider>
    </AnalyticsContextProvider>
  );
}
