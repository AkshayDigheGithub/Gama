import { createRng, randomInt, type Rng } from "@/lib/rng";

/**
 * SALVO — target shooting rules.
 *
 * Targets surface, drift, and expire. Tap one to take it. The game is not
 * "tap the thing that appears": it is triage under pressure. Several targets
 * are live at once with different values and different fuses, one type must
 * NOT be shot, and firing at empty space breaks your streak — so accuracy and
 * restraint matter as much as speed.
 *
 * Deliberately abstract: shapes and rings, no weapons and no figures.
 *
 * Pure logic — no canvas, no React.
 */

export const WORLD_W = 240;
export const WORLD_H = 320;

export const STARTING_LIVES = 3;
/** Forgiveness added to a target's radius when hit-testing a tap. */
export const TAP_SLACK = 7;

export type TargetKind = "standard" | "rapid" | "shielded" | "void";

export interface Target {
  id: number;
  kind: TargetKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  /** Milliseconds left before it expires. */
  life: number;
  maxLife: number;
  /** Shielded targets need two taps. */
  hp: number;
  /** Set when destroyed, so the renderer can play a pop before removal. */
  dyingFor: number | null;
}

export interface SalvoState {
  targets: Target[];
  score: number;
  combo: number;
  bestCombo: number;
  lives: number;
  hits: number;
  misses: number;
  voidHits: number;
  expired: number;
  elapsedMs: number;
  spawnIn: number;
  nextId: number;
  dead: boolean;
  rng: Rng;
}

const BASE_POINTS: Record<TargetKind, number> = {
  standard: 40,
  rapid: 85,
  shielded: 105,
  void: 0,
};

const BASE_LIFE: Record<TargetKind, number> = {
  standard: 2300,
  rapid: 1400,
  shielded: 2700,
  void: 2000,
};

const BASE_RADIUS: Record<TargetKind, number> = {
  standard: 20,
  rapid: 14,
  shielded: 22,
  void: 18,
};

const MISS_PENALTY = 25;
/** Shooting a void costs points and the streak, but never a life. */
const VOID_PENALTY = 120;
export const COMBO_MAX = 2.5;
/** Every hit adds this to the multiplier; a miss resets it entirely. */
const COMBO_STEP = 0.06;
export const POP_MS = 160;

export function comboMultiplier(combo: number): number {
  return Math.min(COMBO_MAX, 1 + combo * COMBO_STEP);
}

/* ------------------------------------------------------------ difficulty -- */

/**
 * Seconds into the run. This does NOT plateau: targets keep arriving faster
 * until nobody can clear them, which is what ends a run. An earlier version
 * capped the ramp, and any player who simply avoided the void targets was
 * immortal — the run had no end and the score had no ceiling.
 */
const rampOf = (elapsedMs: number) => elapsedMs / 1000;

export function spawnIntervalMs(elapsedMs: number): number {
  return Math.max(210, 900 - rampOf(elapsedMs) * 11);
}

export function lifeScale(elapsedMs: number): number {
  return Math.max(0.5, 1 - rampOf(elapsedMs) * 0.008);
}

/** Void chances stop climbing; the pressure comes from volume, not trickery. */
const rampCapped = (elapsedMs: number) => Math.min(45, rampOf(elapsedMs));

function pickKind(rng: Rng, elapsedMs: number): TargetKind {
  const ramp = rampCapped(elapsedMs) / 45;
  const voidChance = 0.1 + ramp * 0.12;
  const shieldedChance = 0.08 + ramp * 0.14;
  const rapidChance = 0.18 + ramp * 0.12;

  const roll = rng();
  if (roll < voidChance) return "void";
  if (roll < voidChance + shieldedChance) return "shielded";
  if (roll < voidChance + shieldedChance + rapidChance) return "rapid";
  return "standard";
}

/* ----------------------------------------------------------------- state -- */

export function createSalvo(seed: string): SalvoState {
  return {
    targets: [],
    score: 0,
    combo: 0,
    bestCombo: 0,
    lives: STARTING_LIVES,
    hits: 0,
    misses: 0,
    voidHits: 0,
    expired: 0,
    elapsedMs: 0,
    // A short beat before the first target, so nothing appears under a
    // finger that is still on the Start button.
    spawnIn: 450,
    nextId: 0,
    dead: false,
    rng: createRng(`one-more-salvo:${seed}`),
  };
}

function spawn(state: SalvoState): void {
  const kind = pickKind(state.rng, state.elapsedMs);
  const radius = BASE_RADIUS[kind];
  const margin = radius + 6;
  const drift = kind === "rapid" ? 26 : 14;

  state.targets.push({
    id: state.nextId++,
    kind,
    x: randomInt(state.rng, margin, WORLD_W - margin),
    y: randomInt(state.rng, margin, WORLD_H - margin),
    vx: (state.rng() * 2 - 1) * drift,
    vy: (state.rng() * 2 - 1) * drift,
    radius,
    life: BASE_LIFE[kind] * lifeScale(state.elapsedMs),
    maxLife: BASE_LIFE[kind] * lifeScale(state.elapsedMs),
    hp: kind === "shielded" ? 2 : 1,
    dyingFor: null,
  });
}

export type ShotResult = "kill" | "chip" | "void" | "miss" | "spent";

/**
 * Fire at a point. Returns what happened so the UI can react — the rules stay
 * here, the feedback lives in the component.
 */
export function shoot(state: SalvoState, x: number, y: number): ShotResult {
  if (state.dead) return "miss";

  // Newest first: a target drawn on top should be the one that is hit.
  for (let i = state.targets.length - 1; i >= 0; i -= 1) {
    const target = state.targets[i];
    const reach = target.radius + TAP_SLACK;
    if ((target.x - x) ** 2 + (target.y - y) ** 2 > reach * reach) continue;

    // A target still playing its death animation is no longer hittable, but a
    // shot that lands on it was aimed at something real — it costs nothing.
    // Otherwise a fast double-tap is punished for being fast.
    if (target.dyingFor !== null) return "spent";

    if (target.kind === "void") {
      // Costly, but not fatal: lives are spent on falling behind, not on one
      // mis-tap. Otherwise the whole difficulty curve collapses into "do you
      // ever mis-click", which is not a skill ramp.
      target.dyingFor = 0;
      state.voidHits += 1;
      state.combo = 0;
      state.score = Math.max(0, state.score - VOID_PENALTY);
      return "void";
    }

    target.hp -= 1;
    if (target.hp > 0) return "chip";

    target.dyingFor = 0;
    state.hits += 1;
    state.score += Math.round(BASE_POINTS[target.kind] * comboMultiplier(state.combo));
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    return "kill";
  }

  // Firing at nothing: the cost of spraying.
  state.misses += 1;
  state.combo = 0;
  state.score = Math.max(0, state.score - MISS_PENALTY);
  return "miss";
}

export function stepSalvo(state: SalvoState, dtMs: number): void {
  if (state.dead) return;
  const dt = dtMs / 1000;
  state.elapsedMs += dtMs;

  state.spawnIn -= dtMs;
  if (state.spawnIn <= 0) {
    spawn(state);
    state.spawnIn = spawnIntervalMs(state.elapsedMs);
  }

  for (const target of state.targets) {
    if (target.dyingFor !== null) {
      target.dyingFor += dtMs;
      continue;
    }

    target.x += target.vx * dt;
    target.y += target.vy * dt;

    // Bounce, so nothing ever drifts out of reach.
    const margin = target.radius;
    if (target.x < margin) {
      target.x = margin;
      target.vx = Math.abs(target.vx);
    } else if (target.x > WORLD_W - margin) {
      target.x = WORLD_W - margin;
      target.vx = -Math.abs(target.vx);
    }
    if (target.y < margin) {
      target.y = margin;
      target.vy = Math.abs(target.vy);
    } else if (target.y > WORLD_H - margin) {
      target.y = WORLD_H - margin;
      target.vy = -Math.abs(target.vy);
    }

    target.life -= dtMs;
    if (target.life <= 0) {
      target.dyingFor = 0;
      // Letting a void target expire is the correct play, not a mistake.
      if (target.kind !== "void") {
        state.expired += 1;
        state.combo = 0;
        state.lives -= 1;
        if (state.lives <= 0) state.dead = true;
      }
    }
  }

  state.targets = state.targets.filter(
    (target) => target.dyingFor === null || target.dyingFor < POP_MS,
  );
}

export function accuracy(state: SalvoState): number {
  const shots = state.hits + state.misses + state.voidHits;
  return shots === 0 ? 0 : Math.round((state.hits / shots) * 100);
}

export function finalScore(state: SalvoState): number {
  return Math.max(0, Math.round(state.score));
}
