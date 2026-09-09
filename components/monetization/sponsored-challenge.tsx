import type { GameId } from "@/types";

export interface SponsoredChallengeSlot {
  id: string;
  game: GameId;
  sponsorName: string;
  headline: string;
  goal: number;
  href: string;
}

/**
 * Placeholder for a future sponsored daily challenge. Renders nothing until a
 * real, disclosed sponsorship exists — no invented brands, no fake ads.
 */
export function SponsoredChallenge({ slot }: { slot?: SponsoredChallengeSlot }) {
  if (!slot) return null;
  return null;
}
