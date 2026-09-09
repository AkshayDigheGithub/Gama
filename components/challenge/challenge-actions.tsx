"use client";

import { Check, Copy, Share2, Swords } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { absoluteUrl, buildChallengePath } from "@/lib/challenge/encode";
import { GAMES } from "@/lib/games";
import { formatNumber } from "@/lib/utils";
import { useShare } from "@/hooks/use-share";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { GameId } from "@/types";

interface ChallengeButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  game: GameId;
  score: number;
  username: string;
  /** Overrides the default "can you beat me" copy, e.g. after beating someone. */
  message?: string;
  label?: string;
}

function labelFor(state: ReturnType<typeof useShare>["state"], fallback: string) {
  if (state === "copied") return "Link copied";
  if (state === "shared") return "Shared";
  if (state === "failed") return "Copy failed";
  return fallback;
}

/** Turns a finished run into a shareable link. No account, no backend. */
export function ChallengeFriendButton({
  game,
  score,
  username,
  message,
  label = "Challenge a friend",
  ...props
}: ChallengeButtonProps) {
  const { share, state } = useShare("result");

  const onClick = async () => {
    const url = absoluteUrl(buildChallengePath({ game, score, name: username }));
    trackEvent("challenge_created", { game, score });
    await share({
      title: "ONE MORE",
      text: message ?? `I scored ${formatNumber(score)} on ${GAMES[game].name}. Can you beat me?`,
      url,
    });
  };

  return (
    <Button onClick={onClick} {...props}>
      {state === "idle" ? <Swords /> : state === "failed" ? <Copy /> : <Check />}
      {labelFor(state, label)}
    </Button>
  );
}

/** Shares the run itself — same link shape, different framing. */
export function ShareResultButton({
  game,
  score,
  username,
  message,
  label = "Share",
  ...props
}: ChallengeButtonProps) {
  const { share, state } = useShare("result");

  const onClick = async () => {
    const url = absoluteUrl(buildChallengePath({ game, score, name: username }));
    await share({
      title: "ONE MORE",
      text: message ?? `${formatNumber(score)} on ${GAMES[game].name}. Play. Beat. One More.`,
      url,
    });
  };

  return (
    <Button onClick={onClick} {...props}>
      {state === "idle" ? <Share2 /> : state === "failed" ? <Copy /> : <Check />}
      {labelFor(state, label)}
    </Button>
  );
}
