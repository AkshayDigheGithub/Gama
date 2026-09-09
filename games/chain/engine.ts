import { randomInt, type Rng } from "@/lib/rng";

/**
 * CHAIN — rules engine.
 *
 * A 5x5 grid of numbered tiles. Drag a path through touching tiles; each step
 * must land on a tile of the SAME value or exactly ONE HIGHER. Three tiles
 * minimum. Longer chains pay super-linearly, so the real game is deciding how
 * greedy to be before the combo window closes.
 *
 * Pure logic only — no React, no DOM. The UI drives it.
 */

export const GRID = 5;
export const CELLS = GRID * GRID;
export const MIN_CHAIN = 3;
export const MAX_VALUE = 6;

/** Points = sum(values) x length multiplier x combo x SCALE. */
export const POINT_SCALE = 5;

/**
 * A fixed clock, deliberately. An earlier design banked time for long chains,
 * but a decent player earned back nearly as much as each chain cost, so runs
 * ran away to 50+ chains and scores exploded. A flat 60 seconds makes every
 * run directly comparable and keeps skill expressed as points per second.
 */
export const START_TIME_MS = 60_000;

export const COMBO_WINDOW_MS = 2600;
export const COMBO_MIN_WINDOW_MS = 1400;
export const COMBO_STEP = 0.2;
export const COMBO_MAX = 2;

/**
 * The run tightens as it goes: every chain shaves 40ms off the combo window,
 * down to a floor of 1.4s. Early chains are relaxed, late ones are frantic —
 * without this the difficulty is flat for the whole 60 seconds.
 */
export function comboWindowMs(chainsMade: number): number {
  return Math.max(COMBO_MIN_WINDOW_MS, COMBO_WINDOW_MS - chainsMade * 40);
}

/**
 * Length pays, but gently. Multiplying by raw length made scoring quadratic
 * (sum already grows with length), which put expert runs an order of magnitude
 * above everyone else. This table keeps a strong run around 4x a casual one.
 */
export function lengthMultiplier(length: number): number {
  if (length >= 7) return 2.5;
  if (length === 6) return 2.1;
  if (length === 5) return 1.7;
  if (length === 4) return 1.3;
  return 1;
}

export interface Tile {
  /** Stable across collapses so the UI can animate a tile falling. */
  id: number;
  value: number;
}

/** Row-major, always exactly CELLS tiles — refill happens on resolve. */
export type Board = Tile[];

export const rowOf = (index: number) => Math.floor(index / GRID);
export const colOf = (index: number) => index % GRID;
export const indexOf = (row: number, col: number) => row * GRID + col;

/** Eight-way adjacency: diagonals make routes far more interesting. */
export function areAdjacent(a: number, b: number): boolean {
  if (a === b) return false;
  const dr = Math.abs(rowOf(a) - rowOf(b));
  const dc = Math.abs(colOf(a) - colOf(b));
  return dr <= 1 && dc <= 1;
}

export function canFollow(previous: Tile, next: Tile): boolean {
  return next.value === previous.value || next.value === previous.value + 1;
}

export function canExtend(board: Board, path: number[], index: number): boolean {
  if (index < 0 || index >= CELLS) return false;
  if (path.includes(index)) return false;
  if (path.length === 0) return true;
  const last = path[path.length - 1];
  return areAdjacent(last, index) && canFollow(board[last], board[index]);
}

export function chainPoints(board: Board, path: number[], combo: number): number {
  if (path.length < MIN_CHAIN) return 0;
  const sum = path.reduce((total, index) => total + board[index].value, 0);
  return Math.round(sum * lengthMultiplier(path.length) * combo * POINT_SCALE);
}

/** Chaining again before the window closes climbs the multiplier. */
export function nextCombo(
  current: number,
  sinceLastChainMs: number,
  windowMs: number = COMBO_WINDOW_MS,
): number {
  if (sinceLastChainMs > windowMs) return 1;
  return Math.min(COMBO_MAX, Math.round((current + COMBO_STEP) * 100) / 100);
}

export interface BoardState {
  board: Board;
  nextId: number;
}

export function createBoard(rng: Rng, startId = 0): BoardState {
  let nextId = startId;
  const board: Board = Array.from({ length: CELLS }, () => ({
    id: nextId++,
    value: randomInt(rng, 1, MAX_VALUE),
  }));
  return { board, nextId };
}

export interface ResolveResult extends BoardState {
  cleared: number;
}

/**
 * Removes the chain, collapses each column downward and refills from the top.
 * Surviving tiles keep their ids so the UI can animate the fall.
 */
export function resolveChain(
  board: Board,
  path: number[],
  rng: Rng,
  startId: number,
): ResolveResult {
  const removed = new Set(path);
  const next = new Array<Tile>(CELLS);
  let nextId = startId;

  for (let col = 0; col < GRID; col += 1) {
    const survivors: Tile[] = [];
    // Bottom-up, so the lowest surviving tile settles lowest.
    for (let row = GRID - 1; row >= 0; row -= 1) {
      const index = indexOf(row, col);
      if (!removed.has(index)) survivors.push(board[index]);
    }

    for (let row = GRID - 1, s = 0; row >= 0; row -= 1, s += 1) {
      next[indexOf(row, col)] =
        s < survivors.length ? survivors[s] : { id: nextId++, value: randomInt(rng, 1, MAX_VALUE) };
    }
  }

  return { board: next, nextId, cleared: path.length };
}

/**
 * Is any legal chain still available? Depth-limited search from every tile.
 * A dead board is very unlikely with these rules, but a stuck player is a
 * broken game, so the UI reshuffles when this returns false.
 */
export function hasMove(board: Board): boolean {
  const walk = (index: number, visited: number[]): boolean => {
    if (visited.length >= MIN_CHAIN) return true;
    for (let next = 0; next < CELLS; next += 1) {
      if (!areAdjacent(index, next)) continue;
      if (visited.includes(next)) continue;
      if (!canFollow(board[index], board[next])) continue;
      if (walk(next, [...visited, next])) return true;
    }
    return false;
  };

  for (let start = 0; start < CELLS; start += 1) {
    if (walk(start, [start])) return true;
  }
  return false;
}
