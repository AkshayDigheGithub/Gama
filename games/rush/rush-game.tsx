"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameLoading } from "@/components/game/game-loading";
import { GameShell } from "@/components/game/game-shell";
import { ResultScreen } from "@/components/game/result-screen";
import { StartOverlay } from "@/components/game/start-overlay";
import { trackEvent } from "@/lib/analytics";
import { playSound } from "@/lib/audio";
import { getDailyChallenge } from "@/lib/daily/daily";
import { toDateKey } from "@/lib/daily/date-key";
import { formatNumber } from "@/lib/utils";
import { useGameLoop } from "@/hooks/use-game-loop";
import { useGameParams } from "@/hooks/use-game-params";
import { useHaptics } from "@/hooks/use-haptics";
import { useRunRecorder, type RunOutcome } from "@/hooks/use-run-recorder";
import { usePlayer } from "@/providers/player/player-context";
import type { GameResult } from "@/types";
import {
  WORLD_H,
  WORLD_W,
  createRush,
  finalScore,
  queueJump,
  queueSlide,
  releaseJump,
  releaseSlide,
  stepRush,
  type RushState,
} from "./engine";
import { drawRush } from "./render";
import { metresOf, toGameResult } from "./scoring";

/** Taps below this fraction of the play area slide instead of jumping. */
const SLIDE_ZONE = 0.68;

export default function RushGame() {
  const { mode, challenge } = useGameParams("rush");
  const { username } = usePlayer();
  const record = useRunRecorder("rush", mode);
  const haptic = useHaptics();

  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [hud, setHud] = useState({ score: 0, metres: 0, multiplier: 1 });
  const [result, setResult] = useState<GameResult | null>(null);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RushState | null>(null);
  const publishedAt = useRef(0);
  const startedAt = useRef(0);
  const recorded = useRef(false);

  const dailyGoal = useMemo(
    () => (mode === "daily" ? getDailyChallenge(toDateKey()).goal : undefined),
    [mode],
  );

  useEffect(() => {
    trackEvent("game_view", { game: "rush" });
  }, []);

  /**
   * Builds the world without starting the run.
   *
   * Touches refs only, so it is safe to call on mount: the canvas then has a
   * real first frame to draw, and a visitor sees the game itself rather than a
   * screen of rules. Nothing moves until `begin`.
   */
  const arm = useCallback(() => {
    stateRef.current = createRush(
      mode === "daily" ? `daily:${toDateKey()}` : `run:${Date.now()}:${Math.random()}`,
    );
    publishedAt.current = 0;
  }, [mode]);

  useEffect(() => {
    arm();
  }, [arm]);

  /** Starts the simulation. Only ever called from the player's own first input. */
  const begin = useCallback(() => {
    setHud({ score: 0, metres: 0, multiplier: 1 });
    setResult(null);
    setOutcome(null);
    startedAt.current = performance.now();
    setPhase("playing");
    trackEvent("game_started", { game: "rush", mode });
    if (mode === "daily") {
      trackEvent("daily_challenge_started", { game: "rush", date: toDateKey() });
    }
  }, [mode]);

  const step = useCallback(
    (fixedMs: number) => {
      const state = stateRef.current;
      // Armed but not started: the world is painted, nothing advances.
      if (phase !== "playing") return;
      if (!state || state.dead) return;
      stepRush(state, fixedMs);

      // The simulation runs at 120Hz; React only needs the numbers ten times a
      // second, and re-rendering more often would fight the loop for frames.
      publishedAt.current += fixedMs;
      if (publishedAt.current >= 100) {
        publishedAt.current = 0;
        setHud({
          score: finalScore(state),
          metres: metresOf(state.distance),
          multiplier: state.multiplier,
        });
      }
      if (state.dead) {
        haptic("error");
        playSound("miss");
        setPhase("done");
      }
    },
    [phase, haptic],
  );

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = stateRef.current;
    if (state) drawRush(ctx, state);
  }, []);

  useGameLoop({
    canvasRef,
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    // Runs through the gate too, so the canvas shows the real opening frame
    // instead of an empty box. `step` holds the world still until then.
    running: phase === "intro" || phase === "playing",
    step,
    draw,
  });

  /* ------------------------------------------------------------- input -- */
  const press = useCallback(
    (slide: boolean) => {
      const state = stateRef.current;
      if (!state || state.dead) return;
      // The first tap starts the run and is also the first jump — the gesture
      // that opens the game is a move in it, not a dismissal.
      if (phase === "intro") begin();
      else if (phase !== "playing") return;
      playSound("tick");
      if (slide) queueSlide(state);
      else queueJump(state);
    },
    [phase, begin],
  );

  const release = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    releaseJump(state);
    releaseSlide(state);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    press((event.clientY - box.top) / box.height > SLIDE_ZONE);
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const down = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
        event.preventDefault();
        press(false);
      } else if (event.code === "ArrowDown" || event.code === "KeyS") {
        event.preventDefault();
        press(true);
      }
    };
    const up = () => release();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase, press, release]);

  /* ------------------------------------------------------------ result -- */
  useEffect(() => {
    if (phase !== "done" || recorded.current) return;
    const state = stateRef.current;
    if (!state) return;
    recorded.current = true;

    const gameResult = toGameResult(state);
    setResult(gameResult);
    void record(gameResult, performance.now() - startedAt.current).then(setOutcome);
    if (challenge) {
      trackEvent("challenge_completed", {
        game: "rush",
        score: gameResult.score,
        targetScore: challenge.score,
        beat: gameResult.score > challenge.score,
      });
    }
  }, [phase, record, challenge]);

  // A replay skips the gate: the player has already told us they are in.
  const playAgain = useCallback(() => {
    recorded.current = false;
    trackEvent("game_retry", { game: "rush", mode });
    arm();
    begin();
  }, [mode, arm, begin]);

  if (phase === "done" && !result) {
    return (
      <GameShell title="Rush" eyebrow="Result">
        <GameLoading label="Scoring" />
      </GameShell>
    );
  }

  if (phase === "done" && result) {
    return (
      <GameShell title="Rush" eyebrow="Result">
        <ResultScreen
          result={result}
          outcome={outcome}
          mode={mode}
          username={username}
          challenge={challenge}
          dailyGoal={dailyGoal}
          onPlayAgain={playAgain}
          extra={
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "Near misses", value: formatNumber(Number(result.detail?.nearMisses ?? 0)) },
                { label: "Top combo", value: `${Number(result.detail?.bestMultiplier ?? 1).toFixed(1)}x` },
                { label: "Top speed", value: formatNumber(Number(result.detail?.topSpeed ?? 0)) },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-2xl border border-line bg-surface/60 px-3 py-3.5 text-center"
                >
                  <div className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                    {tile.label}
                  </div>
                  <div className="mt-1 text-lg font-bold tabular">{tile.value}</div>
                </div>
              ))}
            </div>
          }
        />
      </GameShell>
    );
  }

  return (
    <GameShell
      title="Rush"
      eyebrow={
        mode === "daily" ? "Daily course" : challenge ? `Chasing ${challenge.name}` : "Run until you fall"
      }
      locked
      hud={
        <span className="rounded-[var(--radius-pill)] border border-line bg-surface/70 px-3 py-1.5 text-xs font-bold tabular text-ink-dim">
          {formatNumber(hud.metres)} m
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2 pb-2">
        <div className="flex items-center justify-between">
          <span aria-label={`Score ${hud.score}`} aria-live="polite" className="text-lg font-black tabular">
            {formatNumber(hud.score)}
          </span>
          <span
            className={`text-xs font-bold tabular ${hud.multiplier > 1.05 ? "text-accent" : "text-ink-faint"}`}
          >
            {hud.multiplier.toFixed(1)}x
          </span>
        </div>

        {/* The whole area is tappable; the canvas keeps its own aspect so the
            world is never letter-boxed into a thin strip on a tall phone. */}
        <div
          onPointerDown={onPointerDown}
          onPointerUp={release}
          onPointerCancel={release}
          onPointerLeave={release}
          role="application"
          aria-label="Tap to jump, tap low to slide"
          className="relative flex min-h-0 flex-1 touch-none flex-col justify-center play-lock"
        >
          <div className="relative aspect-[16/9] max-h-full w-full overflow-hidden rounded-[var(--radius-card)] border border-line">
            <canvas ref={canvasRef} className="block h-full w-full" />

            {phase === "intro" ? (
              <StartOverlay onStart={begin} headline="Don&apos;t stop." hint="Tap to run">
                Tap to jump — hold for height. Tap low on the screen to slide. One hit ends the
                run.
                {challenge ? (
                  <span className="mt-2 block">
                    <strong className="clamp-text text-ink">{challenge.name}</strong> scored{" "}
                    <strong className="tabular text-ink">{formatNumber(challenge.score)}</strong>
                  </span>
                ) : null}
                {dailyGoal !== undefined ? (
                  <span className="mt-2 block">
                    Daily target <strong className="tabular text-ink">{formatNumber(dailyGoal)}</strong>
                  </span>
                ) : null}
              </StartOverlay>
            ) : null}
          </div>
          {/* The whole panel is tappable, so the empty space around the game
              becomes the control surface — labelled rather than hidden. */}
          <span className="pointer-events-none absolute inset-x-0 top-2 text-center text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-ink-faint/45">
            tap = jump · hold = higher
          </span>
          <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-ink-faint/45">
            tap here = slide
          </span>
        </div>
      </div>
    </GameShell>
  );
}
