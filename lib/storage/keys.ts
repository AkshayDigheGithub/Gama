/**
 * localStorage keys used by ONE MORE.
 *
 * Everything stored here is non-sensitive, client-side MVP data: an anonymous
 * display name, local scores and preferences. Nothing here is authoritative and
 * nothing here should ever be trusted as a verified score.
 */
export const STORAGE_KEYS = {
  player: "oneMorePlayer",
  stats: "oneMoreStats",
  streak: "oneMoreStreak",
  bestScores: "oneMoreBestScores",
  settings: "oneMoreSettings",
  daily: "oneMoreDaily",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
