import { parseJson, readRaw, removeRaw, writeRaw } from "./safe-storage";

/**
 * A tiny versioned, observable wrapper around localStorage.
 *
 * Values are stored inside an envelope — `{ v: <version>, d: <data> }` — so a
 * future build can migrate old shapes instead of blowing up on them. Snapshots
 * are cached so `useSyncExternalStore` gets a stable reference (and therefore a
 * clean hydration pass).
 */

export interface StorageSchema<T> {
  key: string;
  version: number;
  /** Must be a stable, frozen reference: it is the server snapshot. */
  fallback: T;
  /**
   * Validate + migrate a decoded value. Return `null` to fall back.
   * `version` is the version the value was written with (0 if unknown).
   */
  revive: (value: unknown, version: number) => T | null;
}

interface Envelope {
  v: number;
  d: unknown;
}

function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "v" in value &&
    "d" in value &&
    typeof (value as Envelope).v === "number"
  );
}

const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();
let crossTabBound = false;

function emit(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

function bindCrossTab() {
  if (crossTabBound || typeof window === "undefined") return;
  crossTabBound = true;
  window.addEventListener("storage", (event) => {
    if (!event.key) {
      cache.clear();
      listeners.forEach((_set, key) => emit(key));
      return;
    }
    if (!listeners.has(event.key)) return;
    cache.delete(event.key);
    emit(event.key);
  });
}

export function readStore<T>(schema: StorageSchema<T>): T {
  if (typeof window === "undefined") return schema.fallback;
  if (cache.has(schema.key)) return cache.get(schema.key) as T;

  const decoded = parseJson(readRaw(schema.key));
  let value: T | null = null;

  if (isEnvelope(decoded)) {
    value = schema.revive(decoded.d, decoded.v);
  } else if (decoded !== null) {
    // Pre-envelope (or hand-edited) value — try to migrate it in place.
    value = schema.revive(decoded, 0);
  }

  if (value === null) {
    value = schema.fallback;
    if (decoded !== null) removeRaw(schema.key);
  }

  cache.set(schema.key, value);
  return value;
}

export function writeStore<T>(schema: StorageSchema<T>, next: T): T {
  cache.set(schema.key, next);
  if (typeof window !== "undefined") {
    const envelope: Envelope = { v: schema.version, d: next };
    writeRaw(schema.key, JSON.stringify(envelope));
  }
  emit(schema.key);
  return next;
}

export function updateStore<T>(schema: StorageSchema<T>, updater: (current: T) => T): T {
  return writeStore(schema, updater(readStore(schema)));
}

export function clearStore<T>(schema: StorageSchema<T>): void {
  cache.delete(schema.key);
  removeRaw(schema.key);
  emit(schema.key);
}

export function subscribeStore(key: string, onChange: () => void): () => void {
  bindCrossTab();
  const set = listeners.get(key) ?? new Set<() => void>();
  set.add(onChange);
  listeners.set(key, set);
  return () => {
    set.delete(onChange);
    if (set.size === 0) listeners.delete(key);
  };
}

/** Test/diagnostic helper — drops memoised snapshots without touching storage. */
export function resetStoreCache(): void {
  cache.clear();
}
