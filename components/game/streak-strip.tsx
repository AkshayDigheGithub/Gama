"use client";

import { m, useReducedMotion } from "framer-motion";
import { Check, Flame } from "lucide-react";
import { toDateKey, weekOf, weekdayLabel } from "@/lib/daily/date-key";
import { streakDays } from "@/lib/streak/streak";
import { usePlayer } from "@/providers/player/player-context";
import { pluralize } from "@/lib/utils";

export function StreakStrip() {
  const { streak, currentStreak, hydrated } = usePlayer();
  const reduced = useReducedMotion();

  if (!hydrated) {
    return (
      <div className="h-[7.5rem] animate-pulse rounded-[var(--radius-card)] border border-line bg-surface/40" aria-hidden />
    );
  }

  const today = toDateKey();
  const week = weekOf(today);
  const done = new Set(streakDays(streak));

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <m.span
            className="text-accent"
            animate={reduced || currentStreak === 0 ? undefined : { scale: [1, 1.16, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Flame className="size-5" />
          </m.span>
          <span className="text-lg font-bold tracking-tight">
            {currentStreak > 0
              ? `${currentStreak} ${pluralize(currentStreak, "day")} streak`
              : "No streak yet"}
          </span>
        </div>
        <span className="text-xs text-ink-faint tabular">Longest {streak.longestStreak}</span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {week.map((day) => {
          const complete = done.has(day);
          const isToday = day === today;
          return (
            <div key={day} className="flex flex-col items-center gap-1.5">
              <span className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                {weekdayLabel(day)}
              </span>
              <span
                aria-label={`${weekdayLabel(day)} ${complete ? "played" : "not played"}`}
                className={[
                  "grid aspect-square w-full place-items-center rounded-xl border text-xs font-bold transition-colors",
                  complete
                    ? "border-accent/40 bg-accent/15 text-accent"
                    : isToday
                      ? "border-ink-faint/50 bg-surface-2 text-ink-faint"
                      : "border-line bg-surface-2/40 text-ink-faint/50",
                ].join(" ")}
              >
                {complete ? <Check className="size-3.5" /> : isToday ? "•" : ""}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[0.6875rem] text-ink-faint">
        A day counts once you finish a game. Refreshing does nothing.
      </p>
    </div>
  );
}
