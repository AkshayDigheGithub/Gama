import { estimatePerformance } from "@/lib/scoring/percentile";
import { formatNumber } from "@/lib/utils";
import type { GameResult } from "@/types";
import { finalScore, type RushState } from "./engine";

/** World units are small; metres read better on a scoreboard. */
export const metresOf = (distance: number): number => Math.round(distance / 10);

export function toGameResult(state: RushState): GameResult {
  const score = finalScore(state);
  return {
    game: "rush",
    score,
    performance: estimatePerformance("rush", score),
    stats: [
      { label: "Distance", value: `${formatNumber(metresOf(state.distance))} m` },
      { label: "Orbs", value: formatNumber(state.orbsTaken) },
    ],
    detail: {
      metres: metresOf(state.distance),
      orbs: state.orbsTaken,
      nearMisses: state.nearMisses,
      bestMultiplier: Math.round(state.bestMultiplier * 100) / 100,
      topSpeed: Math.round(state.speed),
    },
  };
}
