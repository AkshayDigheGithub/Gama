import type { GameId } from "@/types";

/**
 * The full event vocabulary. Keeping payloads typed here means a future
 * PostHog/GA adapter gets a stable contract instead of free-form strings.
 */
export interface AnalyticsEventMap {
  game_view: { game: GameId };
  game_started: { game: GameId; mode: GameMode };
  game_completed: { game: GameId; mode: GameMode; score: number; durationMs: number };
  game_retry: { game: GameId; mode: GameMode };
  challenge_created: { game: GameId; score: number };
  challenge_opened: { game: GameId; score: number };
  challenge_completed: { game: GameId; score: number; targetScore: number; beat: boolean };
  share_clicked: { surface: ShareSurface; method: "web-share" | "clipboard" };
  leaderboard_view: { board: GameId | "overall" };
  daily_challenge_started: { game: GameId; date: string };
  daily_challenge_completed: { game: GameId; date: string; score: number; goal: number; met: boolean };
  username_changed: Record<string, never>;
  streak_extended: { streak: number };
}

export type GameMode = "free" | "daily" | "challenge";
export type ShareSurface = "result" | "challenge-win" | "leaderboard" | "daily";

export type AnalyticsEventName = keyof AnalyticsEventMap;
