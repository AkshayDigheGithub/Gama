/**
 * The full sound vocabulary.
 *
 * Five names, chosen for what the player did rather than for what it sounds
 * like: a game asks for `hit`, not "rising two-tone blip". That keeps the
 * recipes below replaceable — retuning the whole app is editing this file, and
 * a future sample-based provider can honour the same five names.
 *
 * Every sound is a handful of short oscillator steps rather than an audio file:
 * no asset weight, no network request, and nothing to wait on inside a canvas
 * loop that is scored in milliseconds.
 */
export type SoundName = "tick" | "hit" | "miss" | "level" | "complete";

/** One oscillator with a fixed attack/decay envelope. */
export interface ToneStep {
  /** Offset from the moment the sound was asked for. */
  startMs: number;
  frequency: number;
  /** Glide target; omitted means a steady pitch. */
  endFrequency?: number;
  durationMs: number;
  /** Peak gain, pre master. Kept well under 0.1 — these play mid-game. */
  gain: number;
  type: OscillatorType;
}

/**
 * Everything is cut to tens of milliseconds. A sound that outlasts the action
 * that caused it stops reading as feedback and starts reading as music, and in
 * a game where runs are five taps long it would still be ringing over the next
 * one.
 */
export const SOUNDS: Record<SoundName, readonly ToneStep[]> = {
  // A dry click. Triangle rather than sine so the onset is audible at 18ms.
  tick: [{ startMs: 0, frequency: 1180, durationMs: 18, gain: 0.045, type: "triangle" }],

  // Up a fifth: the shortest interval that reads as "yes" without a melody.
  hit: [
    { startMs: 0, frequency: 660, durationMs: 45, gain: 0.06, type: "sine" },
    { startMs: 38, frequency: 988, durationMs: 55, gain: 0.055, type: "sine" },
  ],

  // Down and dirty. A falling sawtooth is unambiguous even at this volume.
  miss: [{ startMs: 0, frequency: 220, endFrequency: 110, durationMs: 120, gain: 0.05, type: "sawtooth" }],

  // Three rising notes — bigger than `hit`, still inside a tap's worth of time.
  level: [
    { startMs: 0, frequency: 660, durationMs: 50, gain: 0.05, type: "sine" },
    { startMs: 45, frequency: 880, durationMs: 50, gain: 0.05, type: "sine" },
    { startMs: 90, frequency: 1320, durationMs: 70, gain: 0.045, type: "sine" },
  ],

  // The one sound allowed past 200ms: it lands on the result screen, where
  // nothing else is competing for the player's attention.
  complete: [
    { startMs: 0, frequency: 523, durationMs: 80, gain: 0.055, type: "sine" },
    { startMs: 60, frequency: 784, durationMs: 80, gain: 0.055, type: "sine" },
    { startMs: 120, frequency: 1047, durationMs: 95, gain: 0.05, type: "sine" },
  ],
};
