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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  alternateName: "One More Game",
  url: canonical("/"),
  description: SITE.description,
  inLanguage: "en",
};


/**
 * Real questions with honest answers — including the ones about simulated
 * leaderboards, which are worth stating plainly rather than burying.
 */
const FAQ = [
  {
    question: "Do I need an account to play?",
    answer:
      "No. There is no sign-up, no email and no login anywhere on the site. Open a game and it starts. A random display name is generated for you on your first visit, and you can change it whenever you like.",
  },
  {
    question: "Is it free?",
    answer:
      "Yes, entirely. There are no ads, no paid unlocks and no premium tier. Every game, the daily challenge and the leaderboard are available to everyone.",
  },
  {
    question: "Does it work on a phone?",
    answer:
      "Every game is built for touch first and tested at phone size. You can also add ONE MORE to your home screen, where it opens full screen like an installed app.",
  },
  {
    question: "Where are my scores saved?",
    answer:
      "In your browser, using local storage. Nothing is sent to a server, which means your scores follow the device rather than you, and clearing your browser data erases them.",
  },
  {
    question: "Are the leaderboard players real?",
    answer:
      "Not yet. The roster is generated from the date, so the board is stable through the day and refreshes daily, and it is labelled a demo board everywhere it appears. Your own row comes from scores stored in your browser and is not verified.",
  },
  {
    question: "What is the daily challenge?",
    answer:
      "One game and one target score, both derived from the calendar date, so everyone gets the same challenge on the same day. Finishing any game keeps your daily streak alive; reloading the page does not.",
  },
  {
    question: "How do challenge links work?",
    answer:
      "When a run ends you can turn your score into a link. Whoever opens it plays the same game with your score as the target and finds out immediately whether they beat it. No account is needed at either end.",
  },
  {
    question: "How long does a game take?",
    answer:
      "Between twenty and sixty seconds. Crowd Pick is a single decision, Reaction is five rounds, and the rest run for about a minute or until you make one mistake too many.",
  },
] as const;

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-5xl pad-safe">
      <script
        type="application/ld+json"
        // Static, hand-built objects — no user input reaches these strings.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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
          Seven games. Under a minute each. Your scores stay in this browser.
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
      <section className="border-t border-line/70 pt-10">
        <h2 className="text-2xl font-bold tracking-tight">Fast browser games, no account needed</h2>
        <div className="mt-4 grid gap-6 text-sm leading-relaxed text-ink-dim md:grid-cols-3">
          <p>
            ONE MORE is built around a single loop: open a game, play it in under a minute, see
            exactly how you did, and go again. There is nothing to install, nothing to sign up for
            and no email to hand over. Tap a game and you are playing, usually within two seconds
            of the page finishing loading.
          </p>
          <p>
            The seven games deliberately test different things. Some are pure reflex, some are
            pattern and memory, one is a bet on what everyone else will do, and two put a character
            on screen to move. Whichever you pick, a run is short, the score is a single number,
            and the button to try again is the largest thing on the result screen.
          </p>
          <p>
            Scores, streaks and settings are stored in your own browser, so ONE MORE forgets you
            the moment you clear your data. Add it to your home screen and it opens like an app.
            The leaderboard roster and the Crowd Pick crowd are simulated for this early version —
            they are labelled as such everywhere they appear.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------- the games, in words -- */}
      <section aria-labelledby="the-games" className="border-t border-line/70 pt-10">
        <h2 id="the-games" className="text-2xl font-bold tracking-tight">
          The seven games
        </h2>
        <dl className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-2">
          {GAME_LIST.map((game) => (
            <div key={game.id}>
              <dt className="text-sm font-bold text-ink">
                {game.name}{" "}
                <span className="font-normal text-ink-faint">· {game.durationLabel}</span>
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-dim">{game.description}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------------- faq -- */}
      <section aria-labelledby="faq" className="border-t border-line/70 pb-4 pt-10">
        <h2 id="faq" className="text-2xl font-bold tracking-tight">
          Common questions
        </h2>
        <dl className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-2">
          {FAQ.map((item) => (
            <div key={item.question}>
              <dt className="text-sm font-bold text-ink">{item.question}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-dim">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
