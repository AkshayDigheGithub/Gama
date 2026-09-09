import { createRng, randomInt, pickOne } from "@/lib/rng";
import { NAME_PREFIXES, NAME_SUFFIXES } from "./names";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 18;

/**
 * Reduce arbitrary input to a safe display name.
 *
 * Usernames arrive from two untrusted places — the rename field and challenge
 * URLs — and end up rendered on screen and re-encoded into share links. We
 * allow only `[A-Za-z0-9 _-]`, collapse whitespace and cap the length, so there
 * is nothing left that could be interpreted as markup or break a URL.
 */
export function sanitizeUsername(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9 _-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, USERNAME_MAX);
}

export function isValidUsername(input: string): boolean {
  return input.length >= USERNAME_MIN && input.length <= USERNAME_MAX;
}

export function validateUsername(input: unknown): { ok: true; value: string } | { ok: false; reason: string } {
  const value = sanitizeUsername(input);
  if (value.length < USERNAME_MIN) {
    return { ok: false, reason: `Use at least ${USERNAME_MIN} characters.` };
  }
  return { ok: true, value };
}

export function generateUsername(seed?: string | number): string {
  const rng = createRng(seed ?? `${Date.now()}-${Math.random()}`);
  return `${pickOne(rng, NAME_PREFIXES)}${pickOne(rng, NAME_SUFFIXES)}${randomInt(rng, 100, 999)}`;
}

export function generatePlayerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
