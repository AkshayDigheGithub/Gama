"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { Minus, Plus, Target, Users } from "lucide-react";
import { GameShell } from "@/components/game/game-shell";
import { ResultScreen } from "@/components/game/result-screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { trackEvent } from "@/lib/analytics";
import { getDailyChallenge } from "@/lib/daily/daily";
import { toDateKey } from "@/lib/daily/date-key";
import { clamp, formatNumber } from "@/lib/utils";
import { useGameParams } from "@/hooks/use-game-params";
import { useHaptics } from "@/hooks/use-haptics";
import { useRunRecorder, type RunOutcome } from "@/hooks/use-run-recorder";
import { usePlayer } from "@/providers/player/player-context";
import type { GameResult } from "@/types";
import {
  MAX_PICK,
  MIN_PICK,
  evaluatePick,
  simulateCrowd,
  type CrowdModel,
  type PickEvaluation,
} from "./crowd";
import { toGameResult } from "./scoring";

export default function CrowdPickGame() {
  const { mode, challenge } = useGameParams("crowd-pick");
  const { username } = usePlayer();
  const record = useRunRecorder("crowd-pick", mode);
  const haptic = useHaptics();

  const [pick, setPick] = useState(50);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [evaluation, setEvaluation] = useState<PickEvaluation | null>(null);
  const [crowd, setCrowd] = useState<CrowdModel | null>(null);
  const startedAt = useRef(0);

  const dailyGoal = useMemo(
    () => (mode === "daily" ? getDailyChallenge(toDateKey()).goal : undefined),
    [mode],
  );

  useEffect(() => {
    trackEvent("game_view", { game: "crowd-pick" });
    startedAt.current = performance.now();
    trackEvent("game_started", { game: "crowd-pick", mode });
    if (mode === "daily") {
      trackEvent("daily_challenge_started", { game: "crowd-pick", date: toDateKey() });
    }
  }, [mode]);

  const lockIn = useCallback(() => {
    if (locked) return;
    setLocked(true);
    haptic("success");

    // The crowd is drawn at lock-in, so no simulation runs until it is needed
    // and the seed never has to be generated during render. Daily rounds face
    // the same crowd on every device; free rounds get a fresh one.
    const model = simulateCrowd(
      mode === "daily" ? `daily:${toDateKey()}` : `run:${Date.now()}:${Math.random()}`,
    );
    setCrowd(model);

    const evaluated = evaluatePick(model, pick);
    const gameResult = toGameResult(evaluated);
    setEvaluation(evaluated);
    setResult(gameResult);
    void record(gameResult, performance.now() - startedAt.current).then(setOutcome);

    if (challenge) {
      trackEvent("challenge_completed", {
        game: "crowd-pick",
        score: gameResult.score,
        targetScore: challenge.score,
        beat: gameResult.score > challenge.score,
      });
    }
  }, [locked, mode, pick, record, challenge, haptic]);

  const playAgain = useCallback(() => {
    setLocked(false);
    setResult(null);
    setOutcome(null);
    setEvaluation(null);
    setCrowd(null);
    startedAt.current = performance.now();
    trackEvent("game_retry", { game: "crowd-pick", mode });
  }, [mode]);

  if (locked && result && evaluation && crowd) {
    return (
      <GameShell title="Crowd Pick" eyebrow="Result">
        <ResultScreen
          result={result}
          outcome={outcome}
          mode={mode}
          username={username}
          challenge={challenge}
          dailyGoal={dailyGoal}
          onPlayAgain={playAgain}
          extra={<CrowdBreakdown crowd={crowd} evaluation={evaluation} />}
        />
      </GameShell>
    );
  }

  return (
    <GameShell
      title="Crowd Pick"
      eyebrow={mode === "daily" ? "Daily challenge" : challenge ? `Chasing ${challenge.name}` : "One shot"}
      locked
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-7 py-6">
        <div className="text-center">
          <span className="grid mx-auto size-14 place-items-center rounded-2xl bg-cool/10 text-cool">
            <Target className="size-7" />
          </span>
          <h2 className="mt-4 text-2xl font-black tracking-tight">Choose a number.</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-dim">
            Pick something the crowd won&apos;t. The fewer picks your number attracts, the higher
            you score.
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
              Score <strong className="tabular text-ink">{formatNumber(dailyGoal)}</strong> to clear
              today.
            </p>
          </div>
        ) : null}

        <div className="rounded-[var(--radius-card)] border border-line bg-surface/60 p-5">
          <div className="text-center">
            <m.div
              key={pick}
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="text-[clamp(4rem,22vw,6.5rem)] leading-none font-black tracking-tighter tabular text-ink"
            >
              {pick}
            </m.div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              aria-label="Lower"
              onClick={() => setPick((value) => clamp(value - 1, MIN_PICK, MAX_PICK))}
            >
              <Minus />
            </Button>
            <Slider
              value={[pick]}
              min={MIN_PICK}
              max={MAX_PICK}
              step={1}
              onValueChange={([value]) => setPick(value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Higher"
              onClick={() => setPick((value) => clamp(value + 1, MIN_PICK, MAX_PICK))}
            >
              <Plus />
            </Button>
          </div>

          <div className="mt-1 flex justify-between text-xs font-semibold tabular text-ink-faint">
            <span>{MIN_PICK}</span>
            <span>{MAX_PICK}</span>
          </div>
        </div>

        <Button size="xl" block onClick={lockIn} className="text-lg">
          Lock in
        </Button>

        <p className="text-center text-[0.6875rem] leading-relaxed text-ink-faint">
          <Users className="mr-1.5 inline size-3.5 align-[-2px]" />
          The crowd in this MVP is simulated from a model of how people pick numbers — not real
          players.
        </p>
      </div>
    </GameShell>
  );
}

function CrowdBreakdown({ crowd, evaluation }: { crowd: CrowdModel; evaluation: PickEvaluation }) {
  const reduced = useReducedMotion();
  const max = crowd.top[0]?.count || 1;
  const bars = crowd.counts.slice(MIN_PICK);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-line bg-surface/60 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            Simulated crowd
          </span>
          <span className="text-xs tabular text-ink-faint">
            {formatNumber(crowd.total)} virtual picks
          </span>
        </div>

        <div className="mt-3 flex h-24 items-end gap-px" aria-hidden>
          {bars.map((count, index) => {
            const value = index + MIN_PICK;
            const mine = value === evaluation.pick;
            return (
              <m.span
                key={value}
                initial={reduced ? false : { height: 0 }}
                animate={{ height: `${Math.max(3, (count / max) * 100)}%` }}
                transition={{
                  duration: reduced ? 0 : 0.5,
                  delay: reduced ? 0 : Math.min(index * 0.004, 0.4),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`flex-1 rounded-t-[1px] ${mine ? "bg-accent" : "bg-ink-faint/30"}`}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[0.625rem] tabular text-ink-faint">
          <span>{MIN_PICK}</span>
          <span className="text-accent">
            you · {evaluation.pick}
          </span>
          <span>{MAX_PICK}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface/60 p-4">
        <span className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          Crowd favourites
        </span>
        <ul className="mt-3 flex flex-col gap-1.5">
          {crowd.top.slice(0, 3).map((entry) => (
            <li key={entry.value} className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold tabular">{entry.value}</span>
              <span className="tabular text-ink-dim">{formatNumber(entry.count)} picks</span>
            </li>
          ))}
          <li className="mt-1 flex items-center justify-between gap-3 border-t border-line pt-2.5 text-sm">
            <span className="font-bold tabular text-accent">{evaluation.pick} · you</span>
            <span className="tabular text-accent">{formatNumber(evaluation.count)} picks</span>
          </li>
        </ul>
        <p className="mt-3 text-[0.6875rem] leading-relaxed text-ink-faint">
          Rarest number on the board is rank 1; yours came in at{" "}
          <strong className="text-ink-dim tabular">#{evaluation.rarityRank}</strong> of {MAX_PICK}.
        </p>
      </div>
    </div>
  );
}
