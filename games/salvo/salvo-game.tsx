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
  STARTING_LIVES,
  WORLD_H,
  WORLD_W,
  comboMultiplier,
  createSalvo,
  finalScore,
  shoot,
  stepSalvo,
  type SalvoState,
} from "./engine";
import { drawSalvo, type Splash } from "./render";
import { toGameResult } from "./scoring";

const SPLASH_MS = 260;

export default function SalvoGame() {
  const { mode, challenge } = useGameParams("salvo");
  const { username } = usePlayer();
  const record = useRunRecorder("salvo", mode);
  const haptic = useHaptics();

  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [hud, setHud] = useState({ score: 0, lives: STARTING_LIVES, combo: 1 });
  const [result, setResult] = useState<GameResult | null>(null);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SalvoState | null>(null);
  const splashes = useRef<Splash[]>([]);
  const publishedAt = useRef(0);
  const startedAt = useRef(0);
  const recorded = useRef(false);

  const dailyGoal = useMemo(
    () => (mode === "daily" ? getDailyChallenge(toDateKey()).goal : undefined),
    [mode],
  );

  useEffect(() => {
    trackEvent("game_view", { game: "salvo" });
  }, []);

  /**
   * Builds the world without starting the run.
   *
   * Touches refs only, so it is safe to call on mount: the canvas then has a
   * real first frame to draw, and a visitor sees the game itself rather than a
   * screen of rules. Nothing moves until `begin`.
   */
  const arm = useCallback(() => {
    stateRef.current = createSalvo(
      mode === "daily" ? `daily:${toDateKey()}` : `run:${Date.now()}:${Math.random()}`,
    );
    splashes.current = [];
    publishedAt.current = 0;
  }, [mode]);

  useEffect(() => {
    arm();
  }, [arm]);

  /** Starts the simulation. Only ever called from the player's own first input. */
  const begin = useCallback(() => {
    setHud({ score: 0, lives: STARTING_LIVES, combo: 1 });
    setResult(null);
    setOutcome(null);
    startedAt.current = performance.now();
    setPhase("playing");
    trackEvent("game_started", { game: "salvo", mode });
    if (mode === "daily") {
      trackEvent("daily_challenge_started", { game: "salvo", date: toDateKey() });
    }
  }, [mode]);

  const step = useCallback(
    (fixedMs: number) => {
      const state = stateRef.current;
      // Armed but not started: the world is painted, nothing advances.
      if (phase !== "playing") return;
      if (!state || state.dead) return;
      const livesBefore = state.lives;
      stepSalvo(state, fixedMs);

      splashes.current = splashes.current
        .map((splash) => ({ ...splash, age: splash.age + fixedMs }))
        .filter((splash) => splash.age < SPLASH_MS);

      if (state.lives < livesBefore) {
        haptic("error");
        playSound("miss");
      }

      publishedAt.current += fixedMs;
      if (publishedAt.current >= 100) {
        publishedAt.current = 0;
        setHud({
          score: finalScore(state),
          lives: state.lives,
          combo: comboMultiplier(state.combo),
        });
      }
      if (state.dead) setPhase("done");
    },
    [phase, haptic],
  );

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = stateRef.current;
    if (state) drawSalvo(ctx, state, splashes.current);
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

  const fire = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const state = stateRef.current;
    const canvas = canvasRef.current;
    if (!state || state.dead || !canvas) return;
    // The first tap starts the run and is also the first shot.
    if (phase === "intro") begin();
    else if (phase !== "playing") return;

    // Screen pixels back into world units — the canvas fills its box exactly.
    const box = canvas.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * WORLD_W;
    const y = ((event.clientY - box.top) / box.height) * WORLD_H;

    const outcomeOfShot = shoot(state, x, y);
    if (outcomeOfShot === "chip") {
      haptic("tap");
      playSound("tick");
    } else if (outcomeOfShot === "kill") {
      haptic("success");
      playSound("hit");
    } else if (outcomeOfShot === "void") {
      haptic("error");
      playSound("miss");
    }

    if (outcomeOfShot !== "chip" && outcomeOfShot !== "spent") {
      splashes.current = [
        ...splashes.current,
        { x, y, age: 0, kind: outcomeOfShot === "kill" ? "kill" : outcomeOfShot === "void" ? "void" : "miss" },
      ];
    }
  };

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
        game: "salvo",
        score: gameResult.score,
        targetScore: challenge.score,
        beat: gameResult.score > challenge.score,
      });
    }
  }, [phase, record, challenge]);

  // A replay skips the gate: the player has already told us they are in.
  const playAgain = useCallback(() => {
    recorded.current = false;
    trackEvent("game_retry", { game: "salvo", mode });
    arm();
    begin();
  }, [mode, arm, begin]);

  if (phase === "done" && !result) {
    return (
      <GameShell title="Salvo" eyebrow="Result">
        <GameLoading label="Scoring" />
      </GameShell>
    );
  }

  if (phase === "done" && result) {
    return (
      <GameShell title="Salvo" eyebrow="Result">
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
                { label: "Best streak", value: formatNumber(Number(result.detail?.bestCombo ?? 0)) },
                { label: "Wasted shots", value: formatNumber(Number(result.detail?.misses ?? 0)) },
                { label: "Time", value: formatSeconds(Number(result.detail?.elapsedMs ?? 0)) },
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
      title="Salvo"
      eyebrow={
        mode === "daily" ? "Daily targets" : challenge ? `Chasing ${challenge.name}` : "Three lives"
      }
      locked
      hud={
        <span
          aria-label={`${hud.lives} lives left`}
          className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-bold tabular ${
            hud.lives === 1 ? "border-hot/40 bg-hot/10 text-hot" : "border-line bg-surface/70 text-ink-dim"
          }`}
        >
          {"●".repeat(Math.max(0, hud.lives))}
          {"○".repeat(Math.max(0, STARTING_LIVES - hud.lives))}
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2 pb-2">
        <div className="flex items-center justify-between">
          <span aria-label={`Score ${hud.score}`} aria-live="polite" className="text-lg font-black tabular">
            {formatNumber(hud.score)}
          </span>
          <span
            className={`text-xs font-bold tabular ${hud.combo > 1.05 ? "text-accent" : "text-ink-faint"}`}
          >
            {hud.combo.toFixed(2).replace(/0$/, "")}x
          </span>
        </div>

        <div
          onPointerDown={fire}
          role="application"
          aria-label="Tap targets to shoot them"
          className="relative flex min-h-0 flex-1 touch-none items-center justify-center play-lock"
        >
          <div className="relative aspect-[3/4] h-full max-w-full overflow-hidden rounded-[var(--radius-card)] border border-line">
            <canvas ref={canvasRef} className="block h-full w-full" />

            {phase === "intro" ? (
              <StartOverlay onStart={begin} headline="Pick your shots." hint="Tap to start">
                Targets surface and burn down. Tap them before their ring empties — and leave the
                crossed ones alone.
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
