"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import {
  Anchor,
  Brain,
  Crown,
  Flame,
  Gem,
  Ghost,
  Leaf,
  Moon,
  Star,
  Sun,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { GameLoading } from "@/components/game/game-loading";
import { GameShell } from "@/components/game/game-shell";
import { ResultScreen } from "@/components/game/result-screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trackEvent } from "@/lib/analytics";
import { getDailyChallenge } from "@/lib/daily/daily";
import { toDateKey } from "@/lib/daily/date-key";
import { createRng } from "@/lib/rng";
import { estimatePerformance } from "@/lib/scoring/percentile";
import { formatNumber, formatSeconds } from "@/lib/utils";
import { useGameParams } from "@/hooks/use-game-params";
import { useHaptics } from "@/hooks/use-haptics";
import { useRunRecorder, type RunOutcome } from "@/hooks/use-run-recorder";
import { usePlayer } from "@/providers/player/player-context";
import type { GameResult } from "@/types";
import {
  MISTAKE_PENALTY_MS,
  START_TIME_MS,
  buildBoard,
  getLevel,
  isLevelComplete,
  memoryReducer,
  type MemorySymbol,
  type MemoryState,
} from "./engine";
import { finalMemoryScore, levelClearPoints } from "./scoring";

const ICONS: Record<MemorySymbol, LucideIcon> = {
  bolt: Zap,
  target: Target,
  brain: Brain,
  flame: Flame,
  star: Star,
  gem: Gem,
  moon: Moon,
  sun: Sun,
  leaf: Leaf,
  anchor: Anchor,
  ghost: Ghost,
  crown: Crown,
};

const EMPTY_STATE: MemoryState = { level: 1, tiles: [], openIds: [], mistakes: 0, locked: false };

type Phase = "intro" | "playing" | "done";

export default function MemoryGame() {
  const { mode, challenge } = useGameParams("memory");
  const { username } = usePlayer();
  const record = useRunRecorder("memory", mode);
  const haptic = useHaptics();
  const reduced = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("intro");
  const [state, dispatch] = useReducer(memoryReducer, EMPTY_STATE);
  const [timeLeft, setTimeLeft] = useState(START_TIME_MS);
  const [banked, setBanked] = useState(0);
  const [clearedMistakes, setClearedMistakes] = useState(0);
  const [levelFlash, setLevelFlash] = useState<number | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  // Re-seeded when a run starts (an event), so boards differ between runs
  // without generating randomness during render.
  const seed = useRef("memory:init");
  const deadline = useRef(0);
  const startedAt = useRef(0);
  const previousMistakes = useRef(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const dailyGoal = useMemo(
    () => (mode === "daily" ? getDailyChallenge(toDateKey()).goal : undefined),
    [mode],
  );
  const level = getLevel(state.level);
  const totalMistakes = clearedMistakes + state.mistakes;

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    trackEvent("game_view", { game: "memory" });
    return clearTimers;
  }, [clearTimers]);

  const loadLevel = useCallback((nextLevel: number) => {
    const config = getLevel(nextLevel);
    const rng = createRng(`${seed.current}:level:${nextLevel}`);
    dispatch({ type: "load", level: nextLevel, tiles: buildBoard(config, rng) });
    previousMistakes.current = 0;
  }, []);

  const start = useCallback(() => {
    clearTimers();
    seed.current =
      mode === "daily" ? `daily:${toDateKey()}:memory` : `run:${Date.now()}:${Math.random()}`;
    setBanked(0);
    setClearedMistakes(0);
    setLevelFlash(null);
    setResult(null);
    setOutcome(null);
    setTimeLeft(START_TIME_MS);
    deadline.current = performance.now() + START_TIME_MS;
    startedAt.current = performance.now();
    loadLevel(1);
    setPhase("playing");
    trackEvent("game_started", { game: "memory", mode });
    if (mode === "daily") {
      trackEvent("daily_challenge_started", { game: "memory", date: toDateKey() });
    }
  }, [clearTimers, loadLevel, mode]);

  /* ------------------------------------------------------------- clock -- */
  useEffect(() => {
    if (phase !== "playing") return;
    const tick = setInterval(() => {
      const remaining = Math.max(0, deadline.current - performance.now());
      setTimeLeft(remaining);
      if (remaining <= 0) setPhase("done");
    }, 100);
    return () => clearInterval(tick);
  }, [phase]);

  /* --------------------------------------------------------- mistakes -- */
  useEffect(() => {
    if (state.mistakes <= previousMistakes.current) return;
    previousMistakes.current = state.mistakes;
    deadline.current -= MISTAKE_PENALTY_MS;
    haptic("error");
    later(() => dispatch({ type: "resolve" }), level.mismatchMs);
  }, [state.mistakes, level.mismatchMs, haptic, later]);

  /* ---------------------------------------------------- level clearing -- */
  useEffect(() => {
    if (phase !== "playing" || state.tiles.length === 0 || !isLevelComplete(state)) return;

    const remaining = Math.max(0, deadline.current - performance.now());
    setBanked((points) => points + levelClearPoints(state.level, remaining));
    setClearedMistakes((count) => count + state.mistakes);
    deadline.current = performance.now() + remaining + level.timeBonusMs;
    setLevelFlash(state.level + 1);
    haptic("level");

    later(() => {
      setLevelFlash(null);
      loadLevel(state.level + 1);
    }, reduced ? 120 : 700);
    // `state` is the trigger; the rest are stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tiles, phase]);

  /* ------------------------------------------------------------- result -- */
  const recorded = useRef(false);
  useEffect(() => {
    if (phase !== "done" || recorded.current) return;
    recorded.current = true;
    clearTimers();

    const score = finalMemoryScore(banked, totalMistakes);
    const elapsed = performance.now() - startedAt.current;
    const gameResult: GameResult = {
      game: "memory",
      score,
      performance: estimatePerformance("memory", score),
      stats: [
        { label: "Level", value: String(state.level) },
        { label: "Mistakes", value: String(totalMistakes) },
      ],
      detail: { level: state.level, mistakes: totalMistakes, elapsedMs: Math.round(elapsed) },
    };
    setResult(gameResult);
    void record(gameResult, elapsed).then(setOutcome);

    if (challenge) {
      trackEvent("challenge_completed", {
        game: "memory",
        score,
        targetScore: challenge.score,
        beat: score > challenge.score,
      });
    }
  }, [phase, banked, totalMistakes, state.level, record, challenge, clearTimers]);

  const playAgain = useCallback(() => {
    recorded.current = false;
    trackEvent("game_retry", { game: "memory", mode });
    start();
  }, [mode, start]);

  const onFlip = useCallback(
    (id: number) => {
      if (state.locked) return;
      haptic("tap");
      dispatch({ type: "flip", id });
    },
    [state.locked, haptic],
  );

  if (phase === "done" && !result) {
    // The clock flips the phase; the result lands one effect later.
    return (
      <GameShell title="Memory" eyebrow="Result">
        <GameLoading label="Scoring" />
      </GameShell>
    );
  }

  if (phase === "done" && result) {
    return (
      <GameShell title="Memory" eyebrow="Result">
        <ResultScreen
          result={result}
          outcome={outcome}
          mode={mode}
          username={username}
          challenge={challenge}
          dailyGoal={dailyGoal}
          onPlayAgain={playAgain}
          extra={
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-line bg-surface/60 px-4 py-3.5 text-center">
                <div className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                  Time
                </div>
                <div className="mt-1 text-xl font-bold tabular">
                  {formatSeconds(Number(result.detail?.elapsedMs ?? 0))}
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-surface/60 px-4 py-3.5 text-center">
                <div className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                  Grids cleared
                </div>
                <div className="mt-1 text-xl font-bold tabular">{state.level - 1}</div>
              </div>
            </div>
          }
        />
      </GameShell>
    );
  }

  if (phase === "intro") {
    return (
      <GameShell title="Memory" eyebrow="Beat the clock">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-8">
          <div className="text-center">
            <span className="grid mx-auto size-14 place-items-center rounded-2xl bg-royal/12 text-royal">
              <Brain className="size-7" />
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight">Match. Climb. Survive.</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">
              Clear the grid to bank time and climb a level. Every miss costs two seconds. The run
              ends when the clock does.
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
                clear today.
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

  const urgent = timeLeft < 5000;

  return (
    <GameShell
      title="Memory"
      eyebrow={`Level ${state.level} · ${level.cols}×${level.rows}`}
      locked
      hud={
        <span
          className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-bold tabular ${
            urgent ? "border-hot/40 bg-hot/10 text-hot" : "border-line bg-surface/70 text-ink-dim"
          }`}
        >
          {(timeLeft / 1000).toFixed(1)}s
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 pb-2">
        <Progress
          value={timeLeft}
          max={START_TIME_MS}
          label="Time remaining"
          barClassName={urgent ? "bg-hot" : "bg-accent"}
        />

        <div className="flex items-center justify-between text-xs text-ink-faint">
          <span className="tabular">Score {formatNumber(finalMemoryScore(banked, totalMistakes))}</span>
          <span className="tabular">
            {totalMistakes} {totalMistakes === 1 ? "mistake" : "mistakes"}
          </span>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <AnimatePresence>
            {levelFlash ? (
              <m.div
                initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-[var(--radius-card)] bg-canvas/85 backdrop-blur-sm"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">
                  Level
                </span>
                <span className="text-[clamp(4rem,20vw,7rem)] leading-none font-black tracking-tighter text-accent">
                  {levelFlash}
                </span>
                <span className="text-sm text-ink-dim">
                  +{(level.timeBonusMs / 1000).toFixed(0)}s banked
                </span>
              </m.div>
            ) : null}
          </AnimatePresence>

          <div
            className="grid w-full gap-2 play-lock"
            style={{
              gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))`,
              // Keeps a 2x2 board from ballooning into four huge slabs while
              // still letting a 4-wide board use the full screen.
              maxWidth: `min(100%, ${level.cols * 6.5}rem)`,
            }}
          >
            {state.tiles.map((tile) => {
              const Icon = tile.symbol ? ICONS[tile.symbol] : null;
              const faceUp = tile.state !== "hidden";
              return (
                <button
                  key={tile.id}
                  type="button"
                  disabled={tile.kind === "blocker" || tile.state === "matched" || state.locked}
                  aria-label={tile.kind === "blocker" ? "Blocked tile" : `Tile ${tile.id + 1}`}
                  onPointerDown={() => onFlip(tile.id)}
                  className="relative aspect-square min-h-11 [perspective:800px] disabled:cursor-default"
                >
                  <m.span
                    className="absolute inset-0 [transform-style:preserve-3d]"
                    animate={{ rotateY: faceUp ? 180 : 0 }}
                    transition={{ duration: reduced ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="absolute inset-0 grid place-items-center rounded-xl border border-line bg-surface-2 [backface-visibility:hidden]">
                      <span className="size-1.5 rounded-full bg-ink-faint/40" />
                    </span>
                    <span
                      className={[
                        "absolute inset-0 grid place-items-center rounded-xl border [backface-visibility:hidden] [transform:rotateY(180deg)]",
                        tile.kind === "blocker"
                          ? "border-line bg-surface/40 text-ink-faint/40"
                          : tile.state === "matched"
                            ? "border-accent/40 bg-accent/12 text-accent"
                            : "border-ink-faint/40 bg-surface text-ink",
                      ].join(" ")}
                    >
                      {Icon ? (
                        <Icon className="size-[min(7vw,1.75rem)]" />
                      ) : (
                        <span className="text-lg font-black">×</span>
                      )}
                    </span>
                  </m.span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </GameShell>
  );
}
