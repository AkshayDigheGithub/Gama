export type HapticPattern = "tap" | "success" | "error" | "level";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 12,
  success: [16, 40, 24],
  error: [34, 60, 34],
  level: [12, 30, 12, 30, 40],
};

/**
 * Best-effort haptics. `navigator.vibrate` exists on Android/Chrome and is a
 * silent no-op on iOS Safari, so this never needs a capability check beyond
 * "does the function exist".
 */
export function vibrate(pattern: HapticPattern, enabled = true): void {
  if (!enabled) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    /* ignore — vibration is a nicety, never a dependency */
  }
}
