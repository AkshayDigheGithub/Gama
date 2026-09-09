import { cn } from "@/lib/utils";
import { clamp } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  label?: string;
}

export function Progress({ value, max = 100, className, barClassName, label }: ProgressProps) {
  const pct = clamp((value / (max || 1)) * 100, 0, 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}
    >
      <div
        className={cn("h-full rounded-full bg-accent transition-[width] duration-200 ease-out", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
