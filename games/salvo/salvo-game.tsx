"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair } from "lucide-react";
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

  const start = useCallback(() => {
    stateRef.current = createSalvo(
      mode === "daily" ? `daily:${toDateKey()}` : `run:${Date.now()}:${Math.random()}`,
    );
    splashes.current = [];
    setHud({ score: 0, lives: STARTING_LIVES, combo: 1 });
    setResult(null);
    setOutcome(null);
    startedAt.current = performance.now();
    publishedAt.current = 0;
    setPhase("playing");
    trackEvent("game_started", { game: "salvo", mode });
    if (mode === "daily") {
      trackEvent("daily_challenge_started", { game: "salvo", date: toDateKey() });
    }
  }, [mode]);

  const step = useCallback(
    (fixedMs: number) => {
      const state = stateRef.current;
      if (!state || state.dead) return;
      const livesBefore = state.lives;
      stepSalvo(state, fixedMs);

      splashes.current = splashes.current
        .map((splash) => ({ ...splash, age: splash.age + fixedMs }))
        .filter((splash) => splash.age < SPLASH_MS);

      if (state.lives < livesBefore) haptic("error");

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
    [haptic],
  );

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = stateRef.current;
    if (state) drawSalvo(ctx, state, splashes.current);
  }, []);

  useGameLoop({
    canvasRef,
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    running: phase === "playing",
    step,
    draw,
  });

  const fire = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const state = stateRef.current;
    const canvas = canvasRef.current;
    if (!state || state.dead || !canvas || phase !== "playing") return;

    // Screen pixels back into world units — the canvas fills its box exactly.
    const box = canvas.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * WORLD_W;
    const y = ((event.clientY - box.top) / box.height) * WORLD_H;

    const outcomeOfShot = shoot(state, x, y);
    if (outcomeOfShot === "chip") haptic("tap");
    else if (outcomeOfShot === "kill") haptic("success");
    else if (outcomeOfShot === "void") haptic("error");

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

  const playAgain = useCallback(() => {
    recorded.current = false;
    trackEvent("game_retry", { game: "salvo", mode });
    start();
  }, [mode, start]);

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

  if (phase === "intro") {
    return (
      <GameShell title="Salvo" eyebrow="Three lives">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-8">
          <div className="text-center">
            <span className="grid mx-auto size-14 place-items-center rounded-2xl bg-cool/10 text-cool">
              <Crosshair className="size-7" />
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight">Pick your shots.</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">
              Targets surface and burn down. Tap them before their ring empties — and leave the
              crossed ones alone.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface/60 p-4">
            <ul className="flex flex-col gap-2.5 text-sm text-ink-dim">
              <li className="flex items-center gap-3">
                <span className="size-4 shrink-0 rounded-full bg-accent" />
                <span>
                  <strong className="text-ink">Standard.</strong> Tap once.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="size-3 shrink-0 rounded-full bg-cool" />
                <span>
                  <strong className="text-ink">Rapid.</strong> Smaller, quicker fuse, worth more.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="size-4 shrink-0 rounded-full border-2 border-royal" />
                <span>
                  <strong className="text-ink">Shielded.</strong> Takes two taps.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-4 shrink-0 place-items-center rounded-full border-2 border-rose text-[0.5rem] font-black text-rose">
                  ×
                </span>
                <span>
                  <strong className="text-rose">Void.</strong> Never shoot it. Let it burn out.
                </span>
              </li>
            </ul>
            <p className="mt-3 border-t border-line pt-3 text-[0.6875rem] leading-relaxed text-ink-faint">
              A wasted shot resets your streak. Letting a real target expire costs a life — you have
              three.
            </p>
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
                clear today. Everyone gets the same targets.
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
          </div>
        </div>
      </div>
    </GameShell>
  );
}
