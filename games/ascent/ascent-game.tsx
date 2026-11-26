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

  /**
   * Builds the world without starting the run.
   *
   * Touches refs only, so it is safe to call on mount: the canvas then has a
   * real first frame to draw, and a visitor sees the game itself rather than a
   * screen of rules. Nothing moves until `begin`.
   */
  const arm = useCallback(() => {
    stateRef.current = createAscent(
      mode === "daily" ? `daily:${toDateKey()}` : `run:${Date.now()}:${Math.random()}`,
    );
    cameraRef.current = 0;
    publishedAt.current = 0;
  }, [mode]);

  useEffect(() => {
    arm();
  }, [arm]);

  /** Starts the simulation. Only ever called from the player's own first input. */
  const begin = useCallback(() => {
    setHud({ score: 0, metres: 0, jumps: 0 });
    setResult(null);
    setOutcome(null);
    startedAt.current = performance.now();
    setPhase("playing");
    trackEvent("game_started", { game: "ascent", mode });
    if (mode === "daily") {
      trackEvent("daily_challenge_started", { game: "ascent", date: toDateKey() });
    }
  }, [mode]);

  const step = useCallback(
    (fixedMs: number) => {
      const state = stateRef.current;
      // Armed but not started: the world is painted, nothing advances.
      if (phase !== "playing") return;
      if (!state || state.dead) return;
      const clinging = state.clinging;
      stepAscent(state, fixedMs);

      // Camera lags the climber so a jump reads as upward movement rather than
      // the world sliding underneath a pinned sprite.
      cameraRef.current += (state.y - cameraRef.current) * Math.min(1, fixedMs / 90);

      // Edge-triggered: a fresh hold, not every frame spent holding on.
      if (!clinging && state.clinging && !state.dead) {
        haptic("tap");
        playSound("hit");
      }

      publishedAt.current += fixedMs;
      if (publishedAt.current >= 100) {
        publishedAt.current = 0;
        setHud({ score: finalScore(state), metres: metresOf(state.maxHeight), jumps: state.jumps });
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
    if (state) drawAscent(ctx, state, cameraRef.current);
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

  const press = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.dead) return;
    // The first tap starts the run and is also the first leap.
    if (phase === "intro") begin();
    else if (phase !== "playing") return;
    playSound("tick");
    jump(state);
  }, [phase, begin]);

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

  // A replay skips the gate: the player has already told us they are in.
  const playAgain = useCallback(() => {
    recorded.current = false;
    trackEvent("game_retry", { game: "ascent", mode });
    arm();
    begin();
  }, [mode, arm, begin]);

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

            {phase === "intro" ? (
              <StartOverlay onStart={begin} headline="Climb or drown." hint="Tap to leap">
                Tap to leap to the other wall. Hold for a high arc, release early for a flat one.
                You slide down while clinging, and the void below is rising.
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
        </div>
      </div>
    </GameShell>
  );
}
