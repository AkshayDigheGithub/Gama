import { toDateKey } from "@/lib/daily/date-key";
import {
  bestScoresSchema,
  playerSchema,
  settingsSchema,
  statsSchema,
  streakSchema,
} from "@/lib/player/schemas";
import type { PlayerStore, RecordResultInput, RecordResultOutcome } from "@/lib/player/types";
import { generatePlayerId, generateUsername, validateUsername } from "@/lib/player/username";
import { clearStore, readStore, updateStore, writeStore } from "@/lib/storage/store";
import { creditStreak, liveStreak } from "@/lib/streak/streak";
import { clamp } from "@/lib/utils";
import { MAX_SCORE, type Player, type Settings } from "@/types";

/** localStorage-backed player identity, stats, streak and settings. */
export class LocalPlayerStore implements PlayerStore {
  readonly name = "local";

  ensurePlayer(): Player {
    const existing = readStore(playerSchema);
    if (existing) return existing;
    const created: Player = {
      playerId: generatePlayerId(),
      username: generateUsername(),
      createdAt: Date.now(),
    };
    return writeStore(playerSchema, created) as Player;
  }

  getPlayer(): Player | null {
    return readStore(playerSchema);
  }

  setUsername(username: string): Player | null {
    const result = validateUsername(username);
    if (!result.ok) return this.getPlayer();
    const player = this.ensurePlayer();
    return writeStore(playerSchema, { ...player, username: result.value });
  }

  getStats() {
    return readStore(statsSchema);
  }

  getBestScores() {
    return readStore(bestScoresSchema);
  }

  getStreak() {
    return readStore(streakSchema);
  }

  getSettings() {
    return readStore(settingsSchema);
  }

  updateSettings(patch: Partial<Settings>): Settings {
    return updateStore(settingsSchema, (current) => ({ ...current, ...patch }));
  }

  /**
   * The one place a finished run is written down: stats, personal best and the
   * daily streak all move together, exactly once per completed game.
   */
  recordResult({ game, score, now = Date.now() }: RecordResultInput): RecordResultOutcome {
    const safeScore = clamp(Math.trunc(Number(score) || 0), 0, MAX_SCORE);
    const todayKey = toDateKey(new Date(now));

    const previousBest = readStore(bestScoresSchema)[game];
    const isPersonalBest = safeScore > previousBest;

    updateStore(statsSchema, (stats) => ({
      ...stats,
      totalGames: stats.totalGames + 1,
      [game]: {
        played: stats[game].played + 1,
        totalScore: stats[game].totalScore + safeScore,
        bestScore: Math.max(stats[game].bestScore, safeScore),
        lastPlayedAt: now,
      },
    }));

    if (isPersonalBest) {
      updateStore(bestScoresSchema, (best) => ({ ...best, [game]: safeScore }));
    }

    const before = readStore(streakSchema);
    const after = updateStore(streakSchema, (streak) => creditStreak(streak, todayKey, now));

    return {
      isPersonalBest,
      best: Math.max(previousBest, safeScore),
      streak: liveStreak(after, todayKey),
      streakExtended: after.lastPlayedDate !== before.lastPlayedDate,
    };
  }

  reset(): void {
    // Cleared one by one: the schemas have different value types, so a single
    // loop would erase the generic that keeps `clearStore` honest.
    clearStore(playerSchema);
    clearStore(statsSchema);
    clearStore(bestScoresSchema);
    clearStore(streakSchema);
    clearStore(settingsSchema);
  }
}

let instance: LocalPlayerStore | null = null;

export function getPlayerStore(): LocalPlayerStore {
  instance ??= new LocalPlayerStore();
  return instance;
}
