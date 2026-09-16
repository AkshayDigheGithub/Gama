"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { m, useInView, useReducedMotion } from "framer-motion";

/** How far below the fold a section has to start before it is worth hiding. */
const FOLD = 0.92;

/**
 * A section that rises into place as it is scrolled to.
 *
 * Deliberately inverted: the section renders *visible* and is only hidden once,
 * on mount, if it starts below the fold — where nobody can see it being
 * hidden. Everything above the fold is left alone, and if the JavaScript never
 * runs the whole page is still there, fully visible, for the reader and the
 * crawler. Reveals happen once; a section that re-animates every time it
 * scrolls past is a distraction rather than a flourish.
 */
export function Reveal({
  children,
  delay = 0,
  ...props
}: ComponentProps<typeof m.section> & { delay?: number }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-6% 0px" });
  const [belowFold, setBelowFold] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (reduced || !element) return;
    setBelowFold(element.getBoundingClientRect().top > window.innerHeight * FOLD);
  }, [reduced]);

  // `once: true` keeps `inView` latched, so a revealed section stays revealed.
  const hidden = belowFold && !inView;

  return (
    <m.section
      ref={ref}
      // No `initial`: the server-rendered markup carries no opacity to undo.
      initial={false}
      animate={hidden ? { opacity: 0, y: 22 } : { opacity: 1, y: 0 }}
      // Hiding is instant and unseen; only the reveal is animated.
      transition={hidden ? { duration: 0 } : { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </m.section>
  );
}
