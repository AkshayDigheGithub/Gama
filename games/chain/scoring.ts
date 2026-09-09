import { estimatePerformance } from "@/lib/scoring/percentile";
import { formatNumber } from "@/lib/utils";
import type { GameResult } from "@/types";

export interface ChainSummary {
  score: number;
  chains: number;
  longestChain: number;
  tilesCleared: number;
  bestCombo: number;
  bestChainPoints: number;
}

export function toGameResult(summary: ChainSummary): GameResult {
  return {
    game: "chain",
    score: summary.score,
    performance: estimatePerformance("chain", summary.score),
    stats: [
      { label: "Longest", value: `${summary.longestChain}` },
      { label: "Chains", value: formatNumber(summary.chains) },
    ],
    detail: {
      chains: summary.chains,
      longestChain: summary.longestChain,
      tilesCleared: summary.tilesCleared,
      bestCombo: summary.bestCombo,
      bestChainPoints: summary.bestChainPoints,
    },
  };
}
