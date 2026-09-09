"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { GameMode } from "@/lib/analytics";
import { parseVersusParams } from "@/lib/challenge/encode";
import type { ParsedChallenge } from "@/lib/challenge/types";
import type { GameId } from "@/types";

export interface GameParams {
  mode: GameMode;
  /** The score to beat, when arriving from a challenge link. */
  challenge: ParsedChallenge | null;
}

/**
 * Reads the (untrusted) query string a game was opened with. Everything is
 * validated in `parseVersusParams`; unknown values fall back to a free run.
 */
export function useGameParams(game: GameId): GameParams {
  const params = useSearchParams();

  return useMemo(() => {
    const challenge = parseVersusParams(params, game);
    const rawMode = params.get("mode");
    const mode: GameMode = challenge ? "challenge" : rawMode === "daily" ? "daily" : "free";
    return { mode, challenge };
  }, [params, game]);
}
