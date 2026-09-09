import { createRng, randomInt, type Rng } from "@/lib/rng";
import { NAME_PREFIXES, NAME_SUFFIXES } from "@/lib/player/names";
import { GAME_IDS, type GameId } from "@/types";

/**
 * The demo roster.
 *
 * These are generated characters, not people. They exist so an empty MVP board
 * still communicates "this is a competition" — every surface that renders them
 * labels the board as a demo. Replacing this with real rows is a provider swap.
 */
export interface DemoPlayer {
  playerId: string;
  username: string;
  scores: Record<GameId, number>;
  total: number;
}

export const DEMO_ROSTER_SIZE = 120;

/** Rough ceiling each game's scoring can reach with a very strong run. */
const SCORE_CEILING: Record<GameId, number> = {
  reaction: 9800,
  "crowd-pick": 9900,
  memory: 12000,
  chain: 18000,
};

function makeName(rng: Rng, taken: Set<string>): string {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const prefix = NAME_PREFIXES[randomInt(rng, 0, NAME_PREFIXES.length - 1)];
    const suffix = NAME_SUFFIXES[randomInt(rng, 0, NAME_SUFFIXES.length - 1)];
    const name = attempt === 0 ? `${prefix}${suffix}` : `${prefix}${suffix}${randomInt(rng, 10, 99)}`;
    if (!taken.has(name)) {
      taken.add(name);
      return name;
    }
  }
  const fallback = `Player${taken.size + 1}`;
  taken.add(fallback);
  return fallback;
}

/**
 * Deterministic for a given seed: the same day always produces the same board,
 * so ranks do not shuffle between page views, and the roster refreshes daily.
 */
export function generateDemoRoster(seed: string): DemoPlayer[] {
  const rng = createRng(`one-more-roster:${seed}`);
  const taken = new Set<string>();

  return Array.from({ length: DEMO_ROSTER_SIZE }, (_, index) => {
    // A single latent "skill" per player keeps a strong player strong across
    // every board, which is what a real roster looks like.
    const skill = Math.pow(rng(), 0.75);
    const username = makeName(rng, taken);
    const scores = GAME_IDS.reduce(
      (acc, game) => {
        const noise = 0.88 + rng() * 0.24;
        const ceiling = SCORE_CEILING[game];
        acc[game] = Math.max(
          120,
          Math.round(ceiling * (0.22 + 0.78 * Math.pow(skill, 1.25)) * noise),
        );
        return acc;
      },
      {} as Record<GameId, number>,
    );

    return {
      playerId: `demo-${seed}-${index}`,
      username,
      scores,
      total: GAME_IDS.reduce((sum, game) => sum + scores[game], 0),
    };
  });
}
