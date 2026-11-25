"use client";

import { useEffect, type ReactNode } from "react";
import { setAudioProvider, setSoundEnabled, unlockAudio } from "@/lib/audio";
import { usePlayer } from "@/providers/player/player-context";
import { createAudioProvider } from "./index";

/** Gestures a browser accepts as "the user is here and interacting". */
const GESTURES = ["pointerdown", "keydown", "touchstart"] as const;

/**
 * Installs the audio provider once and keeps it in step with the player's
 * mute setting. Renders nothing — sound is a side effect, not UI.
 *
 * The listeners below are the whole reason this is a provider rather than a
 * module: no browser will start audio before a user gesture, and the first
 * gesture can happen anywhere (tapping Start, pressing space on the home page),
 * so something mounted above every game has to notice it.
 */
export function AudioContextProvider({ children }: { children: ReactNode }) {
  const { settings } = usePlayer();

  useEffect(() => {
    setAudioProvider(createAudioProvider());
    return () => setAudioProvider(null);
  }, []);

  useEffect(() => {
    // `unlock` also resumes a context the browser suspended while the tab was
    // in the background, so these stay attached for the session instead of
    // removing themselves after the first gesture.
    const onGesture = () => unlockAudio();
    for (const type of GESTURES) {
      window.addEventListener(type, onGesture, { passive: true });
    }
    return () => {
      for (const type of GESTURES) window.removeEventListener(type, onGesture);
    };
  }, []);

  // One boolean, mirrored out of player settings so that game loops can call
  // `playSound` without reading React state on a hot path.
  useEffect(() => {
    setSoundEnabled(settings.sound);
  }, [settings.sound]);

  return <>{children}</>;
}
