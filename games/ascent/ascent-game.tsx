"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MoveUp } from "lucide-react";
import { GameLoading } from "@/components/game/game-loading";
import { GameShell } from "@/components/game/game-shell";
import { ResultScreen } from "@/components/game/result-screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { getDailyChallenge } from "@/lib/daily/daily";
import { toDateKey } from "@/lib/daily/date-key";
import { formatNumber, formatSeconds } from "@/lib/utils";
import { useGameLoop } from "@/hooks/use-game-loop";
import { useGameParams } from "@/hooks/use-game-params";
import { useHaptics } from "@/hooks/use-haptics";
import { useRunRecorder, type RunOutcome } from "@/hooks/use-run-recorder";
import { usePlayer } from "@/providers/player/player-context";
import type { GameResult } from "@/types";
import {
  WORLD_H,
  WORLD_W,
  createAscent,
  finalScore,
  jump,
  releaseJump,
  stepAscent,
  type AscentState,
} from "./engine";
import { drawAscent } from "./render";
import { metresOf, toGameResult } from "./scoring";

export default function AscentGame() {
  const { mode, challenge } = useGameParams("ascent");
  const { username } = usePlayer();
  const record = useRunRecorder("ascent", mode);
  const haptic = useHaptics();

  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [hud, setHud] = useState({ score: 0, metres: 0, jumps: 0 });
  const [result, setResult] = useState<GameResult | null>(null);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<AscentState | null>(null);
  const cameraRef = useRef(0);
  const publishedAt = useRef(0);
  const startedAt = useRef(0);
  const recorded = useRef(false);

  const dailyGoal = useMemo(
    () => (mode === "daily" ? getDailyChallenge(toDateKey()).goal : undefined),
    [mode],
  );

  useEffect(() => {
    trackEvent("game_view", { game: "ascent" });
  }, []);

  const start = useCallback(() => {
    stateRef.current = createAscent(
      mode === "daily" ? `daily:${toDateKey()}` : `run:${Date.now()}:${Math.random()}`,
    );
    cameraRef.current = 0;
    setHud({ score: 0, metres: 0, jumps: 0 });
    setResult(null);
    setOutcome(null);
    startedAt.current = performance.now();
    publishedAt.current = 0;
    setPhase("playing");
    trackEvent("game_started", { game: "ascent", mode });
    if (mode === "daily") {
      trackEvent("daily_challenge_started", { game: "ascent", date: toDateKey() });
    }
  }, [mode]);

  const step = useCallback(
    (fixedMs: number) => {
      const state = stateRef.current;
      if (!state || state.dead) return;
      const clinging = state.clinging;
      stepAscent(state, fixedMs);

      // Camera lags the climber so a jump reads as upward movement rather than
      // the world sliding underneath a pinned sprite.
      cameraRef.current += (state.y - cameraRef.current) * Math.min(1, fixedMs / 90);

      if (!clinging && state.clinging && !state.dead) haptic("tap");

      publishedAt.current += fixedMs;
      if (publishedAt.current >= 100) {
        publishedAt.current = 0;
        setHud({ score: finalScore(state), metres: metresOf(state.maxHeight), jumps: state.jumps });
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
    if (state) drawAscent(ctx, state, cameraRef.current);
  }, []);

  useGameLoop({
    canvasRef,
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    running: phase === "playing",
    step,
    draw,
  });

  const press = useCallback(() => {
    const state = stateRef.current;
    if (state && !state.dead && phase === "playing") jump(state);
  }, [phase]);

  const release = useCallback(() => {
    const state = stateRef.current;
    if (state) releaseJump(state);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const down = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
        event.preventDefault();
        press();
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
        game: "ascent",
        score: gameResult.score,
        targetScore: challenge.score,
        beat: gameResult.score > challenge.score,
      });
    }
  }, [phase, record, challenge]);

  const playAgain = useCallback(() => {
    recorded.current = false;
    trackEvent("game_retry", { game: "ascent", mode });
    start();
  }, [mode, start]);

  if (phase === "done" && !result) {
    return (
      <GameShell title="Ascent" eyebrow="Result">
        <GameLoading label="Scoring" />
      </GameShell>
    );
  }

  if (phase === "done" && result) {
    const endedBy = String(result.detail?.endedBy ?? "none");
    return (
      <GameShell title="Ascent" eyebrow="Result">
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
                { label: "Clean landings", value: formatNumber(Number(result.detail?.cleanLandings ?? 0)) },
                { label: "Time", value: formatSeconds(Number(result.detail?.elapsedMs ?? 0)) },
                { label: "Ended by", value: endedBy === "spike" ? "Spikes" : endedBy === "void" ? "The void" : "—" },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-2xl border border-line bg-surface/60 px-3 py-3.5 text-center"
                >
                  <div className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                    {tile.label}
                  </div>
                  <div className="mt-1 text-base font-bold tabular">{tile.value}</div>
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
      <GameShell title="Ascent" eyebrow="One button">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-8">
          <div className="text-center">
            <span className="grid mx-auto size-14 place-items-center rounded-2xl bg-rose/10 text-rose">
              <MoveUp className="size-7" />
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight">Climb or drown.</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">
              Tap to leap to the other wall. Hold for a high arc, release early for a flat one —
              that choice is the whole game.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface/60 p-4 text-sm text-ink-dim">
            <ul className="flex flex-col gap-2">
              <li>
                You slide <strong className="text-ink">down</strong> while clinging, so waiting costs
                height.
              </li>
              <li>
                <strong className="text-rose">Spiked stretches</strong> are fatal to land on — aim
                above or below them.
              </li>
              <li>
                The <strong className="text-rose">void</strong> below rises, and it accelerates.
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
                clear today. Everyone climbs the same wall.
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
      title="Ascent"
      eyebrow={
        mode === "daily" ? "Daily wall" : challenge ? `Chasing ${challenge.name}` : "One button"
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
          <span className="text-xs font-bold tabular text-ink-faint">{hud.jumps} jumps</span>
        </div>
        <p className="text-center text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-ink-faint/50">
          tap = flat hop · hold = high arc
        </p>

        <div
          onPointerDown={(event) => {
            event.preventDefault();
            press();
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onPointerLeave={release}
          role="application"
          aria-label="Tap to jump, hold for a higher arc"
          className="relative flex min-h-0 flex-1 touch-none items-center justify-center play-lock"
        >
          <div className="relative aspect-[9/16] h-full max-w-full overflow-hidden rounded-[var(--radius-card)] border border-line">
            <canvas ref={canvasRef} className="block h-full w-full" />
          </div>
        </div>
      </div>
    </GameShell>
  );
}
