import type { GameId } from "@/types";

export type BoardId = GameId | "overall";

export const BOARD_IDS: readonly BoardId[] = ["overall", "reaction", "crowd-pick", "memory", "chain"];

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  score: number;
  /** True for the local player's own row. */
  isYou: boolean;
  /** True for generated demo players. Always surfaced in the UI. */
  simulated: boolean;
}

export interface LeaderboardPage {
  board: BoardId;
  entries: LeaderboardEntry[];
  /** The local player's row, even when it falls outside the visible top N. */
  you: LeaderboardEntry | null;
  total: number;
  /** Whether the roster behind this board is generated rather than real. */
  simulated: boolean;
  /** Seed/day this board was generated for — lets the UI show freshness. */
  generatedFor: string;
}

export interface ScoreSubmission {
  game: GameId;
  playerId: string;
  username: string;
  score: number;
}

export interface SubmitScoreResult {
  accepted: boolean;
  /** The player's best score for the game after submission. */
  best: number;
  isPersonalBest: boolean;
  rank: number;
  total: number;
}

export interface PlayerRank {
  board: BoardId;
  rank: number;
  total: number;
  score: number;
  /** 0–100. Share of the board this player is ahead of. */
  percentile: number;
}

export interface GetLeaderboardOptions {
  limit?: number;
  /** Include rows around the player even if they are outside the top slice. */
  around?: boolean;
}

/**
 * The leaderboard seam.
 *
 * `LocalLeaderboardProvider` is the MVP implementation. A v2
 * `ApiLeaderboardProvider` implements the same three methods against a real
 * backend and the entire leaderboard + result UI keeps working untouched.
 */
export interface LeaderboardProvider {
  readonly name: string;
  /** True when the roster is generated. The UI must label simulated boards. */
  readonly simulated: boolean;
  getLeaderboard(board: BoardId, options?: GetLeaderboardOptions): Promise<LeaderboardPage>;
  submitScore(submission: ScoreSubmission): Promise<SubmitScoreResult>;
  getPlayerRank(board: BoardId, playerId: string): Promise<PlayerRank>;
}
