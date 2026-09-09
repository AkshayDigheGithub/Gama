"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { setAnalyticsProvider, trackPage } from "@/lib/analytics";
import { createAnalyticsProvider } from "./index";

/**
 * Installs the analytics provider once and reports route changes.
 * Renders nothing — analytics is a side effect, not UI.
 */
export function AnalyticsContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Events fired before this runs are queued by `trackEvent` and replayed here.
  useEffect(() => {
    setAnalyticsProvider(createAnalyticsProvider());
  }, []);

  useEffect(() => {
    if (pathname) trackPage(pathname);
  }, [pathname]);

  return <>{children}</>;
}
