import { randomInt, type Rng } from "@/lib/rng";

export const REACTION_ROUNDS = 5;
/** Wait window before the flip. Wide enough that the flip can't be timed. */
export const MIN_WAIT_MS = 1000;
export const MAX_WAIT_MS = 3400;
/** Anything at or beyond this scores nothing — also the value used for a foul. */
export const SLOW_MS = 600;

export interface ReactionRound {
  index: number;
  ms: number;
  /** True when the player tapped before the flip. */
  foul: boolean;
}

export interface ReactionSummary {
  score: number;
  bestMs: number | null;
  averageMs: number | null;
  fouls: number;
  rounds: ReactionRound[];
}

export function nextWait(rng: Rng): number {
  return randomInt(rng, MIN_WAIT_MS, MAX_WAIT_MS);
}

/**
 * A round is worth four points per millisecond saved against a 600 ms floor,
 * so a 143 ms tap pays 1,828 and a sluggish 600 ms pays nothing. Five rounds
 * put a strong run a little under 10,000.
 */
export function scoreRound(round: ReactionRound): number {
  if (round.foul) return 0;
  return Math.max(0, Math.round((SLOW_MS - round.ms) * 4));
}

export function summarize(rounds: ReactionRound[]): ReactionSummary {
  const valid = rounds.filter((round) => !round.foul);
  const score = rounds.reduce((total, round) => total + scoreRound(round), 0);
  return {
    score,
    bestMs: valid.length ? Math.min(...valid.map((r) => r.ms)) : null,
    averageMs: valid.length
      ? Math.round(valid.reduce((total, r) => total + r.ms, 0) / valid.length)
      : null,
    fouls: rounds.length - valid.length,
    rounds,
  };
}
