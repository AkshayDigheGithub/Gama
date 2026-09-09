import { toDateKey } from "@/lib/daily/date-key";
import type {
  BoardId,
  GetLeaderboardOptions,
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardProvider,
  PlayerRank,
  ScoreSubmission,
  SubmitScoreResult,
} from "@/lib/leaderboard/types";
import { bestScoresSchema, playerSchema } from "@/lib/player/schemas";
import { readStore, updateStore } from "@/lib/storage/store";
import { sanitizeUsername } from "@/lib/player/username";
import { clamp } from "@/lib/utils";
import { GAME_IDS, MAX_SCORE, isGameId, type BestScores, type GameId } from "@/types";
import { generateDemoRoster, type DemoPlayer } from "./demo-roster";

interface Row {
  playerId: string;
  username: string;
  score: number;
  isYou: boolean;
  simulated: boolean;
}

/**
 * Browser-only leaderboard.
 *
 * The player's own best scores come from localStorage; everyone else is a
 * generated demo player. It satisfies the same async interface a networked
 * provider would, so swapping in `ApiLeaderboardProvider` later touches no UI.
 */
export class LocalLeaderboardProvider implements LeaderboardProvider {
  readonly name = "local";
  readonly simulated = true;

  private cachedSeed: string | null = null;
  private cachedRoster: DemoPlayer[] = [];

  private roster(seed: string): DemoPlayer[] {
    if (this.cachedSeed !== seed) {
      this.cachedSeed = seed;
      this.cachedRoster = generateDemoRoster(seed);
    }
    return this.cachedRoster;
  }

  private seed(): string {
    return toDateKey();
  }

  private youRow(board: BoardId): Row {
    const player = readStore(playerSchema);
    const best = readStore(bestScoresSchema);
    return {
      playerId: player?.playerId ?? "local",
      username: player?.username ?? "You",
      score: scoreForBoard(best, board),
      isYou: true,
      simulated: false,
    };
  }

  private rows(board: BoardId): Row[] {
    const seed = this.seed();
    const demo: Row[] = this.roster(seed).map((entry) => ({
      playerId: entry.playerId,
      username: entry.username,
      score: board === "overall" ? entry.total : entry.scores[board],
      isYou: false,
      simulated: true,
    }));

    const all = [...demo, this.youRow(board)];
    // Stable ordering: score desc, then name, so equal scores never jitter.
    all.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
    return all;
  }

  async getLeaderboard(board: BoardId, options: GetLeaderboardOptions = {}): Promise<LeaderboardPage> {
    const limit = clamp(options.limit ?? 10, 1, 100);
    const rows = this.rows(board);
    const ranked: LeaderboardEntry[] = rows.map((row, index) => ({ ...row, rank: index + 1 }));

    return {
      board,
      entries: ranked.slice(0, limit),
      you: ranked.find((entry) => entry.isYou) ?? null,
      total: ranked.length,
      simulated: this.simulated,
      generatedFor: this.seed(),
    };
  }

  async submitScore(submission: ScoreSubmission): Promise<SubmitScoreResult> {
    const game = isGameId(submission.game) ? submission.game : null;
    const score = clamp(Math.trunc(Number(submission.score) || 0), 0, MAX_SCORE);
    if (!game) {
      return { accepted: false, best: 0, isPersonalBest: false, rank: 0, total: 0 };
    }

    // Sanitising here as well as at the edges: a provider is the last gate
    // before data is persisted, and a network provider would validate too.
    sanitizeUsername(submission.username);

    const before = readStore(bestScoresSchema)[game];
    const isPersonalBest = score > before;
    if (isPersonalBest) {
      updateStore(bestScoresSchema, (current) => ({ ...current, [game]: score }));
    }

    const rank = await this.getPlayerRank(game, submission.playerId);
    return {
      accepted: true,
      best: Math.max(before, score),
      isPersonalBest,
      rank: rank.rank,
      total: rank.total,
    };
  }

  async getPlayerRank(board: BoardId, _playerId: string): Promise<PlayerRank> {
    void _playerId; // The local provider only ever ranks the local player.
    const rows = this.rows(board);
    const index = rows.findIndex((row) => row.isYou);
    const rank = index === -1 ? rows.length : index + 1;
    return {
      board,
      rank,
      total: rows.length,
      score: index === -1 ? 0 : rows[index].score,
      percentile: clamp(Math.round(((rows.length - rank) / Math.max(1, rows.length - 1)) * 100), 0, 100),
    };
  }
}

function scoreForBoard(best: BestScores, board: BoardId): number {
  if (board === "overall") {
    return GAME_IDS.reduce((sum, game: GameId) => sum + (best[game] ?? 0), 0);
  }
  return best[board] ?? 0;
}
