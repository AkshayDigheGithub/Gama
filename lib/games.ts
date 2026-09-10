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
  accent: "accent" | "cool" | "royal" | "amber" | "rose";
  icon: "zap" | "target" | "brain" | "waypoints" | "footprints" | "moveUp" | "crosshair";
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
  rush: {
    id: "rush",
    name: "Rush",
    href: "/games/rush",
    tagline: "Run, jump, slide. Don't stop.",
    description:
      "An endless runner where the course is generated from the date, so every player on a given day runs the exact same obstacles in the exact same order. Tap to jump and hold for height, tap low to slide under bars. Skimming a hazard or grabbing an orb builds a multiplier that decays the moment you start playing safe.",
    duration: 60,
    durationLabel: "60 seconds",
    howToPlay: [
      "Tap to jump; hold longer to jump higher.",
      "Tap low on the screen to slide, and hold it until you are clear.",
      "Spikes and blocks want a jump; low bars want a slide.",
      "Orbs and near misses build the multiplier. One hit ends the run.",
    ],
    accent: "accent",
    icon: "footprints",
  },
  ascent: {
    id: "ascent",
    name: "Ascent",
    href: "/games/ascent",
    tagline: "One button. Climb before the void does.",
    description:
      "A one-button wall-jump climber. You cling to a wall, sliding slowly down, and leap to the opposite side. Tapping gives a flat hop and holding gives a high arc, so the only real decision is how far up to aim — and spiked stretches of wall make some landings fatal. A void rises from below and never stops.",
    duration: 60,
    durationLabel: "60 seconds",
    howToPlay: [
      "Tap to leap to the opposite wall.",
      "Hold the tap for a higher arc, release early for a flat one.",
      "Landing on spikes ends the run, so pick your height before you jump.",
      "The void below rises faster the longer you last.",
    ],
    accent: "rose",
    icon: "moveUp",
  },
  salvo: {
    id: "salvo",
    name: "Salvo",
    href: "/games/salvo",
    tagline: "Hit the right targets. Leave the rest.",
    description:
      "A target-shooting run built on triage rather than reflex. Several targets are live at once, each burning down its own fuse, and they are not worth the same: rapid ones pay more but vanish sooner, shielded ones take two taps, and void targets must be left alone entirely. A wasted shot resets your streak, and letting a real target expire costs one of three lives.",
    duration: 60,
    durationLabel: "60 seconds",
    howToPlay: [
      "Tap a target before its ring empties.",
      "Rapid targets are smaller and pay more; shielded ones need two taps.",
      "Never shoot a crossed void target — let it burn out on its own.",
      "Missing resets your streak. Three expired targets end the run.",
    ],
    accent: "cool",
    icon: "crosshair",
  },
};

export const GAME_LIST: GameDefinition[] = [
  GAMES.reaction,
  GAMES["crowd-pick"],
  GAMES.memory,
  GAMES.chain,
  GAMES.rush,
  GAMES.ascent,
  GAMES.salvo,
];

export function getGame(id: GameId): GameDefinition {
  return GAMES[id];
}
