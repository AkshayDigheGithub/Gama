import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Trophy, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DailyCard } from "@/components/game/daily-card";
import { GameCard } from "@/components/game/game-card";
import { StreakStrip } from "@/components/game/streak-strip";
import { LeaderboardBoard } from "@/components/leaderboard/leaderboard-board";
import { GAME_LIST } from "@/lib/games";
import { SITE, canonical } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: canonical("/") },
};

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-5xl pad-safe">
      {/* ------------------------------------------------------------ hero -- */}
      <section className="flex flex-col items-center pt-14 pb-16 text-center sm:pt-20 sm:pb-20">
        <Badge variant="accent" className="animate-rise">
          <Zap />
          No login. No download.
        </Badge>

        <h1 className="mt-6 text-[clamp(3.25rem,15vw,7rem)] leading-[0.85] font-black tracking-[-0.04em]">
          ONE
          <br className="sm:hidden" />
          <span className="sm:ml-4">MORE</span>
        </h1>

        <p className="mt-6 max-w-md text-lg leading-snug text-ink-dim sm:text-xl">
          Quick games. Global competition.
          <br />
          <span className="text-ink">{SITE.tagline}</span>
        </p>

        <div className="mt-9 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Button asChild size="xl" className="text-lg">
            <Link href="/games/reaction">
              Play now
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="xl" variant="secondary">
            <Link href="/games">Browse games</Link>
          </Button>
        </div>

        <p className="mt-5 text-xs text-ink-faint">
          Six games. Under a minute each. Your scores stay in this browser.
        </p>
      </section>

      {/* ----------------------------------------------------------- games -- */}
      <section aria-labelledby="todays-games" className="pb-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2
            id="todays-games"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint"
          >
            Today&apos;s games
          </h2>
          <Link
            href="/games"
            className="text-xs font-semibold text-ink-dim transition-colors hover:text-accent"
          >
            All games
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GAME_LIST.map((game, index) => (
            <GameCard key={game.id} game={game} index={index} />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------- daily + streak -- */}
      <section className="grid gap-3 pb-14 lg:grid-cols-2">
        <DailyCard />
        <StreakStrip />
      </section>

      {/* ----------------------------------------------------- leaderboard -- */}
      <section aria-labelledby="ranks" className="pb-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="ranks" className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">
            <Trophy className="mr-1.5 inline size-3.5 align-[-2px]" />
            Leaderboard
          </h2>
          <Link
            href="/leaderboard"
            className="text-xs font-semibold text-ink-dim transition-colors hover:text-accent"
          >
            Full board
          </Link>
        </div>
        <LeaderboardBoard limit={5} />
      </section>

      {/* ------------------------------------------------------------- seo -- */}
      <section className="border-t border-line/70 pb-4 pt-10">
        <h2 className="text-2xl font-bold tracking-tight">Fast browser games, no account needed</h2>
        <div className="mt-4 grid gap-6 text-sm leading-relaxed text-ink-dim md:grid-cols-3">
          <p>
            ONE MORE is built around a single loop: open a game, play it in under a minute, see
            exactly how you did, and go again. There is nothing to install, nothing to sign up for
            and no email to hand over. Tap a game and you are playing.
          </p>
          <p>
            Reaction measures your reflexes across five rounds and reports your best and average in
            milliseconds. Crowd Pick asks you to choose the number nobody else would. Memory grows
            from a gentle 2x2 grid to a 4x6 wall while the clock drains. Chain is the deep one: you draw
            routes through a grid where every step must hold or climb by one. Rush and Ascent add a
            character to move — an endless runner whose course is identical for everyone that day,
            and a one-button wall-jump climb away from a rising void. Every run ends with a score
            you can hand to a friend as a link.
          </p>
          <p>
            Scores, streaks and settings are stored in your own browser, so ONE MORE forgets you
            the moment you clear your data. Add it to your home screen and it opens like an app.
            The leaderboard roster and the Crowd Pick crowd are simulated for this early version —
            they are labelled as such everywhere they appear.
          </p>
        </div>
      </section>
    </div>
  );
}
