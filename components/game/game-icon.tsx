import { Brain, Target, Waypoints, Zap, type LucideProps } from "lucide-react";
import type { GameDefinition } from "@/lib/games";

const ICONS = { zap: Zap, target: Target, brain: Brain, waypoints: Waypoints } as const;

export function GameIcon({ icon, ...props }: { icon: GameDefinition["icon"] } & LucideProps) {
  const Component = ICONS[icon];
  return <Component {...props} />;
}
