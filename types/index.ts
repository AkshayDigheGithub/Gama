export type GameId =
  | "reaction"
  | "crowd-pick"
  | "memory"
  | "chain"
  | "rush"
  | "ascent"
  | "salvo";

export const GAME_IDS: readonly GameId[] = [
  "reaction",
  "crowd-pick",
  "memory",
  "chain",
  "rush",
  "ascent",
  "salvo",
];

export function isGameId(value: unknown): value is GameId {
  return typeof value === "string" && (GAME_IDS as readonly string[]).includes(value);
}

/** Hard ceiling applied to every score that enters the app from anywhere. */
export const MAX_SCORE = 1_000_000;

export interface Player {
  playerId: string;
  username: string;
  createdAt: number;
}

export interface GameStats {
  played: number;
  totalScore: number;
  bestScore: number;
  lastPlayedAt: number | null;
}

export type PlayerStats = Record<GameId, GameStats> & {
  totalGames: number;
};

export type BestScores = Record<GameId, number>;

export interface StreakState {
  /** "YYYY-MM-DD" of the last day a game was completed, or null. */
  lastPlayedDate: string | null;
  currentStreak: number;
  longestStreak: number;
  /** Monotonic guard against clock rollback / refresh farming. */
  lastCreditedAt: number | null;
}

export interface Settings {
  haptics: boolean;
  sound: boolean;
  reducedMotion: boolean;
}

/** A finished run of any game, in the shape every shared surface consumes. */
export interface GameResult {
  game: GameId;
  score: number;
  /** Small, display-ready facts, e.g. `[{ label: "Best", value: "143 ms" }]`. */
  stats: ResultStat[];
  /** 0–100 estimate from a fixed benchmark curve. Never a live percentile. */
  performance: number;
  /** Free-form, game-specific payload for result screens. */
  detail?: Record<string, number | string>;
}

export interface ResultStat {
  label: string;
  value: string;
  hint?: string;
}
