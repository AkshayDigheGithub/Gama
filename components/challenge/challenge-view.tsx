"use client";

import Link from "next/link";
import { useEffect } from "react";
import { m, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameIcon } from "@/components/game/game-icon";
import { ScoreCounter } from "@/components/game/score-counter";
import { trackEvent } from "@/lib/analytics";
import { buildVersusPath } from "@/lib/challenge/encode";
import type { ParsedChallenge } from "@/lib/challenge/types";
import { GAMES } from "@/lib/games";
import { usePlayer } from "@/providers/player/player-context";
import { formatNumber } from "@/lib/utils";

export function ChallengeView({ challenge }: { challenge: ParsedChallenge | null }) {
  const reduced = useReducedMotion();
  const { bestScores, hydrated } = usePlayer();

  useEffect(() => {
    if (challenge) trackEvent("challenge_opened", { game: challenge.game, score: challenge.score });
  }, [challenge]);

  if (!challenge) {
    return (
      <div className="mx-auto w-full max-w-md pad-safe py-20 text-center">
        <h1 className="text-3xl font-black tracking-tight">This challenge link is broken</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-dim">
          The link is missing a game or a score. Pick a game and set your own number instead — then
          send the rematch.
        </p>
        <Button asChild size="xl" block className="mt-8">
          <Link href="/games">
            Browse games
            <ArrowRight />
          </Link>
        </Button>
      </div>
    );
  }

  const game = GAMES[challenge.game];
  const yourBest = hydrated ? bestScores[challenge.game] : 0;
  const alreadyAhead = yourBest > challenge.score;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center pad-safe py-14 text-center">
      <m.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex w-full flex-col items-center"
      >
        <Badge variant="royal">
          <Swords />
          Challenge
        </Badge>

        <h1 className="mt-6 max-w-full text-3xl font-black tracking-tight clamp-text">
          {challenge.name} scored
        </h1>

        <ScoreCounter
          value={challenge.score}
          className="mt-2 block text-[clamp(4rem,20vw,6rem)] leading-[0.9] font-black tracking-tighter text-accent"
        />

        <p className="mt-3 flex items-center gap-2 text-sm text-ink-dim">
          <GameIcon icon={game.icon} className="size-4" />
          on {game.name} · {game.durationLabel}
        </p>

        <p className="mt-8 text-xl font-bold tracking-tight">Can you beat them?</p>

        <Button asChild size="xl" block className="mt-5 text-lg">
          <Link href={buildVersusPath(challenge)}>Accept challenge</Link>
        </Button>

        {hydrated && yourBest > 0 ? (
          <p className="mt-4 text-xs text-ink-faint">
            Your best on {game.name} is{" "}
            <strong className="tabular text-ink-dim">{formatNumber(yourBest)}</strong>
            {alreadyAhead ? " — you are already ahead. Prove it again." : "."}
          </p>
        ) : (
          <p className="mt-4 text-xs text-ink-faint">
            No account needed. The game starts as soon as you tap.
          </p>
        )}

        {!challenge.integrityOk ? (
          <p className="mt-6 flex items-start gap-2 rounded-xl border border-hot/30 bg-hot/10 px-3.5 py-3 text-left text-[0.6875rem] leading-relaxed text-hot">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            This link&apos;s checksum is missing or does not match, so the score above may have been
            edited. Scores in challenge links come from someone else&apos;s browser and are never
            verified.
          </p>
        ) : (
          <p className="mt-6 text-[0.6875rem] leading-relaxed text-ink-faint">
            Challenge scores travel inside the link itself. Nothing is stored on a server, and
            nothing is verified — treat it as a friendly wager.
          </p>
        )}
      </m.div>
    </div>
  );
}
