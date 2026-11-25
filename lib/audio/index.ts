import type { SoundName } from "./sounds";
import type { AudioProvider } from "./types";

export type { AudioProvider } from "./types";
export { SOUNDS, type SoundName, type ToneStep } from "./sounds";

let provider: AudioProvider | null = null;
let enabled = false;

/** Installed once at app start. */
export function setAudioProvider(next: AudioProvider | null): void {
  if (provider && provider !== next) provider.dispose?.();
  provider = next;
}

export function getAudioProvider(): AudioProvider | null {
  return provider;
}

/**
 * Mirrors the player's `sound` setting. Starts `false` so that a muted player
 * never hears a tone fired in the gap before the setting has been read out of
 * localStorage.
 */
export function setSoundEnabled(next: boolean): void {
  enabled = next;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

/**
 * Module-level entry point so plain game logic can make a noise without being
 * dragged into React context — the same reason `trackEvent` is shaped this way.
 *
 * Unlike analytics there is deliberately no queue for sounds fired before the
 * provider exists. A replayed event is still true; a replayed sound is a sound
 * at the wrong moment, which is worse than silence.
 */
export function playSound(sound: SoundName): void {
  if (!enabled || !provider) return;
  provider.play(sound);
}

/** Called from the first user gesture; see `AudioProvider.unlock`. */
export function unlockAudio(): void {
  provider?.unlock();
}
