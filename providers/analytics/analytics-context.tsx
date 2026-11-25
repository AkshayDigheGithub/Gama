"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { setAnalyticsProvider, trackPage } from "@/lib/analytics";
import { createAnalyticsProvider } from "./index";

/**
 * Installs the analytics provider once and reports route changes.
 * Renders nothing — analytics is a side effect, not UI.
 *
 * `gtmEnabled` is passed down from the root layout, which is the only side that
 * can tell whether the GTM container was rendered for this request.
 */
export function AnalyticsContextProvider({
  children,
  gtmEnabled = false,
}: {
  children: ReactNode;
  gtmEnabled?: boolean;
}) {
  const pathname = usePathname();

  // Events fired before this runs are queued by `trackEvent` and replayed here.
  useEffect(() => {
    setAnalyticsProvider(createAnalyticsProvider({ gtm: gtmEnabled }));
  }, [gtmEnabled]);

  useEffect(() => {
    if (pathname) trackPage(pathname);
  }, [pathname]);

  return <>{children}</>;
}
