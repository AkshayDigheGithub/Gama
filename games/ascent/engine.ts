import { createRng, randomInt, type Rng } from "@/lib/rng";

/**
 * ASCENT — one-button wall-jump climber.
 *
 * The player clings to a wall, sliding slowly down, and taps to leap to the
 * opposite wall along a FIXED arc. That fixed arc is the whole game: the only
 * thing under your control is *when* you jump, which decides where you land.
 * Spiked stretches of wall make some landings lethal, and a rising void below
 * punishes taking your time.
 *
 * Heights are "up positive". Pure logic — no canvas, no React.
 */

export const WORLD_W = 180;
export const WORLD_H = 320;

/** Inner faces of the two walls; the player clings to these. */
export const LEFT_FACE = 44;
export const RIGHT_FACE = 136;
export const WALL_THICKNESS = 30;

export const PLAYER_W = 14;
export const PLAYER_H = 20;

const TRAVEL = RIGHT_FACE - LEFT_FACE - PLAYER_W;
/** Horizontal speed is constant, so every jump crosses in the same time. */
const CROSS_SECONDS = 0.5;
const JUMP_VX = TRAVEL / CROSS_SECONDS;
const GRAVITY = 620;

/**
 * Tap for a flat hop, hold for a high arc — the same control as Rush.
 *
 * An earlier version used one fixed arc, which made the landing height fully
 * determined by when you jumped. If the spot above you was spiked your only
 * option was to slide DOWN while the void rose: a death spiral nobody escaped.
 * A variable arc gives roughly a 140-unit band of reachable landings, so there
 * is almost always a safe one — finding it fast is the skill.
 */
const JUMP_VY = 430;
const JUMP_CUT_VY = 150;

const SLIDE_SPEED = 55;
const VOID_START_GAP = 320;
const VOID_SPEED = 70;
const VOID_ACCEL = 4;

const SCORE_PER_UNIT = 0.65;

/** Height a jump gains for a given hold, in seconds. Used by the aim guide. */
export function predictGain(holdSeconds: number): number {
  const natural = (JUMP_VY - JUMP_CUT_VY) / GRAVITY;
  if (holdSeconds >= natural || holdSeconds >= CROSS_SECONDS) {
    return JUMP_VY * CROSS_SECONDS - 0.5 * GRAVITY * CROSS_SECONDS ** 2;
  }
  const h = holdSeconds;
  const atCut = JUMP_VY * h - 0.5 * GRAVITY * h * h;
  const rest = CROSS_SECONDS - h;
  return atCut + JUMP_CUT_VY * rest - 0.5 * GRAVITY * rest * rest;
}

export const MIN_GAIN = predictGain(0);
export const MAX_GAIN = predictGain(1);

export type Side = -1 | 1;

export interface SpikeRun {
  side: Side;
  from: number;
  to: number;
}

export interface AscentState {
  side: Side;
  clinging: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  voidY: number;
  voidSpeed: number;
  maxHeight: number;
  jumps: number;
  cleanLandings: number;
  elapsedMs: number;
  dead: boolean;
  /** Set on the frame of death, for the right death animation. */
  cause: "spike" | "void" | null;
  spikes: SpikeRun[];
  generatedTo: number;
  rng: Rng;
}

export const faceFor = (side: Side): number => (side === -1 ? LEFT_FACE : RIGHT_FACE - PLAYER_W);

export function tierFor(height: number): number {
  return Math.min(4, Math.floor(height / 1200));
}

function generate(state: AscentState): void {
  const horizon = state.maxHeight + WORLD_H * 2.5;
  while (state.generatedTo < horizon) {
    const tier = tierFor(state.generatedTo);
    for (const side of [-1, 1] as Side[]) {
      // Each wall is generated independently, so the safe stretches rarely
      // line up and the climb keeps zig-zagging.
      const safe = randomInt(state.rng, Math.max(80, 150 - tier * 14), Math.max(100, 195 - tier * 18));
      const run = randomInt(state.rng, 26 + tier * 5, 52 + tier * 8);
      const from = state.generatedTo + safe;
      state.spikes.push({ side, from, to: from + run });
    }
    state.generatedTo += 190;
  }
  if (state.spikes.length > 120) {
    state.spikes = state.spikes.filter((s) => s.to > state.voidY - 200);
  }
}

export function isSpiked(state: AscentState, side: Side, y: number): boolean {
  for (const run of state.spikes) {
    if (run.side !== side) continue;
    // The player occupies a band, not a point.
    if (y + PLAYER_H > run.from && y < run.to) return true;
  }
  return false;
}

export function createAscent(seed: string): AscentState {
  const rng = createRng(`one-more-ascent:${seed}`);
  const state: AscentState = {
    side: -1,
    clinging: true,
    x: faceFor(-1),
    y: 0,
    vx: 0,
    vy: 0,
    voidY: -VOID_START_GAP,
    voidSpeed: VOID_SPEED,
    maxHeight: 0,
    jumps: 0,
    cleanLandings: 0,
    elapsedMs: 0,
    dead: false,
    cause: null,
    spikes: [],
    // Nothing lethal in the opening stretch, so the first jump is always safe.
    generatedTo: 260,
    rng,
  };
  generate(state);
  return state;
}

export function jump(state: AscentState): void {
  if (state.dead || !state.clinging) return;
  state.clinging = false;
  state.vx = state.side === -1 ? JUMP_VX : -JUMP_VX;
  state.vy = JUMP_VY;
  state.jumps += 1;
}

/** Releasing early clips the arc, dropping the landing height. */
export function releaseJump(state: AscentState): void {
  if (state.clinging) return;
  if (state.vy > JUMP_CUT_VY) state.vy = JUMP_CUT_VY;
}

export function stepAscent(state: AscentState, dtMs: number): void {
  if (state.dead) return;
  const dt = dtMs / 1000;
  state.elapsedMs += dtMs;

  state.voidSpeed += VOID_ACCEL * dt;
  state.voidY += state.voidSpeed * dt;

  if (state.clinging) {
    state.y -= SLIDE_SPEED * dt;
  } else {
    state.x += state.vx * dt;
    state.vy -= GRAVITY * dt;
    state.y += state.vy * dt;

    const target = state.side === -1 ? RIGHT_FACE - PLAYER_W : LEFT_FACE;
    const arrived = state.side === -1 ? state.x >= target : state.x <= target;
    if (arrived) {
      const landing: Side = state.side === -1 ? 1 : -1;
      state.x = target;
      state.side = landing;
      state.clinging = true;
      state.vx = 0;
      state.vy = 0;
      if (isSpiked(state, landing, state.y)) {
        state.dead = true;
        state.cause = "spike";
        return;
      }
      state.cleanLandings += 1;
    }
  }

  state.maxHeight = Math.max(state.maxHeight, state.y);

  if (state.y < state.voidY) {
    state.dead = true;
    state.cause = "void";
    return;
  }

  generate(state);
}

export function finalScore(state: AscentState): number {
  return Math.max(0, Math.round(state.maxHeight * SCORE_PER_UNIT));
}
