"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { usePlayer } from "@/providers/player/player-context";
import { cn } from "@/lib/utils";

export function StreakChip({ className }: { className?: string }) {
  const { currentStreak, hydrated } = usePlayer();
  const active = hydrated && currentStreak > 0;

  return (
    <Link
      href="/daily"
      aria-label={active ? `${currentStreak} day streak` : "Start a streak"}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-[var(--radius-pill)] border px-3 text-xs font-bold tabular transition-colors",
        active
          ? "border-accent/35 bg-accent/10 text-accent"
          : "border-line bg-surface/70 text-ink-faint hover:text-ink-dim",
        className,
      )}
    >
      <Flame className="size-3.5" />
      {active ? currentStreak : "—"}
    </Link>
  );
}
