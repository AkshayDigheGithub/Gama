import {
  POP_MS,
  WORLD_H,
  WORLD_W,
  type SalvoState,
  type Target,
  type TargetKind,
} from "./engine";

const LINE = "#1d2230";
const ACCENT = "#c9ff3b";
const COOL = "#4fd8ff";
const ROYAL = "#8b5cf6";
const ROSE = "#ff5c8a";

const COLOUR: Record<TargetKind, string> = {
  standard: ACCENT,
  rapid: COOL,
  shielded: ROYAL,
  void: ROSE,
};

export interface Splash {
  x: number;
  y: number;
  age: number;
  kind: "kill" | "miss" | "void";
}

function drawTarget(ctx: CanvasRenderingContext2D, target: Target): void {
  const colour = COLOUR[target.kind];
  const popping = target.dyingFor !== null;
  const pop = popping ? Math.min(1, (target.dyingFor ?? 0) / POP_MS) : 0;
  const radius = target.radius * (popping ? 1 + pop * 0.7 : 1);

  ctx.save();
  ctx.globalAlpha = popping ? 1 - pop : 1;
  ctx.translate(target.x, target.y);

  // Soft halo, so targets read instantly against the dark ground.
  ctx.fillStyle = colour;
  ctx.globalAlpha *= 0.14;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = popping ? 1 - pop : 1;

  if (target.kind === "void") {
    // Deliberately the odd one out: hollow, crossed through, never filled.
    ctx.strokeStyle = colour;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    const arm = radius * 0.5;
    ctx.beginPath();
    ctx.moveTo(-arm, -arm);
    ctx.lineTo(arm, arm);
    ctx.moveTo(arm, -arm);
    ctx.lineTo(-arm, arm);
    ctx.stroke();
  } else {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
    ctx.stroke();

    // A shielded target still carrying its shield gets a second, broken ring.
    if (target.kind === "shielded" && target.hp > 1) {
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.05, (i * Math.PI) / 2 + 0.25, (i * Math.PI) / 2 + Math.PI / 2 - 0.25);
        ctx.stroke();
      }
    }
  }

  // Fuse: the remaining arc is how long you have left.
  if (!popping) {
    const remaining = Math.max(0, target.life / target.maxLife);
    ctx.strokeStyle = colour;
    ctx.globalAlpha *= 0.55;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.3, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawSalvo(
  ctx: CanvasRenderingContext2D,
  state: SalvoState,
  splashes: Splash[],
): void {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = "#05060a";
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Faint grid, purely to give the eye something to judge position against.
  ctx.strokeStyle = LINE;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  for (let x = 40; x < WORLD_W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_H);
    ctx.stroke();
  }
  for (let y = 40; y < WORLD_H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_W, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const target of state.targets) drawTarget(ctx, target);

  for (const splash of splashes) {
    const progress = Math.min(1, splash.age / 260);
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.translate(splash.x, splash.y);
    ctx.strokeStyle = splash.kind === "kill" ? ACCENT : ROSE;
    ctx.lineWidth = 2;
    if (splash.kind === "miss") {
      // A small cross where a wasted shot landed — feedback for spraying.
      const arm = 5;
      ctx.beginPath();
      ctx.moveTo(-arm, -arm);
      ctx.lineTo(arm, arm);
      ctx.moveTo(arm, -arm);
      ctx.lineTo(-arm, arm);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 8 + progress * 22, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
