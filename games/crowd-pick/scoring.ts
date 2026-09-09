import { estimatePerformance } from "@/lib/scoring/percentile";
import { formatNumber } from "@/lib/utils";
import type { GameResult } from "@/types";
import { crowdScore, type PickEvaluation } from "./crowd";

export function toGameResult(evaluation: PickEvaluation): GameResult {
  const score = crowdScore(evaluation);
  return {
    game: "crowd-pick",
    score,
    performance: estimatePerformance("crowd-pick", score),
    stats: [
      { label: "Uniqueness", value: `${evaluation.uniqueness}/100` },
      { label: "Crowd picks", value: formatNumber(evaluation.count) },
    ],
    detail: {
      pick: evaluation.pick,
      count: evaluation.count,
      uniqueness: evaluation.uniqueness,
      rarityRank: evaluation.rarityRank,
    },
  };
}
