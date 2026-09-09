"use client";

import { useCallback } from "react";
import { trackEvent, type GameMode } from "@/lib/analytics";
import { getDailyChallenge } from "@/lib/daily/daily";
import { dailySchema, trimDailyLog } from "@/lib/daily/schema";
import { toDateKey } from "@/lib/daily/date-key";
import type { RecordResultOutcome } from "@/lib/player/types";
import { getLeaderboardProvider } from "@/providers/leaderboard";
import { updateStore } from "@/lib/storage/store";
import { usePlayer } from "@/providers/player/player-context";
import type { GameId, GameResult } from "@/types";

export interface RunOutcome extends RecordResultOutcome {
  rank: number;
  total: number;
  /** Present when the run counted towards today's challenge. */
  dailyMet?: boolean;
}

/**
 * The single write path for a finished run.
 *
 * Stats, personal best, streak, leaderboard submission, daily-challenge state
 * and analytics all happen here, once, so no game screen has to remember the
 * whole ritual.
 */
export function useRunRecorder(game: GameId, mode: GameMode) {
  const { recordResult, player } = usePlayer();

  return useCallback(
    async (result: GameResult, durationMs: number): Promise<RunOutcome> => {
      const outcome = recordResult({ game, score: result.score });

      const submission = await getLeaderboardProvider().submitScore({
        game,
        playerId: player?.playerId ?? "local",
        username: player?.username ?? "You",
        score: result.score,
      });

      trackEvent("game_completed", { game, mode, score: result.score, durationMs });
      if (outcome.streakExtended) trackEvent("streak_extended", { streak: outcome.streak });

      let dailyMet: boolean | undefined;
      if (mode === "daily") {
        const date = toDateKey();
        const daily = getDailyChallenge(date);
        const met = result.score >= daily.goal;
        dailyMet = met;
        updateStore(dailySchema, (log) => {
          const previous = log[date];
          return trimDailyLog({
            ...log,
            [date]: {
              game: daily.game,
              goal: daily.goal,
              bestScore: Math.max(previous?.bestScore ?? 0, result.score),
              met: (previous?.met ?? false) || met,
              attempts: (previous?.attempts ?? 0) + 1,
            },
          });
        });
        trackEvent("daily_challenge_completed", {
          game: daily.game,
          date,
          score: result.score,
          goal: daily.goal,
          met,
        });
      }

      return { ...outcome, rank: submission.rank, total: submission.total, dailyMet };
    },
    [game, mode, player, recordResult],
  );
}
