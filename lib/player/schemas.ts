import { STORAGE_KEYS } from "@/lib/storage/keys";
import type { StorageSchema } from "@/lib/storage/store";
import { clamp } from "@/lib/utils";
import {
  GAME_IDS,
  MAX_SCORE,
  type BestScores,
  type GameId,
  type GameStats,
  type Player,
  type PlayerStats,
  type Settings,
  type StreakState,
} from "@/types";
import { sanitizeUsername } from "./username";

const SCHEMA_VERSION = 1;

/**
 * Settings alone is at 2: see `settingsSchema.revive` for what changed. Each
 * schema carries its own version so one migration cannot invalidate stats and
 * streaks that are still perfectly readable.
 */
const SETTINGS_VERSION = 2;

function record<T>(make: (game: GameId) => T): Record<GameId, T> {
  return GAME_IDS.reduce(
    (acc, game) => {
      acc[game] = make(game);
      return acc;
    },
    {} as Record<GameId, T>,
  );
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function safeScore(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
  return clamp(n, 0, MAX_SCORE);
}

function safeCount(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
  return clamp(n, 0, 10_000_000);
}

/* ---------------------------------------------------------------- player -- */

export const EMPTY_PLAYER: Player | null = null;

export const playerSchema: StorageSchema<Player | null> = {
  key: STORAGE_KEYS.player,
  version: SCHEMA_VERSION,
  fallback: EMPTY_PLAYER,
  revive(value) {
    const obj = asObject(value);
    if (!obj) return null;
    const username = sanitizeUsername(obj.username);
    if (typeof obj.playerId !== "string" || obj.playerId.length === 0 || !username) return null;
    return {
      playerId: obj.playerId.slice(0, 64),
      username,
      createdAt: typeof obj.createdAt === "number" ? obj.createdAt : Date.now(),
    };
  },
};

/* ----------------------------------------------------------------- stats -- */

export const EMPTY_GAME_STATS: GameStats = Object.freeze({
  played: 0,
  totalScore: 0,
  bestScore: 0,
  lastPlayedAt: null,
});

export const EMPTY_STATS: PlayerStats = Object.freeze({
  ...record<GameStats>(() => EMPTY_GAME_STATS),
  totalGames: 0,
}) as PlayerStats;

export const statsSchema: StorageSchema<PlayerStats> = {
  key: STORAGE_KEYS.stats,
  version: SCHEMA_VERSION,
  fallback: EMPTY_STATS,
  revive(value) {
    const obj = asObject(value);
    if (!obj) return null;
    const next = {
      ...record<GameStats>((game) => {
        const raw = asObject(obj[game]);
        if (!raw) return EMPTY_GAME_STATS;
        return {
          played: safeCount(raw.played),
          totalScore: safeCount(raw.totalScore),
          bestScore: safeScore(raw.bestScore),
          lastPlayedAt: typeof raw.lastPlayedAt === "number" ? raw.lastPlayedAt : null,
        };
      }),
      totalGames: safeCount(obj.totalGames),
    } as PlayerStats;
    return next;
  },
};

/* ------------------------------------------------------------ bestScores -- */

export const EMPTY_BEST_SCORES: BestScores = Object.freeze(record<number>(() => 0)) as BestScores;

export const bestScoresSchema: StorageSchema<BestScores> = {
  key: STORAGE_KEYS.bestScores,
  version: SCHEMA_VERSION,
  fallback: EMPTY_BEST_SCORES,
  revive(value) {
    const obj = asObject(value);
    if (!obj) return null;
    return record<number>((game) => safeScore(obj[game])) as BestScores;
  },
};

/* ---------------------------------------------------------------- streak -- */

export const EMPTY_STREAK: StreakState = Object.freeze({
  lastPlayedDate: null,
  currentStreak: 0,
  longestStreak: 0,
  lastCreditedAt: null,
});

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const streakSchema: StorageSchema<StreakState> = {
  key: STORAGE_KEYS.streak,
  version: SCHEMA_VERSION,
  fallback: EMPTY_STREAK,
  revive(value) {
    const obj = asObject(value);
    if (!obj) return null;
    const lastPlayedDate =
      typeof obj.lastPlayedDate === "string" && DATE_KEY.test(obj.lastPlayedDate)
        ? obj.lastPlayedDate
        : null;
    return {
      lastPlayedDate,
      currentStreak: clamp(safeCount(obj.currentStreak), 0, 100_000),
      longestStreak: clamp(safeCount(obj.longestStreak), 0, 100_000),
      lastCreditedAt: typeof obj.lastCreditedAt === "number" ? obj.lastCreditedAt : null,
    };
  },
};

/* -------------------------------------------------------------- settings -- */

/**
 * Sound defaults ON, like haptics.
 *
 * Nothing can play before a user gesture, so the first tone a visitor hears is
 * already a reply to their own tap inside a game — never an autoplaying page.
 * Shipping it off would mean the tactile feedback existed only for the players
 * who went looking for a setting, which is most of the point of having it; the
 * header carries a one-tap mute for everyone else.
 */
export const DEFAULT_SETTINGS: Settings = Object.freeze({
  haptics: true,
  sound: true,
  reducedMotion: false,
});

export const settingsSchema: StorageSchema<Settings> = {
  key: STORAGE_KEYS.settings,
  version: SETTINGS_VERSION,
  fallback: DEFAULT_SETTINGS,
  revive(value, version) {
    const obj = asObject(value);
    if (!obj) return null;
    return {
      haptics: obj.haptics !== false,
      // Before v2 there were no sounds and no control, so a stored `false` was
      // the old default rather than a decision — a returning player would
      // otherwise be the only one left silently muted. From v2 it is a real
      // choice, and is respected in both directions.
      sound: version >= SETTINGS_VERSION ? obj.sound !== false : DEFAULT_SETTINGS.sound,
      reducedMotion: obj.reducedMotion === true,
    };
  },
};
