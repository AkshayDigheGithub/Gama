import { MISTAKE_PENALTY_MS } from "./engine";

/**
 * Points for clearing a level: a flat climb per level plus a bank-your-time
 * bonus, so playing fast is always worth more than playing safe.
 */
export function levelClearPoints(level: number, remainingMs: number): number {
  const base = 400 + 200 * level;
  const timeBonus = Math.max(0, Math.floor(remainingMs / 1000)) * 15;
  return base + timeBonus;
}

export const MISTAKE_POINT_PENALTY = 150;

export function finalMemoryScore(bankedPoints: number, mistakes: number): number {
  return Math.max(0, bankedPoints - mistakes * MISTAKE_POINT_PENALTY);
}

export { MISTAKE_PENALTY_MS };
