import type { Metadata } from "next";
import { DailyCard } from "@/components/game/daily-card";
import { StreakStrip } from "@/components/game/streak-strip";
import { DailyHistory } from "@/components/game/daily-history";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Daily challenge",
  description:
    "One challenge a day, generated from the date itself. Clear the target, keep your streak alive, come back tomorrow.",
  alternates: { canonical: canonical("/daily") },
  openGraph: {
    title: "Daily challenge — ONE MORE",
    description: "A new target every day. Keep the streak alive.",
    url: canonical("/daily"),
  },
};

export default function DailyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl pad-safe py-10">
      <header>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Daily challenge</h1>
        <p className="mt-3 text-base leading-relaxed text-ink-dim">
          One game, one target, every day. Finish a game to keep your streak alive.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-3">
        <DailyCard />
        <StreakStrip />
        <DailyHistory />
      </div>

      <section className="mt-14 border-t border-line/70 pt-10">
        <h2 className="text-2xl font-bold tracking-tight">How the daily challenge is made</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-dim">
          The challenge is derived from the calendar date — the day picks the game and the target
          score through a deterministic seed. There is no server involved, so the same device sees
          the same challenge all day, and tomorrow brings a different one automatically.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-dim">
          Streaks are credited once per calendar day, and only when you actually finish a game.
          Reloading the page or reopening a game does nothing, and the streak refuses to advance if
          the device clock moves backwards.
        </p>
      </section>
    </div>
  );
}
