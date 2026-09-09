"use client";

import { m, useReducedMotion } from "framer-motion";
import { BENCHMARK_NOTE } from "@/lib/scoring/percentile";

export function PerformanceMeter({ value, label = "Your performance" }: { value: number; label?: string }) {
  const reduced = useReducedMotion();

  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          {label}
        </span>
        <span className="text-xl font-bold tabular text-accent">{value}%</span>
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <m.div
          className="h-full rounded-full bg-accent"
          initial={{ width: reduced ? `${value}%` : 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: reduced ? 0 : 0.8, ease: [0.16, 1, 0.3, 1], delay: reduced ? 0 : 0.35 }}
        />
      </div>
      <p className="mt-2.5 text-[0.6875rem] leading-relaxed text-ink-faint">{BENCHMARK_NOTE}</p>
    </div>
  );
}
