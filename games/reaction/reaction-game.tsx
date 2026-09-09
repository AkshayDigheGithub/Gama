"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Hand, Timer, Zap } from "lucide-react";
import { GameShell } from "@/components/game/game-shell";
import { ResultScreen } from "@/components/game/result-screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { createRng, type Rng } from "@/lib/rng";
import { getDailyChallenge } from "@/lib/daily/daily";
import { toDateKey } from "@/lib/daily/date-key";
import { formatMs, formatNumber } from "@/lib/utils";
import { useGameParams } from "@/hooks/use-game-params";
import { useHaptics } from "@/hooks/use-haptics";
import { useRunRecorder, type RunOutcome } from "@/hooks/use-run-recorder";
import { usePlayer } from "@/providers/player/player-context";
import type { GameResult } from "@/types";
import {
  REACTION_ROUNDS,
  SLOW_MS,
  nextWait,
  summarize,
  type ReactionRound,
} from "./engine";
import { toGameResult } from "./scoring";

type Phase = "intro" | "waiting" | "ready" | "feedback" | "done";

export default function ReactionGame() {
  const { mode, challenge } = useGameParams("reaction");
  const { username } = usePlayer();
  const record = useRunRecorder("reaction", mode);
  const haptic = useHaptics();
  const reduced = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("intro");
  const [rounds, setRounds] = useState<ReactionRound[]>([]);
  const [lastRound, setLastRound] = useState<ReactionRound | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  const flipAt = useRef(0);
  const startedAt = useRef(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const dailyGoal = useMemo(
    () => (mode === "daily" ? getDailyChallenge(toDateKey()).goal : undefined),
    [mode],
  );

  // A run's wait times come from one seeded generator, re-seeded when the
  // player starts a run — an event, never during render. Daily runs use the
  // date so every device faces the same rhythm.
  const rng = useRef<Rng>(createRng("reaction:init"));

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    trackEvent("game_view", { game: "reaction" });
    return clearTimers;
  }, [clearTimers]);

  const armRound = useCallback(() => {
    setPhase("waiting");
    later(() => {
      flipAt.current = performance.now();
      setPhase("ready");
      haptic("tap");
    }, nextWait(rng.current));
  }, [later, haptic]);

  const start = useCallback(() => {
    clearTimers();
    rng.current = createRng(
      mode === "daily" ? `daily:${toDateKey()}:reaction` : `run:${Date.now()}:${Math.random()}`,
    );
    setRounds([]);
    setLastRound(null);
    setResult(null);
    setOutcome(null);
    startedAt.current = performance.now();
    trackEvent(rounds.length ? "game_retry" : "game_started", { game: "reaction", mode });
    if (mode === "daily") {
      trackEvent("daily_challenge_started", { game: "reaction", date: toDateKey() });
    }
    armRound();
    // `rounds` intentionally excluded: it only picks the analytics event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armRound, clearTimers, mode]);

  const finishRound = useCallback(
    (round: ReactionRound) => {
      const next = [...rounds, round];
      setRounds(next);
      setLastRound(round);
      setPhase("feedback");
      haptic(round.foul ? "error" : "success");

      later(
        () => {
          if (next.length >= REACTION_ROUNDS) setPhase("done");
          else armRound();
        },
        round.foul ? 1100 : 750,
      );
    },
    [rounds, armRound, later, haptic],
  );

  const onTap = useCallback(() => {
    if (phase === "waiting") {
      clearTimers();
      finishRound({ index: rounds.length, ms: SLOW_MS, foul: true });
      return;
    }
    if (phase === "ready") {
      const ms = Math.max(1, Math.round(performance.now() - flipAt.current));
      finishRound({ index: rounds.length, ms, foul: false });
    }
  }, [phase, rounds.length, clearTimers, finishRound]);

  // Record the finished run exactly once.
  const recorded = useRef(false);
  useEffect(() => {
    if (phase !== "done" || recorded.current) return;
    recorded.current = true;
    const summary = summarize(rounds);
    const gameResult = toGameResult(summary);
    setResult(gameResult);
    void record(gameResult, performance.now() - startedAt.current).then(setOutcome);
    if (challenge) {
      trackEvent("challenge_completed", {
        game: "reaction",
        score: gameResult.score,
        targetScore: challenge.score,
        beat: gameResult.score > challenge.score,
      });
    }
  }, [phase, rounds, record, challenge]);

  const playAgain = useCallback(() => {
    recorded.current = false;
    setPhase("intro");
    clearTimers();
    setRounds([]);
    // Straight back in — the whole point of ONE MORE is zero friction.
    later(start, 0);
  }, [clearTimers, later, start]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "Enter") return;
      if (phase === "waiting" || phase === "ready") {
        event.preventDefault();
        onTap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onTap]);

  const playing = phase === "waiting" || phase === "ready" || phase === "feedback";
  const roundNumber = Math.min(rounds.length + (phase === "feedback" ? 0 : 1), REACTION_ROUNDS);

  if (phase === "done" && result) {
    return (
      <GameShell title="Reaction" eyebrow="Result">
        <ResultScreen
          result={result}
          outcome={outcome}
          mode={mode}
          username={username}
          challenge={challenge}
          dailyGoal={dailyGoal}
          onPlayAgain={playAgain}
          extra={<RoundBreakdown rounds={rounds} fasterThan={Number(result.detail?.fasterThan ?? 0)} />}
        />
      </GameShell>
    );
  }

  return (
    <GameShell
      title="Reaction"
      eyebrow={mode === "daily" ? "Daily challenge" : challenge ? `Chasing ${challenge.name}` : "5 rounds"}
      locked={playing}
      hud={
        playing ? (
          <span className="rounded-[var(--radius-pill)] border border-line bg-surface/70 px-3 py-1.5 text-xs font-bold tabular text-ink-dim">
            {roundNumber} / {REACTION_ROUNDS}
          </span>
        ) : null
      }
    >
      {phase === "intro" ? (
        <IntroPanel
          onStart={start}
          challengeName={challenge?.name}
          challengeScore={challenge?.score}
          dailyGoal={dailyGoal}
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label={phase === "ready" ? "Tap now" : "Wait for the signal"}
          onPointerDown={onTap}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              onTap();
            }
          }}
          className={[
            "play-lock relative mb-2 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border transition-colors duration-150 select-none",
            phase === "ready"
              ? "border-accent bg-accent text-accent-ink"
              : lastRound?.foul && phase === "feedback"
                ? "border-hot/50 bg-hot/15 text-hot"
                : "border-line bg-surface/60 text-ink",
          ].join(" ")}
        >
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={phase + (lastRound?.index ?? -1)}
              initial={reduced ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-3 px-6 text-center"
            >
              {phase === "waiting" ? (
                <>
                  <Timer className="size-7 text-ink-faint" />
                  <span className="text-[clamp(2.5rem,11vw,4rem)] leading-none font-black tracking-tight text-ink-dim">
                    WAIT…
                  </span>
                  <span className="text-sm text-ink-faint">Tap the moment it flips.</span>
                </>
              ) : null}

              {phase === "ready" ? (
                <>
                  <Hand className="size-8" />
                  <span className="text-[clamp(3.5rem,18vw,7rem)] leading-none font-black tracking-tighter">
                    TAP!
                  </span>
                </>
              ) : null}

              {phase === "feedback" && lastRound ? (
                lastRound.foul ? (
                  <>
                    <span className="text-[clamp(2rem,9vw,3.25rem)] leading-none font-black tracking-tight">
                      TOO EARLY
                    </span>
                    <span className="text-sm opacity-80">Round forfeited. Next one is coming.</span>
                  </>
                ) : (
                  <>
                    <span className="text-[clamp(3rem,15vw,5.5rem)] leading-none font-black tracking-tighter tabular text-accent">
                      {formatMs(lastRound.ms)}
                    </span>
                    <span className="text-sm text-ink-faint">
                      Round {lastRound.index + 1} of {REACTION_ROUNDS}
                    </span>
                  </>
                )
              ) : null}
            </m.div>
          </AnimatePresence>

          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
            {Array.from({ length: REACTION_ROUNDS }).map((_, index) => (
              <span
                key={index}
                className={[
                  "h-1 w-8 rounded-full transition-colors",
                  index < rounds.length
                    ? rounds[index].foul
                      ? "bg-hot/70"
                      : "bg-accent"
                    : phase === "ready"
                      ? "bg-accent-ink/25"
                      : "bg-line",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}

function IntroPanel({
  onStart,
  challengeName,
  challengeScore,
  dailyGoal,
}: {
  onStart: () => void;
  challengeName?: string;
  challengeScore?: number;
  dailyGoal?: number;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-8">
      <div className="text-center">
        <span className="grid mx-auto size-14 place-items-center rounded-2xl bg-accent/10 text-accent">
          <Zap className="size-7" />
        </span>
        <h2 className="mt-4 text-3xl font-black tracking-tight">Five rounds. Pure reflex.</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-dim">
          Wait for the screen to flip, then tap as fast as you can. Tap early and the round is gone.
        </p>
      </div>

      {challengeName && challengeScore !== undefined ? (
        <div className="rounded-2xl border border-royal/35 bg-royal/10 px-4 py-3.5 text-center">
          <div className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-royal">
            Challenge
          </div>
          <p className="mt-1 text-sm text-ink">
            <strong className="clamp-text">{challengeName}</strong> scored{" "}
            <strong className="tabular">{formatNumber(challengeScore)}</strong>
          </p>
        </div>
      ) : null}

      {dailyGoal !== undefined ? (
        <div className="rounded-2xl border border-line bg-surface/60 px-4 py-3.5 text-center">
          <Badge variant="cool">Daily target</Badge>
          <p className="mt-2 text-sm text-ink-dim">
            Score <strong className="tabular text-ink">{formatNumber(dailyGoal)}</strong> to clear today.
          </p>
        </div>
      ) : null}

      <Button size="xl" block onClick={onStart} className="text-lg">
        Start
      </Button>
      <p className="text-center text-xs text-ink-faint">Tap anywhere, or press space.</p>
    </div>
  );
}

function RoundBreakdown({ rounds, fasterThan }: { rounds: ReactionRound[]; fasterThan: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          Rounds
        </span>
        {fasterThan > 0 ? (
          <span className="text-xs text-ink-dim">
            Faster than <strong className="text-accent tabular">{fasterThan}%</strong> on our benchmark
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {rounds.map((round) => (
          <div
            key={round.index}
            className={[
              "rounded-xl border px-1 py-2 text-center text-xs font-bold tabular",
              round.foul ? "border-hot/30 bg-hot/10 text-hot" : "border-line bg-surface-2/60 text-ink",
            ].join(" ")}
          >
            {round.foul ? "—" : round.ms}
          </div>
        ))}
      </div>
    </div>
  );
}
