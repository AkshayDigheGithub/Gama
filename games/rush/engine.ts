import { createRng, randomInt, type Rng } from "@/lib/rng";

/**
 * RUSH — endless runner rules.
 *
 * Pure simulation: no canvas, no React. The course is generated from a seed, so
 * the daily challenge puts every player on the identical course.
 *
 * Courses are assembled from hand-authored patterns rather than raw randomness.
 * That is deliberate: random hazard placement eventually produces a gap nobody
 * can clear, and "the game cheated" is unrecoverable. Patterns are known-fair,
 * and the spacing between them scales with speed so reaction time never runs out.
 */

export const WORLD_W = 320;
export const WORLD_H = 180;
export const GROUND_Y = 148;

/** Screen x the runner is pinned to; the world scrolls past. */
export const RUNNER_X = 64;
export const RUNNER_W = 16;
export const RUNNER_H = 28;
export const SLIDE_H = 14;

const GRAVITY = 2600;
const JUMP_V = -760;
/** Releasing early clips the rise, giving a controllable jump height. */
const JUMP_CUT_V = -260;

const SPEED_START = 205;
/**
 * Speed keeps climbing well past the point where patterns stop changing —
 * it is the only thing that ends a skilled run. Spacing is expressed in
 * seconds, so a faster world stays exactly as fair; it just gives the eye
 * less time to read what is coming.
 */
const SPEED_RAMP = 5.5;
export const SPEED_MAX = 470;

/** Forgiveness windows — the difference between "tight" and "unfair". */
const COYOTE_MS = 90;
const BUFFER_MS = 120;
const SLIDE_MS = 520;

const MULTIPLIER_MAX = 3;
const MULTIPLIER_CALM_MS = 1500;
const NEAR_MISS_UNITS = 7;

export type HazardKind = "spike" | "bar" | "block" | "pit";

export interface Hazard {
  kind: HazardKind;
  /** World-space box. For a pit, the span of missing ground. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Closest vertical approach while overlapping, for near-miss scoring. */
  closest: number;
  scored: boolean;
}

export interface Orb {
  x: number;
  y: number;
  taken: boolean;
}

export interface RushState {
  /** World x of the runner's left edge — also the distance travelled. */
  distance: number;
  speed: number;
  /** Runner's feet. */
  y: number;
  vy: number;
  onGround: boolean;
  sliding: boolean;
  slideLeft: number;
  slideHeld: boolean;
  coyoteLeft: number;
  bufferLeft: number;
  jumpHeld: boolean;
  score: number;
  multiplier: number;
  bestMultiplier: number;
  sinceEventMs: number;
  orbsTaken: number;
  nearMisses: number;
  elapsedMs: number;
  dead: boolean;
  hazards: Hazard[];
  orbs: Orb[];
  generatedTo: number;
  rng: Rng;
}

export const ORB_RADIUS = 5;
const ORB_POINTS = 60;
const NEAR_MISS_POINTS = 40;
const DISTANCE_POINTS = 0.16;

/* --------------------------------------------------------------- patterns -- */

interface PatternBuild {
  hazards: Array<Omit<Hazard, "closest" | "scored">>;
  orbs: Array<{ x: number; y: number }>;
  span: number;
}

interface Pattern {
  tier: number;
  /**
   * Internal gaps are expressed in SECONDS and converted using the speed the
   * pattern is generated at. A fixed unit gap that is fair at 205 u/s becomes
   * unclearable at 440 — the jump arc lasts the same time either way, so it
   * simply covers more ground.
   */
  build: (x: number, rng: Rng, speed: number) => PatternBuild;
}

const spike = (x: number): Omit<Hazard, "closest" | "scored"> => ({
  kind: "spike",
  x,
  y: GROUND_Y - 20,
  w: 14,
  h: 20,
});

const bar = (x: number): Omit<Hazard, "closest" | "scored"> => ({
  kind: "bar",
  x,
  y: GROUND_Y - 46,
  w: 34,
  h: 28,
});

const block = (x: number): Omit<Hazard, "closest" | "scored"> => ({
  kind: "block",
  x,
  y: GROUND_Y - 38,
  w: 18,
  h: 38,
});

const pit = (x: number, w: number): Omit<Hazard, "closest" | "scored"> => ({
  kind: "pit",
  x,
  y: GROUND_Y,
  w,
  h: 60,
});

/** Comfortably longer than a clipped short hop, so two hazards never chain. */
const BEAT = 0.85;

const PATTERNS: Pattern[] = [
  {
    tier: 0,
    build: (x) => ({ hazards: [spike(x)], orbs: [{ x: x + 7, y: GROUND_Y - 46 }], span: 14 }),
  },
  { tier: 0, build: (x) => ({ hazards: [bar(x)], orbs: [], span: 34 }) },
  {
    tier: 0,
    build: (x) => ({ hazards: [pit(x, 44)], orbs: [{ x: x + 22, y: GROUND_Y - 40 }], span: 44 }),
  },
  {
    tier: 1,
    build: (x, _rng, speed) => {
      const gap = speed * BEAT;
      return {
        hazards: [spike(x), spike(x + gap)],
        orbs: [{ x: x + gap / 2, y: GROUND_Y - 52 }],
        span: gap + 14,
      };
    },
  },
  {
    tier: 1,
    build: (x) => ({ hazards: [block(x)], orbs: [{ x: x + 9, y: GROUND_Y - 62 }], span: 18 }),
  },
  {
    tier: 1,
    build: (x, rng) => {
      const width = randomInt(rng, 52, 64);
      return { hazards: [pit(x, width)], orbs: [{ x: x + width / 2, y: GROUND_Y - 48 }], span: width };
    },
  },
  {
    tier: 2,
    build: (x, _rng, speed) => {
      const gap = speed * BEAT;
      return {
        hazards: [bar(x), spike(x + 34 + gap)],
        orbs: [{ x: x + 17, y: GROUND_Y - 8 }],
        span: 34 + gap + 14,
      };
    },
  },
  {
    tier: 2,
    build: (x, _rng, speed) => {
      const gap = speed * BEAT;
      return {
        hazards: [pit(x, 50), spike(x + 50 + gap)],
        orbs: [
          { x: x + 25, y: GROUND_Y - 44 },
          { x: x + 57 + gap, y: GROUND_Y - 44 },
        ],
        span: 50 + gap + 14,
      };
    },
  },
  {
    tier: 3,
    build: (x, _rng, speed) => {
      const gap = speed * BEAT;
      return {
        hazards: [spike(x), bar(x + 14 + gap), spike(x + 48 + gap * 2)],
        orbs: [{ x: x + 31 + gap, y: GROUND_Y - 8 }],
        span: 48 + gap * 2 + 14,
      };
    },
  },
  {
    tier: 3,
    build: (x, _rng, speed) => {
      const gap = speed * BEAT;
      return {
        hazards: [block(x), pit(x + 18 + gap, 56)],
        orbs: [{ x: x + 46 + gap, y: GROUND_Y - 50 }],
        span: 18 + gap + 56,
      };
    },
  },
];

export function tierFor(distance: number): number {
  return Math.min(3, Math.floor(distance / 1700));
}

/**
 * Room between patterns, scaled to speed. A jump lasts a fixed time, so the
 * faster the world moves the more ground it covers — spacing has to grow with
 * it or a fair pattern becomes impossible at speed.
 */
function spacingFor(speed: number, distance: number): number {
  // Extra room for the opening stretch — a first run that ends in four
  // seconds teaches nothing except that the game is unfair.
  const warmup = distance < 1600 ? 1.4 : 1;
  // Hazards close up as the run goes on, but never below a full jump arc
  // (0.585s) plus margin, or a fair pattern would become impossible.
  const density = 0.72 - Math.min(0.08, tierFor(distance) * 0.027);
  return Math.max(112, speed * density) * warmup;
}

/* ------------------------------------------------------------------ state -- */

export function createRush(seed: string): RushState {
  const rng = createRng(`one-more-rush:${seed}`);
  const state: RushState = {
    distance: 0,
    speed: SPEED_START,
    y: GROUND_Y,
    vy: 0,
    onGround: true,
    sliding: false,
    slideLeft: 0,
    slideHeld: false,
    coyoteLeft: COYOTE_MS,
    bufferLeft: 0,
    jumpHeld: false,
    score: 0,
    multiplier: 1,
    bestMultiplier: 1,
    sinceEventMs: 0,
    orbsTaken: 0,
    nearMisses: 0,
    elapsedMs: 0,
    dead: false,
    hazards: [],
    orbs: [],
    // A clear run-up before the first hazard, so nobody dies to a cold start.
    generatedTo: 460,
    rng,
  };
  generate(state);
  return state;
}

function generate(state: RushState): void {
  const horizon = state.distance + WORLD_W * 2.5;
  while (state.generatedTo < horizon) {
    const tier = tierFor(state.generatedTo);
    const eligible = PATTERNS.filter((pattern) => pattern.tier <= tier);
    const pattern = eligible[randomInt(state.rng, 0, eligible.length - 1)];
    const built = pattern.build(state.generatedTo, state.rng, state.speed);

    for (const hazard of built.hazards) {
      state.hazards.push({ ...hazard, closest: Number.POSITIVE_INFINITY, scored: false });
    }
    for (const orb of built.orbs) state.orbs.push({ ...orb, taken: false });

    state.generatedTo += built.span + spacingFor(state.speed, state.generatedTo);
  }
}

function prune(state: RushState): void {
  const behind = state.distance - 120;
  if (state.hazards.length > 40) state.hazards = state.hazards.filter((h) => h.x + h.w > behind);
  if (state.orbs.length > 40) state.orbs = state.orbs.filter((o) => o.x > behind);
}

/* ------------------------------------------------------------------ input -- */

export function queueJump(state: RushState): void {
  state.bufferLeft = BUFFER_MS;
  state.jumpHeld = true;
}

export function releaseJump(state: RushState): void {
  state.jumpHeld = false;
  // Cutting the rise is what makes jump height controllable.
  if (state.vy < JUMP_CUT_V) state.vy = JUMP_CUT_V;
}

export function queueSlide(state: RushState): void {
  if (state.dead) return;
  state.sliding = true;
  state.slideLeft = SLIDE_MS;
  state.slideHeld = true;
}

export function releaseSlide(state: RushState): void {
  state.slideHeld = false;
}

/**
 * Would standing up right now put the runner inside something?
 *
 * Without this the slide timer can expire while a bar is still overhead and
 * the runner stands straight into it — a death the player cannot see coming
 * and did nothing to deserve.
 */
function blockedStanding(state: RushState): boolean {
  const top = state.y - RUNNER_H;
  for (const hazard of state.hazards) {
    if (hazard.kind === "pit") continue;
    if (hazard.x > state.distance + RUNNER_W || hazard.x + hazard.w < state.distance) continue;
    if (overlaps(state.distance, top, RUNNER_W, RUNNER_H, hazard.x, hazard.y, hazard.w, hazard.h)) {
      return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------------- step -- */

export function runnerHeight(state: RushState): number {
  return state.sliding ? SLIDE_H : RUNNER_H;
}

/** `Infinity` where the ground is missing. */
function groundLevel(state: RushState, worldX: number): number {
  for (const hazard of state.hazards) {
    if (hazard.kind !== "pit") continue;
    if (worldX > hazard.x && worldX < hazard.x + hazard.w) return Number.POSITIVE_INFINITY;
  }
  return GROUND_Y;
}

function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function stepRush(state: RushState, dtMs: number): void {
  if (state.dead) return;
  const dt = dtMs / 1000;

  state.elapsedMs += dtMs;
  state.speed = Math.min(SPEED_MAX, state.speed + SPEED_RAMP * dt);
  state.distance += state.speed * dt;

  if (state.sliding) {
    // Held slides last as long as the player holds; spikes punish overuse.
    if (!state.slideHeld) state.slideLeft -= dtMs;
    if (state.slideLeft <= 0 && !blockedStanding(state)) state.sliding = false;
  }
  if (state.bufferLeft > 0) state.bufferLeft -= dtMs;
  if (state.coyoteLeft > 0) state.coyoteLeft -= dtMs;

  // Buffered input + coyote time: a jump pressed just before landing, or just
  // after stepping off an edge, still counts.
  if (state.bufferLeft > 0 && state.coyoteLeft > 0) {
    state.vy = JUMP_V;
    state.onGround = false;
    state.bufferLeft = 0;
    state.coyoteLeft = 0;
    state.sliding = false;
    state.slideLeft = 0;
    state.slideHeld = false;
  }

  state.vy += GRAVITY * dt;
  state.y += state.vy * dt;

  const footX = state.distance + RUNNER_W / 2;
  const ground = groundLevel(state, footX);
  if (state.vy >= 0 && state.y >= ground) {
    state.y = ground;
    state.vy = 0;
    if (!state.onGround) state.onGround = true;
    state.coyoteLeft = COYOTE_MS;
  } else {
    state.onGround = false;
  }

  if (state.y > GROUND_Y + 70) {
    state.dead = true;
    return;
  }

  generate(state);
  prune(state);

  const height = runnerHeight(state);
  const rx = state.distance;
  const ry = state.y - height;

  for (const hazard of state.hazards) {
    if (hazard.kind === "pit") continue;
    if (hazard.x + hazard.w < rx - 40) continue;
    if (hazard.x > rx + RUNNER_W + 40) continue;

    if (overlaps(rx, ry, RUNNER_W, height, hazard.x, hazard.y, hazard.w, hazard.h)) {
      state.dead = true;
      return;
    }

    // Track how close the miss was while horizontally overlapping.
    if (rx < hazard.x + hazard.w && rx + RUNNER_W > hazard.x) {
      const gap =
        ry > hazard.y ? ry - (hazard.y + hazard.h) : hazard.y - (ry + height);
      hazard.closest = Math.min(hazard.closest, Math.max(0, gap));
    } else if (!hazard.scored && hazard.x + hazard.w < rx) {
      hazard.scored = true;
      if (hazard.closest <= NEAR_MISS_UNITS) {
        state.nearMisses += 1;
        state.score += NEAR_MISS_POINTS * state.multiplier;
        state.multiplier = Math.min(MULTIPLIER_MAX, state.multiplier + 0.25);
        state.sinceEventMs = 0;
      }
    }
  }

  for (const orb of state.orbs) {
    if (orb.taken || orb.x < rx - 40 || orb.x > rx + RUNNER_W + 40) continue;
    const cx = rx + RUNNER_W / 2;
    const cy = ry + height / 2;
    const dx = orb.x - cx;
    const dy = orb.y - cy;
    if (Math.hypot(dx, dy) < ORB_RADIUS + Math.max(RUNNER_W, height) / 2) {
      orb.taken = true;
      state.orbsTaken += 1;
      state.score += ORB_POINTS * state.multiplier;
      state.multiplier = Math.min(MULTIPLIER_MAX, state.multiplier + 0.2);
      state.sinceEventMs = 0;
    }
  }

  state.bestMultiplier = Math.max(state.bestMultiplier, state.multiplier);
  state.sinceEventMs += dtMs;
  if (state.sinceEventMs > MULTIPLIER_CALM_MS && state.multiplier > 1) {
    state.multiplier = Math.max(1, state.multiplier - 0.6 * dt);
  }

  state.score += state.speed * dt * DISTANCE_POINTS * state.multiplier;
}

export function finalScore(state: RushState): number {
  return Math.max(0, Math.round(state.score));
}
