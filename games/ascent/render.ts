import {
  LEFT_FACE,
  PLAYER_H,
  PLAYER_W,
  RIGHT_FACE,
  WALL_THICKNESS,
  WORLD_H,
  WORLD_W,
  type AscentState,
} from "./engine";

const INK = "#f4f6fa";
const LINE = "#1d2230";
const ACCENT = "#c9ff3b";
const ROSE = "#ff5c8a";

/** Player sits this far down the screen; the world scrolls under them. */
export const CAMERA_ANCHOR = 0.62;

export function screenY(worldY: number, cameraY: number): number {
  return WORLD_H * CAMERA_ANCHOR - (worldY - cameraY);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function drawAscent(
  ctx: CanvasRenderingContext2D,
  state: AscentState,
  cameraY: number,
): void {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = "#05060a";
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Height rungs drifting past, so the climb reads as movement.
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  const firstRung = Math.floor((cameraY - WORLD_H) / 100) * 100;
  for (let h = firstRung; h < cameraY + WORLD_H; h += 100) {
    const y = screenY(h, cameraY);
    if (y < -10 || y > WORLD_H + 10) continue;
    ctx.beginPath();
    ctx.moveTo(LEFT_FACE, y);
    ctx.lineTo(RIGHT_FACE, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Walls.
  ctx.fillStyle = "#0e1119";
  ctx.fillRect(LEFT_FACE - WALL_THICKNESS, 0, WALL_THICKNESS, WORLD_H);
  ctx.fillRect(RIGHT_FACE, 0, WALL_THICKNESS, WORLD_H);
  ctx.fillStyle = LINE;
  ctx.fillRect(LEFT_FACE - 2, 0, 2, WORLD_H);
  ctx.fillRect(RIGHT_FACE, 0, 2, WORLD_H);

  // Spike runs as teeth pointing into the gap.
  ctx.fillStyle = ROSE;
  for (const run of state.spikes) {
    const top = screenY(run.to, cameraY);
    const bottom = screenY(run.from, cameraY);
    if (bottom < -20 || top > WORLD_H + 20) continue;
    const face = run.side === -1 ? LEFT_FACE : RIGHT_FACE;
    const dir = run.side === -1 ? 1 : -1;
    const teeth = Math.max(1, Math.round((bottom - top) / 10));
    for (let i = 0; i < teeth; i += 1) {
      const y0 = top + (i * (bottom - top)) / teeth;
      const y1 = top + ((i + 1) * (bottom - top)) / teeth;
      ctx.beginPath();
      ctx.moveTo(face, y0);
      ctx.lineTo(face + dir * 9, (y0 + y1) / 2);
      ctx.lineTo(face, y1);
      ctx.closePath();
      ctx.fill();
    }
  }

  // The void, with a ragged crest.
  const voidTop = screenY(state.voidY, cameraY);
  if (voidTop < WORLD_H + 40) {
    ctx.fillStyle = ROSE;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(0, voidTop, WORLD_W, WORLD_H - voidTop + 40);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ROSE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= WORLD_W; x += 12) {
      const jag = ((x * 7919) % 11) - 5;
      if (x === 0) ctx.moveTo(x, voidTop + jag);
      else ctx.lineTo(x, voidTop + jag);
    }
    ctx.stroke();
  }

  // Player: a capsule that leans into its wall, or tilts through a jump.
  const py = screenY(state.y, cameraY);
  ctx.save();
  ctx.translate(state.x + PLAYER_W / 2, py - PLAYER_H / 2);
  if (!state.clinging) ctx.rotate(Math.max(-0.5, Math.min(0.5, -state.vy / 900)) * state.vx > 0 ? 0.2 : -0.2);
  ctx.fillStyle = state.dead ? ROSE : ACCENT;
  roundRect(ctx, -PLAYER_W / 2, -PLAYER_H / 2, PLAYER_W, PLAYER_H, 5);
  ctx.fill();
  ctx.fillStyle = "#0a1000";
  ctx.fillRect(state.side === -1 ? 1 : -4, -PLAYER_H / 2 + 4, 3, 3);
  ctx.restore();

  if (!state.clinging && !state.dead) {
    // Faint landing marker on the far wall — teaches the arc without a tutorial.
    const target = state.side === -1 ? RIGHT_FACE : LEFT_FACE - 8;
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(target, py - 1, 8, 2);
    ctx.globalAlpha = 1;
  }
}
