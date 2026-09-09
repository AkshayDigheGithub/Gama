"use client";

import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
import { Flame, RotateCcw, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChallengeFriendButton, ShareResultButton } from "@/components/challenge/challenge-actions";
import { PerformanceMeter } from "./performance-meter";
import { ScoreCounter } from "./score-counter";
import { StatTile } from "./stat-tile";
import type { GameMode } from "@/lib/analytics";
import type { ParsedChallenge } from "@/lib/challenge/types";
import { GAMES } from "@/lib/games";
import type { RunOutcome } from "@/hooks/use-run-recorder";
import { formatNumber } from "@/lib/utils";
import type { GameResult } from "@/types";

interface ResultScreenProps {
  result: GameResult;
  outcome: RunOutcome | null;
  mode: GameMode;
  username: string;
  challenge?: ParsedChallenge | null;
  dailyGoal?: number;
  onPlayAgain: () => void;
  /** Game-specific block rendered between the stats and the actions. */
  extra?: ReactNode;
}

interface Headline {
  text: string;
  tone: "accent" | "good" | "hot";
  icon?: ReactNode;
}

function headlineFor({
  result,
  outcome,
  challenge,
  mode,
}: Pick<ResultScreenProps, "result" | "outcome" | "challenge" | "mode">): Headline {
  if (challenge) {
    return result.score > challenge.score
      ? { text: `You beat ${challenge.name}!`, tone: "good", icon: <Flame className="size-6" /> }
      : { text: `${challenge.name} still leads`, tone: "hot" };
  }
  if (mode === "daily" && outcome?.dailyMet) {
    return { text: "Daily cleared", tone: "good", icon: <Trophy className="size-6" /> };
  }
  if (outcome?.isPersonalBest && result.score > 0) {
    return { text: "New personal best", tone: "accent", icon: <Flame className="size-6" /> };
  }
  if (result.performance >= 90) return { text: "Elite run", tone: "accent" };
  if (result.performance >= 70) return { text: "Nice!", tone: "accent" };
  if (result.performance >= 40) return { text: "Solid", tone: "accent" };
  return { text: "Warm-up done", tone: "accent" };
}

const TONE_CLASS = {
  accent: "text-accent",
  good: "text-good",
  hot: "text-hot",
} as const;

/**
 * The result screen every game shares.
 *
 * ONE MORE is the largest, brightest, lowest-friction control on the page —
 * it is the entire retention mechanism, so nothing is allowed to outrank it.
 */
export function ResultScreen({
  result,
  outcome,
  mode,
  username,
  challenge,
  dailyGoal,
  onPlayAgain,
  extra,
}: ResultScreenProps) {
  const reduced = useReducedMotion();
  const headline = headlineFor({ result, outcome, challenge, mode });
  const beatChallenge = challenge !== null && challenge !== undefined && result.score > challenge.score;
  const best = outcome?.best ?? result.score;
  const game = GAMES[result.game];

  const rise = (delay: number) =>
    reduced
      ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 py-6">
      <m.div {...rise(0)} className="flex flex-col items-center gap-3 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="neutral">{game.name}</Badge>
          {mode === "daily" ? <Badge variant="cool">Daily</Badge> : null}
          {challenge ? <Badge variant="royal">Challenge</Badge> : null}
          {outcome?.isPersonalBest && result.score > 0 ? <Badge variant="accent">Best</Badge> : null}
        </div>

        <div
          className={`flex items-center gap-2 text-2xl font-extrabold tracking-tight ${TONE_CLASS[headline.tone]}`}
        >
          {headline.icon}
          <span>{headline.text}</span>
        </div>
      </m.div>

      <m.div {...rise(0.08)} className="text-center">
        <div className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
          Your score
        </div>
        <ScoreCounter
          value={result.score}
          className="block text-[clamp(3.5rem,18vw,5.5rem)] leading-[0.95] font-black tracking-tighter text-ink"
        />
        {mode === "daily" && dailyGoal !== undefined ? (
          <p className="mt-1 text-sm text-ink-dim">
            Target {formatNumber(dailyGoal)} · {outcome?.dailyMet ? "cleared" : "not cleared yet"}
          </p>
        ) : null}
      </m.div>

      {challenge ? (
        <m.div
          {...rise(0.14)}
          className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface/60 p-4"
        >
          <div className="text-center">
            <div className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              You
            </div>
            <div className={`mt-1 text-2xl font-bold tabular ${beatChallenge ? "text-good" : "text-ink"}`}>
              {formatNumber(result.score)}
            </div>
          </div>
          <div className="border-l border-line text-center">
            <div className="truncate text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              {challenge.name}
            </div>
            <div className="mt-1 text-2xl font-bold tabular text-ink-dim">
              {formatNumber(challenge.score)}
            </div>
          </div>
        </m.div>
      ) : null}

      <m.div {...rise(0.18)} className="grid grid-cols-3 gap-2.5">
        <StatTile label="Best" value={formatNumber(best)} tone="accent" />
        {result.stats.slice(0, 2).map((stat) => (
          <StatTile key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
        ))}
      </m.div>

      {extra ? <m.div {...rise(0.22)}>{extra}</m.div> : null}

      <m.div {...rise(0.26)}>
        <PerformanceMeter value={result.performance} />
      </m.div>

      <m.div {...rise(0.3)} className="flex flex-col gap-2.5">
        <Button size="xl" block onClick={onPlayAgain} className="text-xl tracking-tight">
          <RotateCcw />
          ONE MORE
        </Button>

        <div className="grid grid-cols-2 gap-2.5">
          <ChallengeFriendButton
            variant="secondary"
            size="lg"
            game={result.game}
            score={result.score}
            username={username}
            label={beatChallenge ? "Share your win" : "Challenge friend"}
            message={
              beatChallenge && challenge
                ? `I just beat ${challenge.name} on ${game.name} — ${formatNumber(result.score)}. Your turn.`
                : undefined
            }
          />
          <ShareResultButton
            variant="outline"
            size="lg"
            game={result.game}
            score={result.score}
            username={username}
          />
        </div>
      </m.div>

      <m.div {...rise(0.34)} className="flex items-center justify-center gap-4 text-xs text-ink-faint">
        {outcome ? (
          <span className="tabular">
            #{formatNumber(outcome.rank)} of {formatNumber(outcome.total)} · demo board
          </span>
        ) : null}
        <Link href="/leaderboard" className="font-semibold text-ink-dim transition-colors hover:text-accent">
          Leaderboard
        </Link>
        <Link href="/games" className="font-semibold text-ink-dim transition-colors hover:text-accent">
          All games
        </Link>
      </m.div>
    </div>
  );
}
