import { createRng, hashString, randomInt } from "@/lib/rng";
import { GAMES } from "@/lib/games";
import { GAME_IDS, type GameId } from "@/types";
import { toDateKey, type DateKey } from "./date-key";

export interface DailyChallenge {
  date: DateKey;
  game: GameId;
  /** Score the player has to beat to clear the day. */
  goal: number;
  title: string;
  brief: string;
  /** Seed handed to the game so a day plays identically on every device. */
  seed: string;
}

/** Goal bands, tuned so a decent run clears the day but a lazy one does not. */
const GOAL_RANGE: Record<GameId, [number, number]> = {
  reaction: [5800, 7600],
  "crowd-pick": [5200, 7800],
  memory: [3600, 6200],
};

/**
 * Today's challenge, derived purely from the date.
 *
 * No database and no network: every device that agrees on the calendar day
 * agrees on the challenge, and the same device sees the same one all day.
 */
export function getDailyChallenge(date: DateKey = toDateKey()): DailyChallenge {
  const rng = createRng(`one-more-daily:${date}`);
  const game = GAME_IDS[hashString(date, 7) % GAME_IDS.length];
  const [min, max] = GOAL_RANGE[game];
  const goal = Math.round(randomInt(rng, min, max) / 20) * 20;
  const definition = GAMES[game];

  return {
    date,
    game,
    goal,
    title: `Beat today's ${definition.name} challenge.`,
    brief: BRIEFS[game],
    seed: `daily:${date}`,
  };
}

const BRIEFS: Record<GameId, string> = {
  reaction: "Five rounds, one clock. Score above today's target to clear the day.",
  "crowd-pick": "One number, one shot. Today's crowd is waiting — find the gap.",
  memory: "Climb the grid. Today's target needs a clean run, not a lucky one.",
};
