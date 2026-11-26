"use client";

import { useEffect, type ReactNode } from "react";

/**
 * The gate between arriving and playing.
 *
 * It sits *on* the game rather than in front of it: the board or canvas behind
 * it is the real one, already built, so the first thing a visitor sees is the
 * game itself instead of a page of rules. Most arrivals come straight from
 * search onto a game route, and a screen they have to read and dismiss is the
 * friction between landing and playing.
 *
 * The run still never starts on its own. Five of these games put a clock or a
 * live simulation on the player the instant a run begins, so auto-starting on
 * mount would spend a visitor's first seconds — and on Rush or Ascent kill them
 * — before they had looked at the screen. The player's own first input starts
 * it instead, which is the zero-friction version that still never costs them a
 * run.
 *
 * This component is deliberately `pointer-events-none`. Each game wires the
 * start into its *own* existing input handler, so the first tap is both "begin"
 * and a real move — flipping a tile, jumping, taking a shot — rather than a tap
 * swallowed by an overlay. Keyboard and assistive-technology users get the
 * focusable button below, and Space/Enter anywhere.
 */
export function StartOverlay({
  onStart,
  headline,
  hint = "Tap to start",
  children,
}: {
  onStart: () => void;
  headline: string;
  /** What to do, in one line. The long rules live on the game's page copy. */
  hint?: string;
  children?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "Enter") return;
      event.preventDefault();
      onStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center rounded-[var(--radius-card)] bg-canvas/45 px-4 pb-5">
      {/* A contained card rather than a full wash: the board or canvas around
          it stays legible, which is the entire point of gating in place. */}
      <div className="flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-line bg-canvas/92 px-5 py-5 text-center">
        <h2 className="text-[clamp(1.35rem,5.5vw,1.75rem)] leading-tight font-black tracking-tight text-ink">
          {headline}
        </h2>
        {children ? <div className="text-sm leading-relaxed text-ink-dim">{children}</div> : null}

        {/* Focusable so the gate is reachable without a pointer; everyone else
            just touches the game behind it. */}
        <button
          type="button"
          autoFocus
          onClick={onStart}
          className="pointer-events-auto mt-1 rounded-[var(--radius-pill)] bg-accent px-5 py-2.5 text-sm font-bold text-accent-ink"
        >
          {hint}
        </button>
        <p className="text-[0.6875rem] text-ink-faint">or press space</p>
      </div>
    </div>
  );
}
