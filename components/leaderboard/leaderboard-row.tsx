import { cn, formatNumber } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/leaderboard/types";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

export function LeaderboardRow({ entry, dim = false }: { entry: LeaderboardEntry; dim?: boolean }) {
  const medal = entry.rank <= 3 ? MEDALS[entry.rank - 1] : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
        entry.isYou
          ? "border-accent/40 bg-accent/10"
          : "border-transparent bg-surface-2/40 hover:bg-surface-2/70",
        dim && !entry.isYou && "opacity-70",
      )}
    >
      <span
        className={cn(
          "w-10 shrink-0 text-sm font-bold tabular",
          entry.isYou ? "text-accent" : "text-ink-faint",
        )}
      >
        {medal ?? `#${entry.rank}`}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-semibold clamp-text",
          entry.isYou ? "text-accent" : "text-ink",
        )}
      >
        {entry.isYou ? `${entry.username} · you` : entry.username}
      </span>
      <span className="shrink-0 text-sm font-bold tabular">{formatNumber(entry.score)}</span>
    </div>
  );
}
