"use client";

import { useCallback, useEffect, useState } from "react";
import { getLeaderboardProvider } from "@/providers/leaderboard";
import type { BoardId, LeaderboardPage } from "@/lib/leaderboard/types";
import { usePlayer } from "@/providers/player/player-context";

/**
 * Reads a board through the provider seam. The `await` is pointless against
 * the local provider and essential against a networked one — keeping it here
 * means the UI already handles loading states when v2 arrives.
 */
export function useLeaderboard(board: BoardId, limit = 10) {
  const { hydrated, bestScores, username } = usePlayer();
  const [page, setPage] = useState<LeaderboardPage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const provider = getLeaderboardProvider();
    const next = await provider.getLeaderboard(board, { limit });
    setPage(next);
    setLoading(false);
  }, [board, limit]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void (async () => {
      const provider = getLeaderboardProvider();
      const next = await provider.getLeaderboard(board, { limit });
      if (!cancelled) {
        setPage(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-reads when the player's bests or name change, so a fresh run moves
    // their row immediately.
  }, [board, limit, hydrated, bestScores, username]);

  return { page, loading, reload: load };
}
