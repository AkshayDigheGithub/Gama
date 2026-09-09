import type { LeaderboardProvider } from "@/lib/leaderboard/types";
import { LocalLeaderboardProvider } from "./local-leaderboard-provider";

export { LocalLeaderboardProvider };

let instance: LeaderboardProvider | null = null;

/**
 * Single place where the app decides which leaderboard backs the UI.
 * v2: return `new ApiLeaderboardProvider(...)` when a backend exists.
 */
export function getLeaderboardProvider(): LeaderboardProvider {
  instance ??= new LocalLeaderboardProvider();
  return instance;
}

export function setLeaderboardProvider(next: LeaderboardProvider): void {
  instance = next;
}
