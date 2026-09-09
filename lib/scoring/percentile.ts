import { clamp } from "@/lib/utils";
import type { GameId } from "@/types";

/**
 * Estimated performance, from a *fixed benchmark curve*.
 *
 * There is no server and no player population in the MVP, so these numbers are
 * modelled — a normal curve per game, tuned during playtesting — not measured.
 * Every surface that shows them says so.
 */
const BENCHMARKS: Record<GameId, { mean: number; sd: number }> = {
  reaction: { mean: 6200, sd: 1700 },
  "crowd-pick": { mean: 5400, sd: 2300 },
  memory: { mean: 4200, sd: 2500 },
  chain: { mean: 7000, sd: 4000 },
};

/** Abramowitz & Stegun 7.1.26 — plenty accurate for a progress ring. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(x: number, mean: number, sd: number): number {
  if (sd <= 0) return x >= mean ? 1 : 0;
  return 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)));
}

/** 1–99. Never 0 or 100: an estimate should not claim certainty. */
export function estimatePerformance(game: GameId, score: number): number {
  const { mean, sd } = BENCHMARKS[game];
  return clamp(Math.round(normalCdf(score, mean, sd) * 100), 1, 99);
}

/** Reaction-specific: share of the benchmark curve slower than `ms`. */
export function estimateFasterThan(ms: number): number {
  return clamp(Math.round((1 - normalCdf(ms, 285, 62)) * 100), 1, 99);
}

export const BENCHMARK_NOTE =
  "Estimated against a fixed benchmark curve, not a live player population.";
