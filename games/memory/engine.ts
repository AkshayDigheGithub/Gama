import { shuffle, type Rng } from "@/lib/rng";

export const SYMBOLS = [
  "bolt",
  "target",
  "brain",
  "flame",
  "star",
  "gem",
  "moon",
  "sun",
  "leaf",
  "anchor",
  "ghost",
  "crown",
] as const;

export type MemorySymbol = (typeof SYMBOLS)[number];

export interface MemoryLevel {
  level: number;
  cols: number;
  rows: number;
  pairs: number;
  /** Inert tiles used to fill odd grids (the 3x3 centre). */
  blockers: number;
  /** Milliseconds added to the run clock for clearing the level. */
  timeBonusMs: number;
  /** How long a mismatched pair stays visible. Shrinks as levels climb. */
  mismatchMs: number;
}

/**
 * 2x2 → 3x3 → 4x4 and upward. Columns cap at four so the board stays
 * thumb-sized on a phone; past 4x6 the pressure comes from a faster flip-back
 * and a thinner time bonus rather than more tiles.
 */
export function getLevel(level: number): MemoryLevel {
  const shape =
    level === 1
      ? { cols: 2, rows: 2, blockers: 0 }
      : level === 2
        ? { cols: 3, rows: 3, blockers: 1 }
        : level === 3
          ? { cols: 4, rows: 4, blockers: 0 }
          : level === 4
            ? { cols: 4, rows: 5, blockers: 0 }
            : { cols: 4, rows: 6, blockers: 0 };

  const cells = shape.cols * shape.rows;
  const pairs = (cells - shape.blockers) / 2;
  const overtime = Math.max(0, level - 5);

  return {
    level,
    ...shape,
    pairs,
    timeBonusMs: Math.max(6000, Math.round(pairs * 1500 + 3000 - overtime * 900)),
    mismatchMs: Math.max(420, 800 - overtime * 60),
  };
}

export const START_TIME_MS = 20_000;
export const MISTAKE_PENALTY_MS = 2000;

export interface MemoryTile {
  id: number;
  symbol: MemorySymbol | null;
  kind: "card" | "blocker";
  state: "hidden" | "open" | "matched";
}

export function buildBoard(level: MemoryLevel, rng: Rng): MemoryTile[] {
  const symbols = shuffle(rng, SYMBOLS).slice(0, level.pairs);
  const cards: Array<MemorySymbol | null> = symbols.flatMap((symbol) => [symbol, symbol]);
  for (let i = 0; i < level.blockers; i += 1) cards.push(null);

  return shuffle(rng, cards).map((symbol, id) => ({
    id,
    symbol,
    kind: symbol === null ? "blocker" : "card",
    state: symbol === null ? "matched" : "hidden",
  }));
}

export interface MemoryState {
  level: number;
  tiles: MemoryTile[];
  /** Ids of the (at most two) tiles currently face up. */
  openIds: number[];
  mistakes: number;
  /** Blocks input while a mismatched pair is on screen. */
  locked: boolean;
}

export type MemoryAction =
  | { type: "flip"; id: number }
  | { type: "resolve" }
  | { type: "load"; level: number; tiles: MemoryTile[] };

export function memoryReducer(state: MemoryState, action: MemoryState | MemoryAction): MemoryState {
  if (!("type" in action)) return action;

  switch (action.type) {
    case "load":
      return { level: action.level, tiles: action.tiles, openIds: [], mistakes: 0, locked: false };

    case "flip": {
      if (state.locked || state.openIds.length >= 2) return state;
      const tile = state.tiles[action.id];
      if (!tile || tile.kind === "blocker" || tile.state !== "hidden") return state;

      const tiles = state.tiles.map((t) => (t.id === action.id ? { ...t, state: "open" as const } : t));
      const openIds = [...state.openIds, action.id];
      if (openIds.length < 2) return { ...state, tiles, openIds };

      const [a, b] = openIds.map((id) => tiles[id]);
      const matched = a.symbol === b.symbol;

      if (matched) {
        return {
          ...state,
          tiles: tiles.map((t) => (openIds.includes(t.id) ? { ...t, state: "matched" as const } : t)),
          openIds: [],
        };
      }

      // Leave the pair visible; the UI dispatches `resolve` after mismatchMs.
      return { ...state, tiles, openIds, mistakes: state.mistakes + 1, locked: true };
    }

    case "resolve":
      return {
        ...state,
        tiles: state.tiles.map((t) =>
          state.openIds.includes(t.id) ? { ...t, state: "hidden" as const } : t,
        ),
        openIds: [],
        locked: false,
      };

    default:
      return state;
  }
}

export function isLevelComplete(state: MemoryState): boolean {
  return state.tiles.every((tile) => tile.state === "matched");
}

export function lastFlipMatched(state: MemoryState): boolean {
  return state.openIds.length === 0 && !state.locked;
}
