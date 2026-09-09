import type { ReactNode } from "react";

export interface AdSlotProps {
  /** Stable identifier a future ad provider would map to a placement. */
  id: string;
  format?: "banner" | "inline" | "interstitial";
  className?: string;
  /** Rendered instead of an ad — e.g. a link to another game. */
  fallback?: ReactNode;
}

/**
 * Placeholder for future advertising.
 *
 * Deliberately renders nothing (or a house fallback). The MVP shows no ads and
 * must never render a fake one; this exists so placements are already decided
 * when a real provider is wired in.
 */
export function AdSlot({ fallback = null, className }: AdSlotProps) {
  if (!fallback) return null;
  return <div className={className}>{fallback}</div>;
}
