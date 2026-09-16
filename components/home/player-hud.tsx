"use client";

import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
import { Flame, Gamepad2, Sparkles, Trophy } from "lucide-react";
import { ScoreCounter } from "@/components/game/score-counter";
import { GAME_LIST } from "@/lib/games";
import { usePlayer } from "@/providers/player/player-context";
import { GAME_IDS } from "@/types";

/**
 * The player's own HUD, above the fold.
 *
 * Everything here is already in local storage; the home page just never showed
 * it. Seeing your own run count, best score and streak counting up is what
 * turns a list of games into a save file worth adding to — and the numbers
 * animate on arrival because a number that moves reads as an event.
 */
export function PlayerHud() {
  const { hydrated, username, stats, bestScores, currentStreak, streak } = usePlayer();
  const reduced = useReducedMotion();

  if (!hydrated) {
    return (
      <div
        className="h-[5.5rem] animate-pulse rounded-[var(--radius-card)] border border-line bg-surface/40"
        aria-hidden
      />
    );
  }

  const topScore = Math.max(0, ...GAME_IDS.map((id) => bestScores[id] ?? 0));
  const tried = GAME_IDS.filter((id) => (bestScores[id] ?? 0) > 0).length;
  const fresh = stats.totalGames === 0;

  const tiles = [
    {
      key: "runs",
      icon: Gamepad2,
      label: "Runs played",
      value: stats.totalGames,
      hint: fresh ? "Your first is 20 seconds away" : `As ${username}`,
      tone: "text-ink",
    },
    {
      key: "best",
      icon: Trophy,
      label: "Top score",
      value: topScore,
      hint: topScore > 0 ? "Across every game" : "No score yet",
      tone: "text-accent",
    },
    {
      key: "streak",
      icon: Flame,
      label: "Day streak",
      value: currentStreak,
      hint: `Longest ${streak.longestStreak}`,
      tone: currentStreak > 0 ? "text-accent" : "text-ink",
    },
    {
      key: "tried",
      icon: Sparkles,
      label: "Games tried",
      value: tried,
      hint: `of ${GAME_LIST.length}`,
      tone: "text-ink",
    },
  ] as const;

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface/50 p-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((tile, index) => {
          const Icon = tile.icon;
          return (
            <m.div
              key={tile.key}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-line/70 bg-surface-2/40 px-3.5 py-3 transition-colors hover:border-ink-faint/40 hover:bg-surface-2/70"
            >
              <div className="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                <Icon className="size-3" />
                {tile.label}
              </div>
              <div className={`mt-1 text-2xl leading-none font-bold tracking-tight ${tile.tone}`}>
                <ScoreCounter value={tile.value} durationMs={700} />
                {tile.key === "tried" ? (
                  <span className="text-sm font-semibold text-ink-faint">
                    /{GAME_LIST.length}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 truncate text-[0.6875rem] text-ink-faint clamp-text">
                {tile.key === "tried" && tried < GAME_LIST.length ? (
                  <Link href="/games" className="transition-colors hover:text-accent">
                    {GAME_LIST.length - tried} left to try
                  </Link>
                ) : (
                  tile.hint
                )}
              </div>
            </m.div>
          );
        })}
      </div>

      <p className="px-1.5 pt-2 pb-0.5 text-[0.6875rem] text-ink-faint">
        {fresh
          ? "Your stats live in this browser and fill in as you play — no account, nothing sent anywhere."
          : "Stored in this browser only. Clearing your browser data resets all of it."}
      </p>
    </div>
  );
}
