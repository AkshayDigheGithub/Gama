"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent, type ShareSurface } from "@/lib/analytics";
import { shareOrCopy, type SharePayload } from "@/lib/challenge/share";

export type ShareState = "idle" | "copied" | "shared" | "failed";

export function useShare(surface: ShareSurface) {
  const [state, setState] = useState<ShareState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const share = useCallback(
    async (payload: SharePayload) => {
      const method = await shareOrCopy(payload);
      if (method !== "failed") trackEvent("share_clicked", { surface, method });
      setState(method === "web-share" ? "shared" : method === "clipboard" ? "copied" : "failed");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), 2200);
      return method;
    },
    [surface],
  );

  return { share, state };
}
