"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { LeaderboardRow } from "./leaderboard-row";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackEvent } from "@/lib/analytics";
import { BOARD_IDS, type BoardId } from "@/lib/leaderboard/types";
import { GAMES } from "@/lib/games";
import { useLeaderboard } from "@/hooks/use-leaderboard";

/** Short enough that all four fit a small phone without scrolling. */
const BOARD_LABEL: Record<BoardId, string> = {
  overall: "Overall",
  reaction: GAMES.reaction.name,
  "crowd-pick": "Crowd",
  memory: GAMES.memory.name,
  chain: GAMES.chain.name,
  rush: GAMES.rush.name,
  ascent: GAMES.ascent.name,
};

export function LeaderboardBoard({ limit = 10 }: { limit?: number }) {
  const [board, setBoard] = useState<BoardId>("overall");
  const { page, loading } = useLeaderboard(board, limit);
  const reduced = useReducedMotion();

  useEffect(() => {
    trackEvent("leaderboard_view", { board });
  }, [board]);

  const you = page?.you ?? null;
  const youInTop = you !== null && page?.entries.some((entry) => entry.isYou);

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={board} onValueChange={(value) => setBoard(value as BoardId)}>
        <TabsList>
          {BOARD_IDS.map((id) => (
            <TabsTrigger key={id} value={id}>
              {BOARD_LABEL[id]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-1.5" aria-busy={loading}>
        {loading || !page ? (
          Array.from({ length: Math.min(limit, 8) }).map((_, index) => (
            <div key={index} className="h-[3.25rem] animate-pulse rounded-xl bg-surface-2/40" aria-hidden />
          ))
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {page.entries.map((entry, index) => (
              <m.div
                key={`${board}-${entry.playerId}`}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={{ duration: 0.25, delay: reduced ? 0 : Math.min(index * 0.025, 0.25) }}
              >
                <LeaderboardRow entry={entry} />
              </m.div>
            ))}
          </AnimatePresence>
        )}

        {!loading && you && !youInTop ? (
          <>
            <div className="py-1 text-center text-xs text-ink-faint">···</div>
            <LeaderboardRow entry={you} />
          </>
        ) : null}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-line bg-surface/50 px-3.5 py-3 text-[0.6875rem] leading-relaxed text-ink-faint">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <p>
          <Badge variant="neutral" className="mr-1.5 align-middle">
            Demo board
          </Badge>
          Every name except yours is generated for this MVP — they are not real players. Your row
          comes from scores stored in this browser and is not verified. The board is deterministic
          for {page?.generatedFor ?? "today"} and refreshes daily.
        </p>
      </div>
    </div>
  );
}
