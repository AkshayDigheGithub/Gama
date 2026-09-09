import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  className?: string;
  tone?: "default" | "accent" | "good" | "hot";
}

const TONE: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "text-ink",
  accent: "text-accent",
  good: "text-good",
  hot: "text-hot",
};

export function StatTile({ label, value, hint, className, tone = "default" }: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface/60 px-4 py-3.5 text-center",
        className,
      )}
    >
      <div className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </div>
      <div className={cn("mt-1 text-xl font-bold tabular tracking-tight", TONE[tone])}>{value}</div>
      {hint ? <div className="mt-0.5 text-[0.6875rem] text-ink-faint">{hint}</div> : null}
    </div>
  );
}
