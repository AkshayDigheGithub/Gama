import { STORAGE_KEYS } from "@/lib/storage/keys";
import type { StorageSchema } from "@/lib/storage/store";
import { clamp } from "@/lib/utils";
import { MAX_SCORE, isGameId, type GameId } from "@/types";
import type { DateKey } from "./date-key";

export interface DailyRecord {
  game: GameId;
  bestScore: number;
  goal: number;
  met: boolean;
  attempts: number;
}

/** Keyed by date. Trimmed so localStorage never grows without bound. */
export type DailyLog = Record<DateKey, DailyRecord>;

const KEEP_DAYS = 30;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const EMPTY_DAILY_LOG: DailyLog = Object.freeze({});

export const dailySchema: StorageSchema<DailyLog> = {
  key: STORAGE_KEYS.daily,
  version: 1,
  fallback: EMPTY_DAILY_LOG,
  revive(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const out: DailyLog = {};
    for (const [date, raw] of Object.entries(value as Record<string, unknown>)) {
      if (!DATE_KEY.test(date)) continue;
      if (typeof raw !== "object" || raw === null) continue;
      const record = raw as Record<string, unknown>;
      if (!isGameId(record.game)) continue;
      out[date] = {
        game: record.game,
        bestScore: clamp(Math.trunc(Number(record.bestScore) || 0), 0, MAX_SCORE),
        goal: clamp(Math.trunc(Number(record.goal) || 0), 0, MAX_SCORE),
        met: record.met === true,
        attempts: clamp(Math.trunc(Number(record.attempts) || 0), 0, 10_000),
      };
    }
    return trimDailyLog(out);
  },
};

export function trimDailyLog(log: DailyLog): DailyLog {
  const dates = Object.keys(log).sort().slice(-KEEP_DAYS);
  return dates.reduce<DailyLog>((acc, date) => {
    acc[date] = log[date];
    return acc;
  }, {});
}
