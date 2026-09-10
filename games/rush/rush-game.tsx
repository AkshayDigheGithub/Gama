"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Footprints } from "lucide-react";
import { GameLoading } from "@/components/game/game-loading";
import { GameShell } from "@/components/game/game-shell";
import { ResultScreen } from "@/components/game/result-screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
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

  const start = useCallback(() => {
    stateRef.current = createRush(
      mode === "daily" ? `daily:${toDateKey()}` : `run:${Date.now()}:${Math.random()}`,
    );
    setHud({ score: 0, metres: 0, multiplier: 1 });
    setResult(null);
    setOutcome(null);
    startedAt.current = performance.now();
    publishedAt.current = 0;
    setPhase("playing");
    trackEvent("game_started", { game: "rush", mode });
    if (mode === "daily") trackEvent("daily_challenge_started", { game: "rush", date: toDateKey() });
  }, [mode]);

  const step = useCallback(
    (fixedMs: number) => {
      const state = stateRef.current;
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
        setPhase("done");
      }
    },
    [haptic],
  );

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = stateRef.current;
    if (state) drawRush(ctx, state);
  }, []);

  useGameLoop({
    canvasRef,
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    running: phase === "playing",
    step,
    draw,
  });

  /* ------------------------------------------------------------- input -- */
  const press = useCallback(
    (slide: boolean) => {
      const state = stateRef.current;
      if (!state || state.dead || phase !== "playing") return;
      if (slide) queueSlide(state);
      else queueJump(state);
    },
    [phase],
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

  const playAgain = useCallback(() => {
    recorded.current = false;
    trackEvent("game_retry", { game: "rush", mode });
    start();
  }, [mode, start]);

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

  if (phase === "intro") {
    return (
      <GameShell title="Rush" eyebrow="Run until you fall">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-8">
          <div className="text-center">
            <span className="grid mx-auto size-14 place-items-center rounded-2xl bg-accent/10 text-accent">
              <Footprints className="size-7" />
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight">Don&apos;t stop.</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">
              Tap to jump — hold for height. Tap low on the screen to slide. One hit ends the run.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface/60 p-4 text-sm text-ink-dim">
            <ul className="flex flex-col gap-2">
              <li>
                <strong className="text-rose">Spikes and blocks</strong> — jump.
              </li>
              <li>
                <strong className="text-amber">Low bars</strong> — hold a slide until you are through.
              </li>
              <li>
                <strong className="text-accent">Orbs and near misses</strong> build your multiplier.
                Playing safe lets it decay.
              </li>
            </ul>
          </div>

          {challenge ? (
            <div className="rounded-2xl border border-royal/35 bg-royal/10 px-4 py-3 text-center text-sm">
              <strong className="clamp-text">{challenge.name}</strong> scored{" "}
              <strong className="tabular">{formatNumber(challenge.score)}</strong>
            </div>
          ) : null}

          {dailyGoal !== undefined ? (
            <div className="rounded-2xl border border-line bg-surface/60 px-4 py-3 text-center">
              <Badge variant="cool">Daily target</Badge>
              <p className="mt-2 text-sm text-ink-dim">
                Score <strong className="tabular text-ink">{formatNumber(dailyGoal)}</strong> to
                clear today. Everyone runs the same course.
              </p>
            </div>
          ) : null}

          <Button size="xl" block onClick={start} className="text-lg">
            Start
          </Button>
        </div>
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
