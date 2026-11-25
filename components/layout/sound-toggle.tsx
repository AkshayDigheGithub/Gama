"use client";

import { Volume2, VolumeX } from "lucide-react";
import { playSound } from "@/lib/audio";
import { usePlayer } from "@/providers/player/player-context";

/**
 * Mute, one tap from anywhere.
 *
 * Sound ships on (see `DEFAULT_SETTINGS`), so the control that turns it off has
 * to be visible rather than buried in the profile dialog — somebody playing on
 * a train needs it before they need anything else on this header.
 */
export function SoundToggle() {
  const { settings, updateSettings, hydrated } = usePlayer();
  const on = settings.sound;

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Mute sound effects" : "Unmute sound effects"}
      title={on ? "Mute sound effects" : "Unmute sound effects"}
      onClick={() => {
        updateSettings({ sound: !on });
        // Turning it on is the one case where a sound is the clearest possible
        // confirmation. The click itself is the gesture that unlocks audio, so
        // this is also the earliest a tone can be heard at all.
        if (!on) playSound("hit");
      }}
      className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-pill)] border border-line bg-surface/70 text-ink-dim transition-colors hover:text-ink"
    >
      {hydrated && !on ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  );
}
