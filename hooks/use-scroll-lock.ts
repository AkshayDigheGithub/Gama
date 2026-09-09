"use client";

import { useEffect } from "react";

/**
 * Stops the page from scrolling (and iOS from rubber-banding) while a game is
 * on screen, so a fast tap never drags the viewport instead of registering.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const { body, documentElement } = document;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlOverflow: documentElement.style.overflow,
    };
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    documentElement.style.overflow = "hidden";
    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscroll;
      documentElement.style.overflow = previous.htmlOverflow;
    };
  }, [active]);
}
