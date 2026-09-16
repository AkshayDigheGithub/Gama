"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * The pixel grid behind the hero.
 *
 * A cheap canvas field of squares that breathes on a slow sine and lights up
 * around the cursor, so the first thing a visitor touches on the page already
 * reacts to them. It is decorative: `aria-hidden`, pointer-transparent, and it
 * costs nothing when nobody is looking — the loop stops when the tab is hidden
 * or the hero scrolls out of view, and never starts at all under
 * `prefers-reduced-motion`, which gets one static frame instead.
 */

/** CSS pixels between cells. Bigger spacing means fewer cells to draw. */
const SPACING = 26;
/** How far the cursor's light carries, in CSS pixels. */
const REACH = 170;
const CELL = 1.8;

export function ArcadeGrid({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 1;
    let height = 1;
    let raf = 0;
    let running = false;
    let onScreen = true;
    // Off-canvas until a real mouse arrives, so nothing glows on a phone.
    const pointer = { x: -9999, y: -9999, live: false };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      const ratio = Math.min(typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      for (let y = SPACING / 2; y < height; y += SPACING) {
        for (let x = SPACING / 2; x < width; x += SPACING) {
          const wave = 0.5 + 0.5 * Math.sin(x * 0.012 + y * 0.02 + time * 0.0009);
          let alpha = 0.09 + wave * 0.07;
          let size = CELL;

          if (pointer.live) {
            const distance = Math.hypot(x - pointer.x, y - pointer.y);
            if (distance < REACH) {
              // Squared falloff: a tight bright core rather than a flat disc.
              const lift = (1 - distance / REACH) ** 2;
              alpha += lift * 0.7;
              size += lift * 2.2;
            }
          }

          ctx.fillStyle = `rgba(201, 255, 59, ${alpha})`;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
      }

      if (pointer.live) {
        ctx.strokeStyle = "rgba(201, 255, 59, 0.22)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 30, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const frame = (time: number) => {
      if (!running) return;
      draw(time);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      // Touch drags are scrolls, not aiming — only a real pointer lights cells.
      if (event.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.live =
        pointer.x > -REACH &&
        pointer.y > -REACH &&
        pointer.x < width + REACH &&
        pointer.y < height + REACH;
    };

    const onPointerLeave = () => {
      pointer.live = false;
    };

    const onVisibility = () => {
      if (document.hidden || !onScreen) stop();
      else start();
    };

    resize();
    draw(0);

    const sizeObserver = new ResizeObserver(() => {
      resize();
      if (!running) draw(0);
    });
    sizeObserver.observe(canvas);

    const viewObserver = new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      onVisibility();
    });
    viewObserver.observe(canvas);

    if (!reduced) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerout", onPointerLeave, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
      start();
    }

    return () => {
      stop();
      sizeObserver.disconnect();
      viewObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
