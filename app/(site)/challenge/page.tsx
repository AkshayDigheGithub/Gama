import type { Metadata } from "next";
import { ChallengeView } from "@/components/challenge/challenge-view";
import { parseChallengeParams } from "@/lib/challenge/encode";
import { GAMES } from "@/lib/games";
import { formatNumber } from "@/lib/utils";
import { canonical } from "@/lib/site";

/**
 * Challenge links are personal and infinite in number — they should never be
 * indexed, but they must still unfurl nicely when pasted into a chat.
 */
export async function generateMetadata({
  searchParams,
}: PageProps<"/challenge">): Promise<Metadata> {
  const challenge = parseChallengeParams(await searchParams);
  const title = challenge
    ? `${challenge.name} scored ${formatNumber(challenge.score)} on ${GAMES[challenge.game].name}`
    : "Challenge";
  const description = challenge
    ? `Can you beat ${formatNumber(challenge.score)}? Tap to play ${GAMES[challenge.game].name} — no account, no download.`
    : "Play a quick game and send the rematch.";

  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: canonical("/challenge") },
    openGraph: { title: `${title} — ONE MORE`, description, url: canonical("/challenge") },
    twitter: { card: "summary_large_image", title: `${title} — ONE MORE`, description },
  };
}

export default async function ChallengePage({ searchParams }: PageProps<"/challenge">) {
  const challenge = parseChallengeParams(await searchParams);
  return <ChallengeView challenge={challenge} />;
}
