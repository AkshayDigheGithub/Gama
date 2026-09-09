/**
 * Guarded localStorage access.
 *
 * Handles the four ways `localStorage` bites you in a browser game:
 *   1. server rendering (no `window`),
 *   2. Safari private mode / storage disabled (throws on access *and* on set),
 *   3. quota exceeded,
 *   4. values corrupted by hand or by an older build.
 */

let availability: boolean | null = null;

export function isStorageAvailable(): boolean {
  if (availability !== null) return availability;
  if (typeof window === "undefined") return false;
  try {
    const probe = "__one_more_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    availability = true;
  } catch {
    availability = false;
  }
  return availability;
}

export function readRaw(key: string): string | null {
  if (!isStorageAvailable()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string): boolean {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    // Quota exceeded or storage revoked mid-session. Gameplay continues from
    // in-memory state; we simply stop persisting.
    return false;
  }
}

export function removeRaw(key: string): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Never throws — corrupted JSON simply reads as `null`. */
export function parseJson(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
