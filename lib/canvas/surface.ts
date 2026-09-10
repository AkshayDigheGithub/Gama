/**
 * Canvas sizing for a fixed logical world.
 *
 * Games are authored in world units; this maps those units onto whatever CSS
 * pixels the device gives us, at the device's pixel ratio, letter-boxing so the
 * aspect ratio never distorts. Every game then draws in world coordinates and
 * looks identical on every screen.
 */

export interface Viewport {
  /** Multiply world units by this to get CSS pixels. */
  scale: number;
  /** Letter-box offsets, in CSS pixels. */
  offsetX: number;
  offsetY: number;
  cssWidth: number;
  cssHeight: number;
}

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  worldWidth: number,
  worldHeight: number,
): { ctx: CanvasRenderingContext2D; viewport: Viewport } | null {
  const parent = canvas.parentElement;
  if (!parent) return null;

  const cssWidth = Math.max(1, parent.clientWidth);
  const cssHeight = Math.max(1, parent.clientHeight);
  // Cap the ratio: a 3x phone gains nothing visible from a 3x backing store on
  // a full-screen canvas, and it costs a lot of fill rate.
  const ratio = Math.min(typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 2);

  const width = Math.round(cssWidth * ratio);
  const height = Math.round(cssHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const scale = Math.min(cssWidth / worldWidth, cssHeight / worldHeight);
  const viewport: Viewport = {
    scale,
    offsetX: (cssWidth - worldWidth * scale) / 2,
    offsetY: (cssHeight - worldHeight * scale) / 2,
    cssWidth,
    cssHeight,
  };

  ctx.setTransform(
    scale * ratio,
    0,
    0,
    scale * ratio,
    viewport.offsetX * ratio,
    viewport.offsetY * ratio,
  );
  return { ctx, viewport };
}
