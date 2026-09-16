"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { ArrowRight, Hand, Timer, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GAMES } from "@/lib/games";
import { estimateFasterThan } from "@/lib/scoring/percentile";
import { formatMs } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import { MAX_WAIT_MS, MIN_WAIT_MS, SLOW_MS, nextWait } from "@/games/reaction/engine";

type Phase = "idle" | "wait" | "go" | "done" | "early";

/** Enough taps to get the feel, few enough that the real game is still the game. */
const HISTORY = 5;

/** Quoted from the engine so the copy can never drift from the actual window. */
const seconds = (ms: number) => (ms / 1000).toFixed(1).replace(/\.0$/, "");
const WAIT_LOW = seconds(MIN_WAIT_MS);
const WAIT_HIGH = seconds(MAX_WAIT_MS);

/**
 * A playable hero.
 *
 * The fastest way to explain a site full of twenty-second games is to let
 * someone play one before they have read anything, so the hero is a single
 * live reaction round: it arms, it flips, it tells you how quick you were, and
 * the button under it goes to the scored five-round version.
 *
 * It uses the real game's wait window and the real benchmark curve, but it
 * writes nothing — no score, no streak, no stats. The panel says so, because a
 * warm-up that quietly counted would make every number on the site suspect.
 */
export function HeroReaction() {
  const haptic = useHaptics();
  const reduced = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("idle");
  const [taps, setTaps] = useState<number[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flipAt = useRef(0);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  const arm = useCallback(() => {
    clear();
    setPhase("wait");
    timer.current = setTimeout(() => {
      flipAt.current = performance.now();
      setPhase("go");
      haptic("tap");
    }, nextWait(Math.random));
  }, [clear, haptic]);

  const onTap = useCallback(() => {
    if (phase === "wait") {
      clear();
      setPhase("early");
      haptic("error");
      return;
    }
    if (phase === "go") {
      const ms = Math.max(1, Math.round(performance.now() - flipAt.current));
      setTaps((previous) => [ms, ...previous].slice(0, HISTORY));
      setPhase("done");
      haptic("success");
      return;
    }
    arm();
  }, [arm, clear, haptic, phase]);

  const last = phase === "done" ? (taps[0] ?? null) : null;
  const best = taps.length ? Math.min(...taps) : null;
  const live = phase === "wait" || phase === "go";

  return (
    <div className="glass relative w-full overflow-hidden rounded-[var(--radius-card)] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="accent">
          <Zap />
          Warm-up
        </Badge>
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          {taps.length ? `${taps.length}/${HISTORY} taps` : "One tap"}
        </span>
      </div>

      <button
        type="button"
        // Pointer-down, not click: a reaction test cannot afford the wait for
        // the browser to decide the gesture was a click.
        onPointerDown={onTap}
        onKeyDown={(event) => {
          if (event.key !== " " && event.key !== "Enter") return;
          // Held keys auto-repeat; one press is one tap.
          if (event.repeat) return;
          // Also stops the synthetic click that would run `onTap` twice.
          event.preventDefault();
          onTap();
        }}
        aria-label={
          phase === "go"
            ? "Tap now"
            : phase === "wait"
              ? "Wait for the flip, then tap"
              : "Start a warm-up reaction round"
        }
        className={[
          "play-lock mt-3.5 flex h-44 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border px-5 text-center transition-colors duration-150 sm:h-48",
          phase === "go"
            ? "border-accent bg-accent text-accent-ink"
            : phase === "early"
              ? "border-hot/50 bg-hot/15 text-hot"
              : "border-line bg-surface-2/60 text-ink hover:border-ink-faint/50",
        ].join(" ")}
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            key={phase + (last ?? 0)}
            initial={reduced ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-2"
          >
            {phase === "idle" ? (
              <>
                <Hand className="size-6 text-accent" />
                <span className="text-3xl leading-none font-black tracking-tight">Tap to test</span>
                <span className="text-sm text-ink-dim">
                  Wait for the flip, then hit it as fast as you can.
                </span>
              </>
            ) : null}

            {phase === "wait" ? (
              <>
                <m.span
                  className="text-ink-faint"
                  animate={reduced ? undefined : { opacity: [1, 0.35, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Timer className="size-6" />
                </m.span>
                <span className="text-4xl leading-none font-black tracking-tight text-ink-dim">
                  WAIT…
                </span>
                <span className="text-sm text-ink-faint">Anything up to {WAIT_HIGH} seconds.</span>
              </>
            ) : null}

            {phase === "go" ? (
              <span className="text-[clamp(3rem,12vw,4.5rem)] leading-none font-black tracking-tight">
                TAP!
              </span>
            ) : null}

            {phase === "done" && last !== null ? (
              <>
                <span className="text-[clamp(2.75rem,10vw,4rem)] leading-none font-black tracking-tight tabular text-accent">
                  {formatMs(last)}
                </span>
                <span className="text-sm text-ink-dim">
                  {last < SLOW_MS
                    ? `Quicker than ${estimateFasterThan(last)}% of the benchmark curve`
                    : "Slower than the 600 ms floor — that round would score nothing"}
                </span>
                <span className="text-xs font-semibold text-accent">Tap for one more</span>
              </>
            ) : null}

            {phase === "early" ? (
              <>
                <span className="text-3xl leading-none font-black tracking-tight">Too early</span>
                <span className="text-sm">
                  The real game forfeits the round for that. Tap to try again.
                </span>
              </>
            ) : null}
          </m.span>
        </AnimatePresence>
      </button>

      {/* The pad's own text lives inside a button, so the outcome is announced here. */}
      <p className="sr-only" aria-live="polite">
        {phase === "go"
          ? "Tap now"
          : phase === "early"
            ? "Too early. Wait for the flip, then tap."
            : phase === "done" && last !== null
              ? `${last} milliseconds, quicker than ${estimateFasterThan(last)} percent of the benchmark curve.`
              : ""}
      </p>

      {/* Tap history: five slots that fill in, so the panel keeps a memory. */}
      <div className="mt-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: HISTORY }).map((_, index) => {
            const ms = taps[HISTORY - 1 - index];
            return (
              <span
                key={index}
                className={[
                  "h-6 min-w-11 rounded-md border px-1.5 text-center text-[0.6875rem] leading-6 font-bold tabular",
                  ms === undefined
                    ? "border-line bg-surface-2/40 text-ink-faint/40"
                    : ms === best
                      ? "border-accent/40 bg-accent/15 text-accent"
                      : "border-line bg-surface-2/70 text-ink-dim",
                ].join(" ")}
              >
                {ms === undefined ? "—" : ms}
              </span>
            );
          })}
        </div>
        <span className="text-xs text-ink-faint tabular" aria-live="polite">
          {best === null ? "Not scored" : `Best ${formatMs(best)}`}
        </span>
      </div>

      <Link
        href={GAMES.reaction.href}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-dim transition-colors hover:text-accent"
      >
        Play the scored version — five rounds
        <ArrowRight className="size-4" />
      </Link>

      <p className="mt-2 text-[0.6875rem] leading-relaxed text-ink-faint">
        Warm-up taps are never saved and never scored. The wait runs between {WAIT_LOW} and{" "}
        {WAIT_HIGH} seconds, exactly as in the game.
      </p>

      {/* A hairline that only shows while a round is live — quiet tension. */}
      <span
        aria-hidden
        className={[
          "pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity duration-200",
          live ? "bg-accent opacity-70" : "opacity-0",
        ].join(" ")}
      />
    </div>
  );
}
