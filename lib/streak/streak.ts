import { addDays, daysBetween, type DateKey } from "@/lib/daily/date-key";
import type { StreakState } from "@/types";

/**
 * Streak rules.
 *
 * A day is credited only when a game is actually *completed*, at most once per
 * calendar day. Reloading the page, opening a game or replaying does nothing.
 * Two guards stop the obvious cheat of moving the device clock:
 *
 *   - a stored date in the future relative to "today" is refused, and
 *   - `lastCreditedAt` is monotonic: a credit whose wall clock is earlier than
 *     the previous credit is refused.
 *
 * These are deterrents, not security — like every score here, the streak lives
 * in the player's own browser.
 */
export function creditStreak(prev: StreakState, todayKey: DateKey, now: number): StreakState {
  if (prev.lastPlayedDate === todayKey) return prev;
  if (prev.lastCreditedAt !== null && now < prev.lastCreditedAt) return prev;
  if (prev.lastPlayedDate !== null && daysBetween(prev.lastPlayedDate, todayKey) < 0) return prev;

  const continued = prev.lastPlayedDate !== null && daysBetween(prev.lastPlayedDate, todayKey) === 1;
  const currentStreak = continued ? prev.currentStreak + 1 : 1;

  return {
    lastPlayedDate: todayKey,
    currentStreak,
    longestStreak: Math.max(prev.longestStreak, currentStreak),
    lastCreditedAt: now,
  };
}

/** The streak as it should be *displayed* — a stale streak reads as broken. */
export function liveStreak(state: StreakState, todayKey: DateKey): number {
  if (!state.lastPlayedDate) return 0;
  const gap = daysBetween(state.lastPlayedDate, todayKey);
  if (gap < 0 || gap > 1) return 0;
  return state.currentStreak;
}

export function playedToday(state: StreakState, todayKey: DateKey): boolean {
  return state.lastPlayedDate === todayKey;
}

/** Date keys covered by the current unbroken run, oldest first. */
export function streakDays(state: StreakState): DateKey[] {
  if (!state.lastPlayedDate || state.currentStreak <= 0) return [];
  return Array.from({ length: state.currentStreak }, (_, i) =>
    addDays(state.lastPlayedDate as DateKey, i - (state.currentStreak - 1)),
  );
}
