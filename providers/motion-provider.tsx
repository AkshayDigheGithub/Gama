"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Ships the small Framer Motion feature bundle instead of the full `motion`
 * component. `domAnimation` covers animations, variants, exit animations and
 * hover/tap gestures — everything ONE MORE uses — at roughly a third of the
 * size. `strict` makes an accidental `motion.*` import fail loudly rather than
 * silently pulling the large bundle back in.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
