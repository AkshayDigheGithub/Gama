import type { ReactNode } from "react";

export interface PremiumFeatureProps {
  feature: string;
  children: ReactNode;
  /** Shown when the feature is locked. Nothing is locked in the MVP. */
  locked?: ReactNode;
}

/**
 * Gate for future paid features. Everything is unlocked in the MVP, so this is
 * a pass-through — the seam exists so pricing decisions never require a
 * refactor of the game screens.
 */
export function PremiumFeature({ children, locked }: PremiumFeatureProps) {
  const entitled = true;
  return <>{entitled ? children : locked}</>;
}
