"use client";

import Link from "next/link";
import { CalendarDays, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toDateKey } from "@/lib/daily/date-key";
import { getDailyChallenge } from "@/lib/daily/daily";
import { dailySchema } from "@/lib/daily/schema";
import { GAMES } from "@/lib/games";
import { formatNumber } from "@/lib/utils";
import { useHydrated, useLocalStorage } from "@/hooks/use-local-storage";

/**
 * Today's challenge, derived from the local calendar date.
 *
 * Rendered client-side on purpose: the server has no idea what day it is where
 * the player is standing, and guessing would produce a hydration mismatch.
 */
export function DailyCard({ compact = false }: { compact?: boolean }) {
  const hydrated = useHydrated();
  const [log] = useLocalStorage(dailySchema);

  if (!hydrated) {
    return (
      <div
        className="h-[9.5rem] animate-pulse rounded-[var(--radius-card)] border border-line bg-surface/40"
        aria-hidden
      />
    );
  }

  const date = toDateKey();
  const challenge = getDailyChallenge(date);
  const record = log[date];
  const cleared = record?.met === true;
  const game = GAMES[challenge.game];

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface/60 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={cleared ? "good" : "accent"}>
          {cleared ? <Check /> : <CalendarDays />}
          {cleared ? "Cleared today" : "Today's challenge"}
        </Badge>
        <Badge variant="neutral">{game.name}</Badge>
      </div>

      <h3 className="mt-3.5 text-xl font-bold tracking-tight">{challenge.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">{challenge.brief}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="text-ink-dim">
          Target <strong className="tabular text-ink">{formatNumber(challenge.goal)}</strong>
        </span>
        {record ? (
          <span className="text-ink-dim">
            Your best today{" "}
            <strong className="tabular text-ink">{formatNumber(record.bestScore)}</strong>
          </span>
        ) : null}
      </div>

      <Button asChild size={compact ? "md" : "lg"} className="mt-5" block={compact}>
        <Link href={`${game.href}?mode=daily`}>{cleared ? "Play again" : "Play"}</Link>
      </Button>
    </div>
  );
}
