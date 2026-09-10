/**
 * Fixed-timestep game loop.
 *
 * The DOM games drive themselves from React state, but a 60fps runner cannot —
 * physics has to advance in fixed increments or jump heights change with frame
 * rate, and a slow frame would tunnel the player through an obstacle.
 *
 * Simulation runs in fixed steps; rendering interpolates between them. Time
 * only advances while the loop is running, so a backgrounded tab pauses the
 * run rather than silently killing it.
 */

export interface LoopOptions {
  /** Advance the simulation by exactly `fixedMs`. */
  step: (fixedMs: number) => void;
  /** Draw. `alpha` is 0–1 progress toward the next step, for interpolation. */
  render: (alpha: number) => void;
  fixedMs?: number;
  /**
   * Longest real frame the loop will honour. A tab that was hidden must not
   * come back and simulate ten seconds of physics in one go.
   */
  maxFrameMs?: number;
}

export interface Loop {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

export function createLoop({
  step,
  render,
  fixedMs = 1000 / 120,
  maxFrameMs = 100,
}: LoopOptions): Loop {
  let raf = 0;
  let previous = 0;
  let accumulator = 0;
  let running = false;

  const frame = (now: number) => {
    if (!running) return;
    const elapsed = Math.min(now - previous, maxFrameMs);
    previous = now;
    accumulator += elapsed;

    // Bounded so a pathological frame can never spiral into an endless catch-up.
    let steps = 0;
    while (accumulator >= fixedMs && steps < 8) {
      step(fixedMs);
      accumulator -= fixedMs;
      steps += 1;
    }
    if (steps === 8) accumulator = 0;

    render(accumulator / fixedMs);
    raf = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (running) return;
      running = true;
      previous = performance.now();
      accumulator = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    isRunning: () => running,
  };
}
