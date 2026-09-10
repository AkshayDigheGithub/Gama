import { estimatePerformance } from "@/lib/scoring/percentile";
import { formatNumber } from "@/lib/utils";
import type { GameResult } from "@/types";
import { accuracy, finalScore, type SalvoState } from "./engine";

export function toGameResult(state: SalvoState): GameResult {
  const score = finalScore(state);
  return {
    game: "salvo",
    score,
    performance: estimatePerformance("salvo", score),
    stats: [
      { label: "Accuracy", value: `${accuracy(state)}%` },
      { label: "Targets", value: formatNumber(state.hits) },
    ],
    detail: {
      accuracy: accuracy(state),
      hits: state.hits,
      misses: state.misses,
      voidHits: state.voidHits,
      bestCombo: state.bestCombo,
      elapsedMs: Math.round(state.elapsedMs),
    },
  };
}
