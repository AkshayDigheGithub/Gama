"use client";

import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";
import { GameIcon } from "./game-icon";
import { Badge } from "@/components/ui/badge";
import type { GameDefinition } from "@/lib/games";
import { formatNumber } from "@/lib/utils";
import { usePlayer } from "@/providers/player/player-context";

const ACCENT = {
  accent: { text: "text-accent", ring: "shadow-[inset_0_0_0_1px_rgba(201,255,59,0.16)]", glow: "bg-accent/10" },
  cool: { text: "text-cool", ring: "shadow-[inset_0_0_0_1px_rgba(79,216,255,0.16)]", glow: "bg-cool/10" },
  royal: { text: "text-royal", ring: "shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]", glow: "bg-royal/10" },
} as const;

export function GameCard({ game, index = 0 }: { game: GameDefinition; index?: number }) {
  const { bestScores, hydrated } = usePlayer();
  const reduced = useReducedMotion();
  const tone = ACCENT[game.accent];
  const best = bestScores[game.id];

  return (
    <m.div
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={game.href}
        className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface/60 p-5 transition-colors duration-200 hover:border-ink-faint/50 hover:bg-surface-2/60"
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-10 -top-10 size-32 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100 ${tone.glow} opacity-60`}
        />

        <div className="flex items-start justify-between gap-3">
          <m.span
            className={`grid size-12 place-items-center rounded-2xl bg-surface-2 ${tone.text} ${tone.ring}`}
            whileHover={reduced ? undefined : { rotate: -8, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 400, damping: 16 }}
          >
            <GameIcon icon={game.icon} className="size-6" />
          </m.span>
          <Badge variant="neutral">
            <Clock />
            {game.durationLabel}
          </Badge>
        </div>

        <h3 className="mt-4 text-xl font-bold tracking-tight">{game.name}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">{game.tagline}</p>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          <div>
            <div className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Your best
            </div>
            <div className="text-base font-bold tabular">
              {hydrated && best > 0 ? formatNumber(best) : "—"}
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-surface-2 px-4 py-2 text-sm font-semibold transition-colors group-hover:bg-accent group-hover:text-accent-ink`}
          >
            Play
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </m.div>
  );
}
