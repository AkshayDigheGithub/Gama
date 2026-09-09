import type { ReactNode } from "react";

/**
 * Games run without site chrome: no header, no footer, no distractions —
 * just the play surface inside the device's safe areas.
 */
export default function PlayLayout({ children }: { children: ReactNode }) {
  return <div className="relative z-10 flex min-h-[100svh] flex-1 flex-col">{children}</div>;
}
