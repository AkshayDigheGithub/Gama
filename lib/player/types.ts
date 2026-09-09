import type {
  BestScores,
  GameId,
  Player,
  PlayerStats,
  Settings,
  StreakState,
} from "@/types";

export interface RecordResultInput {
  game: GameId;
  score: number;
  /** Injectable clock, so streak behaviour is testable. */
  now?: number;
}

export interface RecordResultOutcome {
  isPersonalBest: boolean;
  best: number;
  streak: number;
  streakExtended: boolean;
}

/**
 * The player seam.
 *
 * `LocalPlayerStore` keeps everything in the browser. A v2 provider backed by
 * real accounts implements the same surface and the UI does not change.
 */
export interface PlayerStore {
  readonly name: string;
  ensurePlayer(): Player;
  getPlayer(): Player | null;
  setUsername(username: string): Player | null;
  getStats(): PlayerStats;
  getBestScores(): BestScores;
  getStreak(): StreakState;
  getSettings(): Settings;
  updateSettings(patch: Partial<Settings>): Settings;
  recordResult(input: RecordResultInput): RecordResultOutcome;
  reset(): void;
}
