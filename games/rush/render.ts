import {
  GROUND_Y,
  ORB_RADIUS,
  RUNNER_W,
  RUNNER_X,
  WORLD_H,
  WORLD_W,
  runnerHeight,
  type RushState,
} from "./engine";

/** Palette lifted from the design tokens so the canvas matches the DOM. */
const LINE = "#1d2230";
const ACCENT = "#c9ff3b";
const ROSE = "#ff5c8a";
const AMBER = "#ffb020";
const ROYAL = "#8b5cf6";
const FAINT = "#6a7288";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Two dim layers scrolling at fractions of world speed — depth, cheaply. */
function drawParallax(ctx: CanvasRenderingContext2D, distance: number): void {
  ctx.save();
  for (const [factor, height, alpha, step] of [
    [0.18, 34, 0.16, 96],
    [0.42, 20, 0.24, 62],
  ] as const) {
    ctx.fillStyle = LINE;
    ctx.globalAlpha = alpha;
    const shift = (distance * factor) % step;
    for (let i = -1; i * step - shift < WORLD_W + step; i += 1) {
      const x = i * step - shift;
      const h = height * (0.6 + ((i * 37) % 10) / 14);
      ctx.fillRect(x, GROUND_Y - h, step * 0.42, h);
    }
  }
  ctx.restore();
}

function drawRunner(ctx: CanvasRenderingContext2D, state: RushState): void {
  const height = runnerHeight(state);
  const x = RUNNER_X;
  const y = state.y;
  const airborne = !state.onGround;

  ctx.save();
  ctx.translate(x, y);

  // Motion trail: kept faint and tight, or it reads as a second runner.
  ctx.fillStyle = ACCENT;
  for (let i = 3; i >= 1; i -= 1) {
    ctx.globalAlpha = 0.035 * i;
    roundRect(ctx, -i * 4, -height + i, RUNNER_W - i * 2, height - i * 2, 5);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (state.sliding) {
    ctx.fillStyle = ACCENT;
    roundRect(ctx, -2, -height, RUNNER_W + 6, height, 6);
    ctx.fill();
    ctx.fillStyle = "#0a1000";
    ctx.beginPath();
    ctx.arc(RUNNER_W - 1, -height + 5, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Legs: a simple two-phase cycle driven by distance, tucked while airborne.
  const phase = (state.distance / 15) % (Math.PI * 2);
  const swing = airborne ? 0.5 : Math.sin(phase) * 1.5;
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (const dir of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(RUNNER_W / 2, -8);
    ctx.lineTo(RUNNER_W / 2 + swing * dir * 3, airborne ? -3 : 0);
    ctx.stroke();
  }

  ctx.fillStyle = ACCENT;
  roundRect(ctx, 0, -height, RUNNER_W, height - 7, 5);
  ctx.fill();

  // Visor, so the character reads as facing forward.
  ctx.fillStyle = "#0a1000";
  ctx.fillRect(RUNNER_W - 6, -height + 5, 4, 3);
  ctx.restore();
}

export function drawRush(ctx: CanvasRenderingContext2D, state: RushState): void {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = "#05060a";
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  drawParallax(ctx, state.distance);

  const camera = state.distance - RUNNER_X;
  const toScreen = (worldX: number) => worldX - camera;

  // Ground, broken by pits.
  ctx.fillStyle = LINE;
  const pits = state.hazards
    .filter((h) => h.kind === "pit")
    .map((h) => [toScreen(h.x), toScreen(h.x + h.w)] as const)
    .sort((a, b) => a[0] - b[0]);
  let cursor = 0;
  for (const [from, to] of pits) {
    if (to < 0 || from > WORLD_W) continue;
    if (from > cursor) ctx.fillRect(cursor, GROUND_Y, from - cursor, 3);
    cursor = Math.max(cursor, to);
  }
  if (cursor < WORLD_W) ctx.fillRect(cursor, GROUND_Y, WORLD_W - cursor, 3);

  ctx.fillStyle = "#0b0e16";
  ctx.fillRect(0, GROUND_Y + 3, WORLD_W, WORLD_H - GROUND_Y);

  for (const hazard of state.hazards) {
    const sx = toScreen(hazard.x);
    if (sx > WORLD_W + 40 || sx + hazard.w < -40) continue;

    if (hazard.kind === "spike") {
      ctx.fillStyle = ROSE;
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y);
      ctx.lineTo(sx + hazard.w / 2, hazard.y);
      ctx.lineTo(sx + hazard.w, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    } else if (hazard.kind === "bar") {
      ctx.fillStyle = AMBER;
      roundRect(ctx, sx, hazard.y, hazard.w, hazard.h, 3);
      ctx.fill();
    } else if (hazard.kind === "block") {
      ctx.fillStyle = ROYAL;
      roundRect(ctx, sx, hazard.y, hazard.w, hazard.h, 3);
      ctx.fill();
    } else {
      ctx.fillStyle = "#05060a";
      ctx.fillRect(sx, GROUND_Y, hazard.w, WORLD_H - GROUND_Y);
      ctx.strokeStyle = ROSE;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y + 1);
      ctx.lineTo(sx, GROUND_Y + 12);
      ctx.moveTo(sx + hazard.w, GROUND_Y + 1);
      ctx.lineTo(sx + hazard.w, GROUND_Y + 12);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  for (const orb of state.orbs) {
    if (orb.taken) continue;
    const sx = toScreen(orb.x);
    if (sx > WORLD_W + 20 || sx < -20) continue;
    ctx.fillStyle = ACCENT;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(sx, orb.y, ORB_RADIUS * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(sx, orb.y, ORB_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRunner(ctx, state);

  if (state.multiplier > 1.05) {
    ctx.fillStyle = ACCENT;
    ctx.globalAlpha = 0.85;
    ctx.font = "700 11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`x${state.multiplier.toFixed(1)}`, 8, 16);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = FAINT;
  ctx.font = "600 9px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(state.speed)} u/s`, WORLD_W - 8, 16);
}
