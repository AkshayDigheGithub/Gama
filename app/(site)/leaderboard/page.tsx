import type { Metadata } from "next";
import { LeaderboardBoard } from "@/components/leaderboard/leaderboard-board";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "See where your ONE MORE scores land across Reaction, Crowd Pick, Memory and Chain. An MVP demo board — the roster is simulated and your scores are stored in your own browser.",
  alternates: { canonical: canonical("/leaderboard") },
  openGraph: {
    title: "Leaderboard — ONE MORE",
    description: "Where your scores land across all four games.",
    url: canonical("/leaderboard"),
  },
};

export default function LeaderboardPage() {
  return (
    <div className="mx-auto w-full max-w-2xl pad-safe py-10">
      <header>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Leaderboard</h1>
        <p className="mt-3 text-base leading-relaxed text-ink-dim">
          Overall is the sum of your best score in each game. Beat your own number and your row
          moves the moment you finish a run.
        </p>
      </header>

      <div className="mt-8">
        <LeaderboardBoard limit={20} />
      </div>

      <section className="mt-14 border-t border-line/70 pt-10">
        <h2 className="text-2xl font-bold tracking-tight">How this board works</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-dim">
          ONE MORE has no database yet, so there is no global score table to read from. Instead the
          board is generated: a deterministic roster of simulated players is created from today&apos;s
          date, and your own best scores — read from this browser — are ranked against them. The
          same day always produces the same roster, so your rank does not jump around between page
          loads, and the field refreshes once a day.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-dim">
          Those names are not people, and local scores are not verified — anyone can edit their own
          browser storage. The leaderboard is built behind a provider interface, so when a real
          backend exists it can be swapped in without changing a single game screen.
        </p>
      </section>
    </div>
  );
}
