"use client";

import { useEffect, useRef, type RefObject } from "react";
import { createLoop } from "@/lib/canvas/loop";
import { resizeCanvas, type Viewport } from "@/lib/canvas/surface";

export interface GameLoopOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  worldWidth: number;
  worldHeight: number;
  running: boolean;
  step: (fixedMs: number) => void;
  draw: (ctx: CanvasRenderingContext2D, viewport: Viewport, alpha: number) => void;
}

/**
 * Binds a fixed-timestep loop to a canvas: handles sizing, device pixel ratio,
 * and pausing when the tab is hidden so a run is never lost to a phone call.
 *
 * `step` and `draw` are read through refs, so a re-render never restarts the
 * loop mid-run.
 */
export function useGameLoop({
  canvasRef,
  worldWidth,
  worldHeight,
  running,
  step,
  draw,
}: GameLoopOptions): void {
  const stepRef = useRef(step);
  const drawRef = useRef(draw);

  // Kept current in an effect rather than during render, so a re-render never
  // restarts the loop and the callbacks are never stale.
  useEffect(() => {
    stepRef.current = step;
    drawRef.current = draw;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !running) return;

    let surface = resizeCanvas(canvas, worldWidth, worldHeight);
    const onResize = () => {
      surface = resizeCanvas(canvas, worldWidth, worldHeight);
    };

    const observer = new ResizeObserver(onResize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    const loop = createLoop({
      step: (fixedMs) => stepRef.current(fixedMs),
      render: (alpha) => {
        if (!surface) surface = resizeCanvas(canvas, worldWidth, worldHeight);
        if (surface) drawRef.current(surface.ctx, surface.viewport, alpha);
      },
    });

    const onVisibility = () => {
      if (document.hidden) loop.stop();
      else loop.start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    loop.start();

    return () => {
      loop.stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [canvasRef, worldWidth, worldHeight, running]);
}
