import { estimatePerformance } from "@/lib/scoring/percentile";
import { formatNumber } from "@/lib/utils";
import type { GameResult } from "@/types";
import { finalScore, type AscentState } from "./engine";

export const metresOf = (height: number): number => Math.round(height / 10);

export function toGameResult(state: AscentState): GameResult {
  const score = finalScore(state);
  return {
    game: "ascent",
    score,
    performance: estimatePerformance("ascent", score),
    stats: [
      { label: "Height", value: `${formatNumber(metresOf(state.maxHeight))} m` },
      { label: "Jumps", value: formatNumber(state.jumps) },
    ],
    detail: {
      metres: metresOf(state.maxHeight),
      jumps: state.jumps,
      cleanLandings: state.cleanLandings,
      elapsedMs: Math.round(state.elapsedMs),
      endedBy: state.cause ?? "none",
    },
  };
}
