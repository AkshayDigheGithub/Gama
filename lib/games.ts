import type { GameId } from "@/types";

export interface GameDefinition {
  id: GameId;
  name: string;
  href: string;
  /** One-line hook used on cards. */
  tagline: string;
  /** Longer copy — also the SEO description for the game page. */
  description: string;
  /** Typical run length, in seconds. */
  duration: number;
  durationLabel: string;
  /** Short, editorial rules shown on the game page and to crawlers. */
  howToPlay: string[];
  accent: "accent" | "cool" | "royal" | "amber";
  icon: "zap" | "target" | "brain" | "waypoints";
}

export const GAMES: Record<GameId, GameDefinition> = {
  reaction: {
    id: "reaction",
    name: "Reaction",
    href: "/games/reaction",
    tagline: "Five rounds. Pure reflex.",
    description:
      "A five-round reaction time test. Wait for the screen to flip, then tap as fast as you physically can. ONE MORE measures every round in milliseconds and scores your best and average reaction time.",
    duration: 30,
    durationLabel: "30 seconds",
    howToPlay: [
      "Hold still while the screen reads WAIT.",
      "The moment it flips to TAP, tap or click anywhere.",
      "Tapping early forfeits the round, so trust the flip.",
      "Five rounds decide your average, your best and your score.",
    ],
    accent: "accent",
    icon: "zap",
  },
  "crowd-pick": {
    id: "crowd-pick",
    name: "Crowd Pick",
    href: "/games/crowd-pick",
    tagline: "Pick the number nobody else picks.",
    description:
      "Choose a number from 1 to 100 and try to land somewhere the crowd never goes. Crowd Pick models the way people actually choose numbers — the lucky sevens, the birthdays, the safe middle — and rewards you for avoiding all of it.",
    duration: 20,
    durationLabel: "20 seconds",
    howToPlay: [
      "Drag the dial, or nudge it with the plus and minus keys.",
      "Lock in your pick before you talk yourself out of it.",
      "The fewer picks your number attracts, the higher your uniqueness.",
      "Crowd numbers in this MVP are simulated, not live players.",
    ],
    accent: "cool",
    icon: "target",
  },
  memory: {
    id: "memory",
    name: "Memory",
    href: "/games/memory",
    tagline: "Match the grid before the clock kills you.",
    description:
      "A memory matching run that starts at a friendly 2x2 and grows to a punishing 4x6. Every cleared level buys you more time, every mistake costs you two seconds. Time, mistakes and level all feed your score.",
    duration: 60,
    durationLabel: "60 seconds",
    howToPlay: [
      "Flip two tiles. Match them and they stay open.",
      "Clear the grid to bank a time bonus and climb a level.",
      "Every miss costs two seconds off the clock.",
      "The run ends when the clock does. Level reached is everything.",
    ],
    accent: "royal",
    icon: "brain",
  },
  chain: {
    id: "chain",
    name: "Chain",
    href: "/games/chain",
    tagline: "Draw the longest route you can find.",
    description:
      "A path-building puzzle on a 5x5 grid. Drag through touching tiles to build a chain — each step has to land on the same number or exactly one higher. Long chains pay far more, but the combo multiplier dies in under three seconds, so every route is a bet on how greedy you can afford to be.",
    duration: 60,
    durationLabel: "60 seconds",
    howToPlay: [
      "Drag through touching tiles — diagonals count.",
      "Each step must be the same number or exactly one higher.",
      "Three tiles minimum; longer routes are worth far more.",
      "Chain again within three seconds to build the multiplier.",
    ],
    accent: "amber",
    icon: "waypoints",
  },
};

export const GAME_LIST: GameDefinition[] = [
  GAMES.reaction,
  GAMES["crowd-pick"],
  GAMES.memory,
  GAMES.chain,
];

export function getGame(id: GameId): GameDefinition {
  return GAMES[id];
}
