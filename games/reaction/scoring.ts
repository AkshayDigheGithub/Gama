import { estimateFasterThan, estimatePerformance } from "@/lib/scoring/percentile";
import { formatMs } from "@/lib/utils";
import type { GameResult } from "@/types";
import type { ReactionSummary } from "./engine";

export function toGameResult(summary: ReactionSummary): GameResult {
  return {
    game: "reaction",
    score: summary.score,
    performance: estimatePerformance("reaction", summary.score),
    stats: [
      { label: "Average", value: summary.averageMs === null ? "—" : formatMs(summary.averageMs) },
      { label: "Fastest", value: summary.bestMs === null ? "—" : formatMs(summary.bestMs) },
    ],
    detail: {
      fasterThan: summary.averageMs === null ? 0 : estimateFasterThan(summary.averageMs),
      fouls: summary.fouls,
    },
  };
}
