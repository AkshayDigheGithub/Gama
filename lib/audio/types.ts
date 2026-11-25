import type { SoundName } from "./sounds";

/**
 * The seam between the app and whatever makes noise.
 *
 * Nothing in the UI touches `AudioContext`; it calls `playSound`. Swapping the
 * synthesized tones for sampled files, or routing through a game-audio library,
 * means writing one class that satisfies this interface and registering it —
 * no component changes.
 */
export interface AudioProvider {
  readonly name: string;
  /**
   * Must return immediately and must never throw: call sites are canvas loops
   * and pointer handlers that cannot afford to care whether audio worked.
   */
  play(sound: SoundName): void;
  /**
   * Called from a real user gesture. Browsers refuse to start audio before
   * one, so this is where a provider is allowed to build its machinery.
   */
  unlock(): void;
  dispose?(): void;
}
