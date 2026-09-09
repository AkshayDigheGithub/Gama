"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production only — during development a
 * cached shell just gets in the way of seeing changes.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failing (private mode, unsupported browser) costs the
        // install prompt and nothing else — the site works either way.
      });
    };
    // Registering after load keeps it off the critical path.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
