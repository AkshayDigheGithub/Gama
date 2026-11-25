import type { AudioProvider } from "@/lib/audio/types";
import { NoopAudioProvider } from "./noop-audio-provider";
import { WebAudioProvider, audioContextCtor } from "./web-audio-provider";

export { NoopAudioProvider, WebAudioProvider };

/**
 * Chooses the provider for this browser.
 *
 * There is no environment split here, unlike analytics: a tone is the same
 * thing in development and in production, and silencing it locally would mean
 * shipping the one feature nobody had heard.
 */
export function createAudioProvider(): AudioProvider {
  return audioContextCtor() ? new WebAudioProvider() : new NoopAudioProvider();
}
