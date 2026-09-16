"use client";

import Link from "next/link";
import { useRef, type PointerEvent } from "react";
import { m, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";
import { GameIcon } from "./game-icon";
import { Badge } from "@/components/ui/badge";
import type { GameDefinition } from "@/lib/games";
import { BENCHMARK_NOTE, estimatePerformance } from "@/lib/scoring/percentile";
import { formatNumber } from "@/lib/utils";
import { usePlayer } from "@/providers/player/player-context";

const ACCENT = {
  accent: {
    text: "text-accent",
    ring: "shadow-[inset_0_0_0_1px_rgba(201,255,59,0.16)]",
    glow: "bg-accent/10",
    bar: "bg-accent",
    spot: "rgba(201,255,59,0.16)",
  },
  cool: {
    text: "text-cool",
    ring: "shadow-[inset_0_0_0_1px_rgba(79,216,255,0.16)]",
    glow: "bg-cool/10",
    bar: "bg-cool",
    spot: "rgba(79,216,255,0.16)",
  },
  royal: {
    text: "text-royal",
    ring: "shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]",
    glow: "bg-royal/10",
    bar: "bg-royal",
    spot: "rgba(139,92,246,0.2)",
  },
  amber: {
    text: "text-amber",
    ring: "shadow-[inset_0_0_0_1px_rgba(255,176,32,0.18)]",
    glow: "bg-amber/10",
    bar: "bg-amber",
    spot: "rgba(255,176,32,0.18)",
  },
  rose: {
    text: "text-rose",
    ring: "shadow-[inset_0_0_0_1px_rgba(255,92,138,0.18)]",
    glow: "bg-rose/10",
    bar: "bg-rose",
    spot: "rgba(255,92,138,0.18)",
  },
} as const;

/** Soft enough that the card never looks like it is falling over. */
const TILT = { stiffness: 250, damping: 22, mass: 0.4 };
const TILT_DEGREES = 6;

interface GameCardProps {
  game: GameDefinition;
  index?: number;
  /** Rendered as a key cap when the surrounding page binds launch shortcuts. */
  shortcutKey?: string;
}

/**
 * A game card that behaves like a cabinet rather than a list item: it leans
 * toward the cursor, carries a spotlight under it, and presses in when tapped.
 *
 * The tilt runs on motion values and the spotlight on CSS custom properties, so
 * pointer movement never triggers a React re-render — 60fps hover on seven
 * cards at once, and nothing at all for a touch pointer or under
 * `prefers-reduced-motion`.
 */
export function GameCard({ game, index = 0, shortcutKey }: GameCardProps) {
  const { bestScores, hydrated } = usePlayer();
  const reduced = useReducedMotion();
  const tone = ACCENT[game.accent];
  const best = bestScores[game.id];
  const cardRef = useRef<HTMLAnchorElement | null>(null);

  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(pointerX, [0, 1], [-TILT_DEGREES, TILT_DEGREES]), TILT);
  const rotateX = useSpring(useTransform(pointerY, [0, 1], [TILT_DEGREES, -TILT_DEGREES]), TILT);

  const track = (event: PointerEvent<HTMLAnchorElement>) => {
    const card = cardRef.current;
    if (!card || reduced || event.pointerType === "touch") return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    pointerX.set(x);
    pointerY.set(y);
    card.style.setProperty("--spot-x", `${x * 100}%`);
    card.style.setProperty("--spot-y", `${y * 100}%`);
  };

  const recenter = () => {
    pointerX.set(0.5);
    pointerY.set(0.5);
  };

  const rank = hydrated && best > 0 ? estimatePerformance(game.id, best) : null;

  return (
    <m.div
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 900 }}
    >
      <m.div
        style={reduced ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileTap={reduced ? undefined : { scale: 0.985 }}
        className="h-full"
      >
        <Link
          ref={cardRef}
          href={game.href}
          onPointerMove={track}
          onPointerLeave={recenter}
          onBlur={recenter}
          className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface/60 p-5 transition-colors duration-200 hover:border-ink-faint/50 hover:bg-surface-2/60"
        >
          <span
            aria-hidden
            className={`pointer-events-none absolute -right-10 -top-10 size-32 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100 ${tone.glow} opacity-60`}
          />
          {/* Follows the cursor through CSS variables — no re-render per frame. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: `radial-gradient(13rem circle at var(--spot-x, 50%) var(--spot-y, 50%), ${tone.spot}, transparent 72%)`,
            }}
          />

          <div className="relative flex items-start justify-between gap-3">
            <m.span
              className={`grid size-12 place-items-center rounded-2xl bg-surface-2 ${tone.text} ${tone.ring}`}
              whileHover={reduced ? undefined : { rotate: -8, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 400, damping: 16 }}
            >
              <GameIcon icon={game.icon} className="size-6" />
            </m.span>
            <span className="flex items-center gap-1.5">
              <Badge variant="neutral">
                <Clock />
                {game.durationLabel}
              </Badge>
              {shortcutKey ? (
                <kbd
                  aria-hidden
                  title={`Press ${shortcutKey} to play ${game.name}`}
                  className="hidden h-6 min-w-6 place-items-center rounded-md border border-line bg-surface-2 px-1.5 font-mono text-[0.625rem] font-bold text-ink-faint transition-colors group-hover:border-accent/40 group-hover:text-accent lg:grid"
                >
                  {shortcutKey}
                </kbd>
              ) : null}
            </span>
          </div>

          <h3 className="relative mt-4 text-xl font-bold tracking-tight">{game.name}</h3>
          <p className="relative mt-1.5 text-sm leading-relaxed text-ink-dim">{game.tagline}</p>

          <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
            <div className="min-w-0">
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
              {best > 0 && hydrated ? "Beat it" : "Play"}
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>

          {/* Progress against the benchmark curve — an estimate, and labelled one. */}
          {rank !== null ? (
            <div className="relative mt-3" title={BENCHMARK_NOTE}>
              <div className="flex items-center justify-between text-[0.625rem] font-semibold text-ink-faint">
                <span>Est. rank</span>
                <span className="tabular">{rank}%</span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                <m.span
                  className={`block h-full rounded-full ${tone.bar}`}
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: `${rank}%` }}
                  transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          ) : null}
        </Link>
      </m.div>
    </m.div>
  );
}
