"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { cn, formatNumber } from "@/lib/utils";

interface ScoreCounterProps {
  value: number;
  className?: string;
  durationMs?: number;
  suffix?: string;
}

/**
 * The score count-up. This is the single most important animation on the site:
 * it turns a number into a small event. Reduced motion jumps straight to the
 * final value rather than showing a slower version of the same thing.
 */
export function ScoreCounter({ value, className, durationMs = 900, suffix }: ScoreCounterProps) {
  const reduced = useReducedMotion();
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const controls = animate(0, value, {
      duration: durationMs / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setAnimated(Math.round(latest)),
      // The last frame can land a rounding step short of the target.
      onComplete: () => setAnimated(value),
    });
    return () => controls.stop();
  }, [value, durationMs, reduced]);

  const display = reduced ? value : animated;

  return (
    <span className={cn("tabular", className)} aria-label={`${value}${suffix ?? ""}`}>
      {formatNumber(display)}
      {suffix}
    </span>
  );
}
