"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Waypoints } from "lucide-react";
import { GameLoading } from "@/components/game/game-loading";
import { GameShell } from "@/components/game/game-shell";
import { ResultScreen } from "@/components/game/result-screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trackEvent } from "@/lib/analytics";
import { getDailyChallenge } from "@/lib/daily/daily";
import { toDateKey } from "@/lib/daily/date-key";
import { createRng, type Rng } from "@/lib/rng";
import { formatNumber } from "@/lib/utils";
import { useGameParams } from "@/hooks/use-game-params";
import { useHaptics } from "@/hooks/use-haptics";
import { useRunRecorder, type RunOutcome } from "@/hooks/use-run-recorder";
import { usePlayer } from "@/providers/player/player-context";
import type { GameResult } from "@/types";
import {
  COMBO_MAX,
  COMBO_STEP,
  GRID,
  MIN_CHAIN,
  START_TIME_MS,
  canExtend,
  chainPoints,
  colOf,
  comboWindowMs,
  createBoard,
  hasMove,
  nextCombo,
  resolveChain,
  rowOf,
  type Board,
} from "./engine";
import { toGameResult } from "./scoring";

/* Tile colours read as a scale, so runs of same/+1 values are visible at a
   glance. Written as full literals so Tailwind generates them. */
const TILE_IDLE: Record<number, string> = {
  1: "border-ink-faint/25 bg-surface-2 text-ink-dim",
  2: "border-cool/30 bg-cool/10 text-cool",
  3: "border-accent/30 bg-accent/10 text-accent",
  4: "border-royal/35 bg-royal/12 text-royal",
  5: "border-amber/30 bg-amber/10 text-amber",
  6: "border-rose/30 bg-rose/10 text-rose",
};

const TILE_ACTIVE: Record<number, string> = {
  1: "border-ink bg-ink/20 text-ink",
  2: "border-cool bg-cool/25 text-cool",
  3: "border-accent bg-accent/25 text-accent",
  4: "border-royal bg-royal/30 text-royal",
  5: "border-amber bg-amber/25 text-amber",
  6: "border-rose bg-rose/25 text-rose",
};

/* Grid geometry in percentages, so the connector line and the score floaters
   land exactly on tile centres without measuring the DOM. */
const GAP_PCT = 2;
const CELL_PCT = (100 - GAP_PCT * (GRID - 1)) / GRID;
const centreOf = (index: number) => ({
  x: colOf(index) * (CELL_PCT + GAP_PCT) + CELL_PCT / 2,
  y: rowOf(index) * (CELL_PCT + GAP_PCT) + CELL_PCT / 2,
});

interface Floater {
  id: number;
  points: number;
  index: number;
}

interface RunStats {
  chains: number;
  longest: number;
  cleared: number;
  bestCombo: number;
  bestPoints: number;
}

const EMPTY_STATS: RunStats = { chains: 0, longest: 0, cleared: 0, bestCombo: 1, bestPoints: 0 };

export default function ChainGame() {
  const { mode, challenge } = useGameParams("chain");
  const { username } = usePlayer();
  const record = useRunRecorder("chain", mode);
  const haptic = useHaptics();
  const reduced = useReducedMotion();

  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [board, setBoard] = useState<Board>([]);
  const [path, setPath] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [comboLeft, setComboLeft] = useState(0);
  const [timeLeft, setTimeLeft] = useState(START_TIME_MS);
  const [stats, setStats] = useState<RunStats>(EMPTY_STATS);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [shuffleNote, setShuffleNote] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  const rng = useRef<Rng>(createRng("chain:init"));
  const nextId = useRef(0);
  const deadline = useRef(0);
  const startedAt = useRef(0);
  const lastChainAt = useRef(0);
  const dragging = useRef(false);
  const gestureExtended = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const floaterId = useRef(0);
  /** Mirrors stats.chains so the clock interval reads the live count. */
  const chainsRef = useRef(0);
  const recorded = useRef(false);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const dailyGoal = useMemo(
    () => (mode === "daily" ? getDailyChallenge(toDateKey()).goal : undefined),
    [mode],
  );

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    trackEvent("game_view", { game: "chain" });
    return clearTimers;
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    rng.current = createRng(
      mode === "daily" ? `daily:${toDateKey()}:chain` : `run:${Date.now()}:${Math.random()}`,
    );
    const created = createBoard(rng.current, 0);
    nextId.current = created.nextId;

    setBoard(created.board);
    setPath([]);
    setScore(0);
    setCombo(1);
    setComboLeft(0);
    setStats(EMPTY_STATS);
    setFloaters([]);
    setResult(null);
    setOutcome(null);
    setTimeLeft(START_TIME_MS);

    deadline.current = performance.now() + START_TIME_MS;
    startedAt.current = performance.now();
    lastChainAt.current = 0;
    chainsRef.current = 0;
    setPhase("playing");

    trackEvent("game_started", { game: "chain", mode });
    if (mode === "daily") {
      trackEvent("daily_challenge_started", { game: "chain", date: toDateKey() });
    }
  }, [clearTimers, mode]);

  /* ---------------------------------------------- clock + combo decay -- */
  useEffect(() => {
    if (phase !== "playing") return;
    const tick = setInterval(() => {
      const now = performance.now();
      const remaining = Math.max(0, deadline.current - now);
      setTimeLeft(remaining);

      const since = now - lastChainAt.current;
      const window = comboWindowMs(chainsRef.current);
      if (lastChainAt.current > 0 && since <= window) {
        setComboLeft(1 - since / window);
      } else {
        setComboLeft(0);
        setCombo((current) => (current > 1 ? 1 : current));
      }

      if (remaining <= 0) setPhase("done");
    }, 80);
    return () => clearInterval(tick);
  }, [phase]);

  /* --------------------------------------------------------- committing -- */
  const commit = useCallback(() => {
    if (phase !== "playing" || path.length < MIN_CHAIN) {
      setPath([]);
      return;
    }

    const now = performance.now();
    const since = lastChainAt.current === 0 ? Number.POSITIVE_INFINITY : now - lastChainAt.current;
    const applied = nextCombo(combo, since, comboWindowMs(chainsRef.current));
    const points = chainPoints(board, path, applied);

    setScore((current) => current + points);
    setCombo(applied);
    setComboLeft(1);
    lastChainAt.current = now;

    chainsRef.current += 1;
    setStats((current) => ({
      chains: current.chains + 1,
      longest: Math.max(current.longest, path.length),
      cleared: current.cleared + path.length,
      bestCombo: Math.max(current.bestCombo, applied),
      bestPoints: Math.max(current.bestPoints, points),
    }));

    const id = floaterId.current++;
    const tail = path[path.length - 1];
    setFloaters((current) => [...current, { id, points, index: tail }]);
    later(() => setFloaters((current) => current.filter((f) => f.id !== id)), 800);

    const resolved = resolveChain(board, path, rng.current, nextId.current);
    nextId.current = resolved.nextId;
    let updated = resolved.board;

    // A stuck player is a broken game, so deal a fresh grid if one ever dries up.
    if (!hasMove(updated)) {
      const fresh = createBoard(rng.current, nextId.current);
      nextId.current = fresh.nextId;
      updated = fresh.board;
      setShuffleNote((n) => n + 1);
      later(() => setShuffleNote(0), 1200);
    }

    setBoard(updated);
    setPath([]);
    haptic(path.length >= 5 ? "level" : "success");
  }, [phase, path, board, combo, haptic, later]);

  /* ------------------------------------------------------------- input -- */
  const tileAtPoint = (x: number, y: number): number | null => {
    const element = document.elementFromPoint(x, y);
    const tile = element?.closest("[data-tile]");
    if (!tile) return null;
    const value = Number(tile.getAttribute("data-tile"));
    return Number.isInteger(value) ? value : null;
  };

  const onTilePointerDown = (event: React.PointerEvent, index: number) => {
    if (phase !== "playing") return;
    event.preventDefault();
    gridRef.current?.setPointerCapture(event.pointerId);
    dragging.current = true;
    gestureExtended.current = false;

    // Tapping the tip of an existing path commits it — the tap-to-build route.
    if (path.length > 0 && index === path[path.length - 1]) {
      commit();
      return;
    }
    if (path.length > 0 && canExtend(board, path, index)) {
      setPath([...path, index]);
      return;
    }
    setPath([index]);
  };

  const onGridPointerMove = (event: React.PointerEvent) => {
    if (!dragging.current || phase !== "playing") return;
    const index = tileAtPoint(event.clientX, event.clientY);
    if (index === null) return;

    setPath((current) => {
      if (current.length === 0) return [index];
      const last = current[current.length - 1];
      if (index === last) return current;
      // Dragging back over the previous tile undoes a step.
      if (current.length >= 2 && index === current[current.length - 2]) {
        gestureExtended.current = true;
        return current.slice(0, -1);
      }
      if (canExtend(board, current, index)) {
        gestureExtended.current = true;
        return [...current, index];
      }
      return current;
    });
  };

  const endGesture = (event: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (gridRef.current?.hasPointerCapture(event.pointerId)) {
      gridRef.current.releasePointerCapture(event.pointerId);
    }
    if (!gestureExtended.current) return; // a stationary tap keeps the path
    if (path.length >= MIN_CHAIN) commit();
    else setPath([]);
  };

  // A light tick per tile added makes the drag feel physical.
  const previousLength = useRef(0);
  useEffect(() => {
    if (path.length > previousLength.current && path.length > 1) haptic("tap");
    previousLength.current = path.length;
  }, [path.length, haptic]);

  /* ------------------------------------------------------------ result -- */
  useEffect(() => {
    if (phase !== "done" || recorded.current) return;
    recorded.current = true;
    clearTimers();

    const summary = {
      score,
      chains: stats.chains,
      longestChain: stats.longest,
      tilesCleared: stats.cleared,
      bestCombo: stats.bestCombo,
      bestChainPoints: stats.bestPoints,
    };
    const gameResult = toGameResult(summary);
    setResult(gameResult);
    void record(gameResult, performance.now() - startedAt.current).then(setOutcome);

    if (challenge) {
      trackEvent("challenge_completed", {
        game: "chain",
        score: gameResult.score,
        targetScore: challenge.score,
        beat: gameResult.score > challenge.score,
      });
    }
  }, [phase, score, stats, record, challenge, clearTimers]);

  const playAgain = useCallback(() => {
    recorded.current = false;
    trackEvent("game_retry", { game: "chain", mode });
    start();
  }, [mode, start]);

  /* ------------------------------------------------------------ render -- */
  if (phase === "done" && !result) {
    // The clock flips the phase; the result lands one effect later. Without
    // this the live board renders for a frame after time is already up.
    return (
      <GameShell title="Chain" eyebrow="Result">
        <GameLoading label="Scoring" />
      </GameShell>
    );
  }

  if (phase === "done" && result) {
    return (
      <GameShell title="Chain" eyebrow="Result">
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
                { label: "Tiles cleared", value: formatNumber(stats.cleared) },
                { label: "Best chain", value: formatNumber(stats.bestPoints) },
                { label: "Top combo", value: `${stats.bestCombo.toFixed(2).replace(/0$/, "")}x` },
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
      <GameShell title="Chain" eyebrow="60 seconds">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-8">
          <div className="text-center">
            <span className="grid mx-auto size-14 place-items-center rounded-2xl bg-amber/10 text-amber">
              <Waypoints className="size-7" />
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight">Draw the longest route.</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">
              Drag through touching tiles. Each step must land on the{" "}
              <strong className="text-ink">same number</strong> or{" "}
              <strong className="text-ink">exactly one higher</strong>.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface/60 p-4">
            <div className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              A legal chain
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              {[2, 2, 3, 4].map((value, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 ? <span className="text-ink-faint">→</span> : null}
                  <span
                    className={`grid size-11 place-items-center rounded-xl border text-lg font-bold tabular ${TILE_IDLE[value]}`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-[0.6875rem] text-ink-faint">
              Diagonals count. Three tiles minimum. Longer routes pay far more.
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

  const urgent = timeLeft < 8000;
  const previewCombo = comboLeft > 0 ? Math.min(COMBO_MAX, combo + COMBO_STEP) : 1;
  const previewPoints = path.length >= MIN_CHAIN ? chainPoints(board, path, previewCombo) : 0;
  const connector = path.map((index) => {
    const { x, y } = centreOf(index);
    return `${x},${y}`;
  });

  return (
    <GameShell
      title="Chain"
      eyebrow={
        mode === "daily" ? "Daily challenge" : challenge ? `Chasing ${challenge.name}` : "60 seconds"
      }
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

        <div className="flex items-center justify-between gap-3">
          <span
            aria-label={`Score ${score}`}
            aria-live="polite"
            className="text-lg font-black tabular"
          >
            {formatNumber(score)}
          </span>

          <div className="flex items-center gap-2">
            {path.length >= MIN_CHAIN ? (
              <span className="rounded-[var(--radius-pill)] border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-bold tabular text-accent">
                {path.length} · +{formatNumber(previewPoints)}
              </span>
            ) : null}
            <div className="flex w-16 flex-col items-end gap-1">
              <span
                aria-label={`Combo ${combo}x`}
                className={`text-xs font-bold tabular ${combo > 1 ? "text-amber" : "text-ink-faint"}`}
              >
                {combo.toFixed(combo % 1 === 0 ? 0 : 1)}x
              </span>
              <span className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full rounded-full bg-amber transition-[width] duration-75 ease-linear"
                  style={{ width: `${Math.round(comboLeft * 100)}%` }}
                />
              </span>
            </div>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <div className="relative w-full max-w-[min(100%,26rem)]">
            <div
              ref={gridRef}
              onPointerMove={onGridPointerMove}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
              className="relative grid aspect-square w-full touch-none select-none play-lock"
              style={{
                gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))`,
                gap: `${GAP_PCT}%`,
              }}
            >
              {board.map((tile, index) => {
                const position = path.indexOf(index);
                const selected = position !== -1;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    data-tile={index}
                    aria-label={`Tile ${index + 1}, value ${tile.value}${selected ? `, step ${position + 1}` : ""}`}
                    onPointerDown={(event) => onTilePointerDown(event, index)}
                    className={[
                      "relative grid place-items-center rounded-xl border text-[clamp(1rem,6vw,1.6rem)] font-black tabular transition-colors duration-100",
                      selected ? TILE_ACTIVE[tile.value] : TILE_IDLE[tile.value],
                      // Above the connector line, so the number stays readable through it.
                      selected ? "z-30 scale-[0.94] ring-2 ring-accent/60" : "",
                    ].join(" ")}
                  >
                    {tile.value}
                  </button>
                );
              })}

              {connector.length > 1 ? (
                <svg
                  viewBox="0 0 100 100"
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-20 h-full w-full text-accent"
                >
                  <polyline
                    points={connector.join(" ")}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.75}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}

              <AnimatePresence>
                {floaters.map((floater) => {
                  const { x, y } = centreOf(floater.index);
                  return (
                    <m.span
                      key={floater.id}
                      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 0, scale: 0.8 }}
                      animate={reduced ? { opacity: 1 } : { opacity: 1, y: -26, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: reduced ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 text-base font-black tabular text-accent drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                    >
                      +{formatNumber(floater.points)}
                    </m.span>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {shuffleNote > 0 ? (
              <m.span
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-2 rounded-[var(--radius-pill)] border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-dim"
              >
                No routes left — fresh grid
              </m.span>
            ) : null}
          </AnimatePresence>
        </div>

        <p className="text-center text-[0.6875rem] text-ink-faint">
          Same number or one higher · diagonals count · {MIN_CHAIN} tiles minimum
        </p>
      </div>
    </GameShell>
  );
}
