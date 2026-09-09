"use client";

import { m, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/** 3 · 2 · 1 · GO. Short by design — nobody wants a cutscene before a 20s game. */
export function Countdown({ from = 3, onDone }: { from?: number; onDone: () => void }) {
  const [value, setValue] = useState(from);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (value <= 0) {
      const done = setTimeout(onDone, reduced ? 0 : 260);
      return () => clearTimeout(done);
    }
    const tick = setTimeout(() => setValue((current) => current - 1), reduced ? 260 : 620);
    return () => clearTimeout(tick);
  }, [value, onDone, reduced]);

  return (
    <div className="stack-center flex-1" aria-live="polite">
      <m.span
        key={value}
        initial={reduced ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="text-[clamp(5rem,26vw,10rem)] leading-none font-black tracking-tighter text-accent"
      >
        {value > 0 ? value : "GO"}
      </m.span>
    </div>
  );
}
