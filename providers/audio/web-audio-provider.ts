import { SOUNDS, type SoundName } from "@/lib/audio/sounds";
import type { AudioProvider } from "@/lib/audio/types";

/** Everything is mixed through this, so one number turns the app down. */
const MASTER_GAIN = 0.5;

/**
 * Safari still only exposes the prefixed constructor. Narrowed with a cast
 * rather than a global declaration, matching how `GtmAnalyticsProvider`
 * reaches `window.dataLayer`.
 */
export function audioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Synthesizes the sound vocabulary with the Web Audio API.
 *
 * The expensive part of playing a sound here is creating the `AudioContext`,
 * and that happens once, in `unlock`, off the back of a user gesture. After
 * that `play` only allocates a few oscillator nodes and hands them start/stop
 * times — the browser's audio thread does the work, so a sound costs the
 * animation frame that triggered it almost nothing. That matters: these games
 * are canvas loops whose scores are measured in milliseconds.
 */
export class WebAudioProvider implements AudioProvider {
  readonly name = "web-audio";

  private context: AudioContext | null = null;
  private master: GainNode | null = null;

  /**
   * Builds the context, or resumes one the browser suspended (Safari suspends
   * on backgrounding, so this runs on every gesture, not just the first).
   */
  unlock(): void {
    if (typeof window === "undefined") return;
    try {
      if (!this.context) {
        const Ctor = audioContextCtor();
        if (!Ctor) return;
        this.context = new Ctor();
        this.master = this.context.createGain();
        this.master.gain.value = MASTER_GAIN;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") void this.context.resume();
    } catch {
      /* ignore — sound is a nicety, never a dependency */
    }
  }

  play(sound: SoundName): void {
    const context = this.context;
    const master = this.master;
    // No gesture yet, or the tab is suspended. Staying silent is correct: the
    // browser would refuse anyway, and queueing would fire it out of time.
    if (!context || !master || context.state !== "running") return;

    try {
      const now = context.currentTime;
      for (const step of SOUNDS[sound]) {
        const startAt = now + step.startMs / 1000;
        const endAt = startAt + step.durationMs / 1000;

        const oscillator = context.createOscillator();
        oscillator.type = step.type;
        oscillator.frequency.setValueAtTime(step.frequency, startAt);
        if (step.endFrequency !== undefined) {
          oscillator.frequency.exponentialRampToValueAtTime(step.endFrequency, endAt);
        }

        // A 2ms attack instead of an instant one: starting a gain at full
        // volume produces an audible click on top of the intended sound.
        const gain = context.createGain();
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(step.gain, startAt + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(startAt);
        oscillator.stop(endAt);
        // Nodes are single-use; dropping the references here lets them be
        // collected as soon as they have finished rather than piling up over a
        // run that fires hundreds of ticks.
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
      }
    } catch {
      /* ignore */
    }
  }

  dispose(): void {
    try {
      void this.context?.close();
    } catch {
      /* ignore */
    }
    this.context = null;
    this.master = null;
  }
}
