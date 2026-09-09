import { createRng } from "@/lib/rng";
import { clamp } from "@/lib/utils";

export const MIN_PICK = 1;
export const MAX_PICK = 100;
export const CROWD_SIZE = 5000;

export interface CrowdNumber {
  value: number;
  count: number;
}

export interface CrowdModel {
  /** `counts[n]` for n in 1..100. Index 0 is unused. */
  counts: number[];
  total: number;
  size: number;
  /** Most-picked numbers, descending. */
  top: CrowdNumber[];
}

export interface PickEvaluation {
  pick: number;
  count: number;
  /** 0–100. 100 means nothing in the crowd is rarer than your number. */
  uniqueness: number;
  /** 1 = rarest number on the board. */
  rarityRank: number;
  share: number;
}

/**
 * How people actually choose "a random number" between 1 and 100.
 *
 * The weights below encode well-known biases: a strong pull towards numbers
 * ending in 7, a dislike of round numbers and of the extremes, a bulge in the
 * middle third, and a handful of cultural favourites. This is a model of a
 * crowd — it is NOT a record of real players, and every screen says so.
 */
function pickWeight(n: number): number {
  let w = 1;

  // Middle third feels "more random" to most people.
  w *= 1 + 0.9 * Math.exp(-((n - 55) ** 2) / (2 * 22 ** 2));

  // Odd numbers read as less deliberate than even ones.
  if (n % 2 === 1) w *= 1.25;

  // Round numbers feel like a cop-out.
  if (n % 10 === 0) w *= 0.45;
  if (n % 5 === 0) w *= 0.75;

  // The seven bias — the single strongest effect in this kind of task.
  if (n % 10 === 7) w *= 2.3;

  // Edges feel like cheating, so people avoid them...
  if (n <= 5 || n >= 96) w *= 0.5;
  // ...except for the two endpoints, which attract contrarians.
  if (n === 1 || n === 100) w *= 2.2;

  // Cultural favourites.
  const spikes: Record<number, number> = { 7: 1.6, 13: 1.35, 37: 1.8, 42: 1.9, 69: 2.1, 73: 1.5, 77: 1.4, 99: 1.5 };
  w *= spikes[n] ?? 1;

  return w;
}

const WEIGHTS: number[] = (() => {
  const out = new Array<number>(MAX_PICK + 1).fill(0);
  for (let n = MIN_PICK; n <= MAX_PICK; n += 1) out[n] = pickWeight(n);
  return out;
})();

/** Deterministic for a seed: the same round always faces the same crowd. */
export function simulateCrowd(seed: string, size = CROWD_SIZE): CrowdModel {
  const rng = createRng(`one-more-crowd:${seed}`);
  const weightTotal = WEIGHTS.reduce((sum, w) => sum + w, 0);

  const counts = new Array<number>(MAX_PICK + 1).fill(0);
  let total = 0;

  for (let n = MIN_PICK; n <= MAX_PICK; n += 1) {
    const expected = (WEIGHTS[n] / weightTotal) * size;
    // Organic jitter around the expectation, so the board never looks computed.
    const jitter = 0.72 + rng() * 0.56;
    const count = Math.max(0, Math.round(expected * jitter));
    counts[n] = count;
    total += count;
  }

  const top = counts
    .map((count, value) => ({ value, count }))
    .slice(MIN_PICK)
    .sort((a, b) => b.count - a.count || a.value - b.value);

  return { counts, total, size, top };
}

export function evaluatePick(model: CrowdModel, pick: number): PickEvaluation {
  const value = clamp(Math.round(pick), MIN_PICK, MAX_PICK);
  const count = model.counts[value];

  let rarer = 0;
  for (let n = MIN_PICK; n <= MAX_PICK; n += 1) {
    if (n !== value && model.counts[n] > count) rarer += 1;
  }

  return {
    pick: value,
    count,
    // Share of the other 99 numbers that were picked *more* than yours.
    uniqueness: Math.round((rarer / (MAX_PICK - 1)) * 100),
    rarityRank: MAX_PICK - rarer,
    share: model.total > 0 ? count / model.total : 0,
  };
}

/** Uniqueness is 0–100; the leaderboard wants the same scale as other games. */
export function crowdScore(evaluation: PickEvaluation): number {
  return evaluation.uniqueness * 100;
}
