"use client";

import { useCallback } from "react";
import { vibrate, type HapticPattern } from "@/lib/haptics";
import { usePlayer } from "@/providers/player/player-context";

/** Fires device haptics when the player has them enabled. */
export function useHaptics() {
  const { settings } = usePlayer();
  return useCallback(
    (pattern: HapticPattern) => {
      vibrate(pattern, settings.haptics);
    },
    [settings.haptics],
  );
}
