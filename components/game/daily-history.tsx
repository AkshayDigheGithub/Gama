"use client";

import { Check, X } from "lucide-react";
import { addDays, toDateKey } from "@/lib/daily/date-key";
import { dailySchema } from "@/lib/daily/schema";
import { GAMES } from "@/lib/games";
import { formatNumber } from "@/lib/utils";
import { useHydrated, useLocalStorage } from "@/hooks/use-local-storage";

/** The last fourteen days of daily attempts, read from this browser only. */
export function DailyHistory() {
  const hydrated = useHydrated();
  const [log] = useLocalStorage(dailySchema);

  if (!hydrated) {
    return <div className="h-40 animate-pulse rounded-[var(--radius-card)] border border-line bg-surface/40" aria-hidden />;
  }

  const today = toDateKey();
  const days = Array.from({ length: 14 }, (_, index) => addDays(today, -index)).filter(
    (date) => log[date],
  );

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface/60 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">
        Recent dailies
      </h2>

      {days.length === 0 ? (
        <p className="mt-3 text-sm text-ink-dim">
          Nothing yet. Play today&apos;s challenge and it will show up here.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {days.map((date) => {
            const record = log[date];
            return (
              <li
                key={date}
                className="flex items-center gap-3 rounded-xl bg-surface-2/40 px-3.5 py-2.5 text-sm"
              >
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-lg ${
                    record.met ? "bg-good/15 text-good" : "bg-surface-2 text-ink-faint"
                  }`}
                >
                  {record.met ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                </span>
                <span className="tabular text-ink-dim">{date}</span>
                <span className="min-w-0 flex-1 truncate text-ink-faint">
                  {GAMES[record.game].name}
                </span>
                <span className="shrink-0 font-bold tabular">
                  {formatNumber(record.bestScore)}
                  <span className="ml-1 font-normal text-ink-faint">/ {formatNumber(record.goal)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
