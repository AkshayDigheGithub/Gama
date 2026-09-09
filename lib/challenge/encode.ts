import { hashString } from "@/lib/rng";
import { sanitizeUsername, USERNAME_MIN } from "@/lib/player/username";
import { clamp } from "@/lib/utils";
import { GAMES } from "@/lib/games";
import { MAX_SCORE, isGameId } from "@/types";
import type { Challenge, ParsedChallenge } from "./types";

export const FALLBACK_CHALLENGER = "A challenger";

/** Fixed, public salt. Present only to make checksums stable across builds. */
const CHALLENGE_SALT = 0x0ce7a11;

/** Non-secret checksum. Detects corrupted links, nothing more. */
export function challengeToken(challenge: Challenge): string {
  return hashString(`${challenge.game}|${challenge.score}|${challenge.name}`, CHALLENGE_SALT)
    .toString(36)
    .slice(0, 8);
}

export type SearchLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | undefined
  | null;

function read(params: SearchLike, key: string): string | undefined {
  if (!params) return undefined;
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseScore(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const value = raw.trim();
  // Only a plain non-negative integer is a score. Anything else — signs,
  // exponents, hex, whitespace tricks — is rejected rather than coerced.
  if (!/^\d{1,15}$/.test(value)) return null;
  // Any in-range digit string is capped rather than refused, so an inflated
  // link still opens (at the cap) instead of looking merely broken.
  return clamp(Number.parseInt(value, 10), 0, MAX_SCORE);
}

function parseName(raw: string | undefined): string {
  const name = sanitizeUsername(raw);
  return name.length >= USERNAME_MIN ? name : FALLBACK_CHALLENGER;
}

/** `/challenge?game=reaction&score=8420&name=SwiftTiger` */
export function buildChallengePath(challenge: Challenge): string {
  const params = new URLSearchParams({
    game: challenge.game,
    score: String(challenge.score),
    name: challenge.name,
    t: challengeToken(challenge),
  });
  return `/challenge?${params.toString()}`;
}

/** `/games/reaction?vs=SwiftTiger&target=8420` */
export function buildVersusPath(challenge: Challenge): string {
  const params = new URLSearchParams({
    vs: challenge.name,
    target: String(challenge.score),
    t: challengeToken(challenge),
  });
  return `${GAMES[challenge.game].href}?${params.toString()}`;
}

export function absoluteUrl(path: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL ?? ""));
  return `${base.replace(/\/$/, "")}${path}`;
}

/**
 * Every link ONE MORE builds carries a checksum, so a missing one means the
 * link was not produced by the app. Neither case blocks play — the challenge
 * page just says the score may not be genuine.
 */
function hasValidToken(params: SearchLike, challenge: Challenge): boolean {
  return read(params, "t") === challengeToken(challenge);
}

/** Parses `/challenge` query params. Returns `null` if the game is unusable. */
export function parseChallengeParams(params: SearchLike): ParsedChallenge | null {
  const game = read(params, "game");
  const score = parseScore(read(params, "score"));
  if (!isGameId(game) || score === null) return null;

  const challenge: Challenge = { game, score, name: parseName(read(params, "name")) };
  return { ...challenge, integrityOk: hasValidToken(params, challenge) };
}

/** Parses `?vs=&target=` on a game route, where the game comes from the path. */
export function parseVersusParams(params: SearchLike, game: Challenge["game"]): ParsedChallenge | null {
  const score = parseScore(read(params, "target"));
  const vs = read(params, "vs");
  if (score === null || vs === undefined) return null;

  const challenge: Challenge = { game, score, name: parseName(vs) };
  return { ...challenge, integrityOk: hasValidToken(params, challenge) };
}
