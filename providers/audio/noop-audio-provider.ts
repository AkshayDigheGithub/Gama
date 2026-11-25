import type { AudioProvider } from "@/lib/audio/types";

/**
 * Stands in where Web Audio does not exist. Having a provider that does
 * nothing, rather than leaving the seam empty, keeps `playSound` on one code
 * path everywhere.
 */
export class NoopAudioProvider implements AudioProvider {
  readonly name = "noop";
  play(): void {}
  unlock(): void {}
}
