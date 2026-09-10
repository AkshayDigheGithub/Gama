import type { Metadata } from "next";
import { GameCard } from "@/components/game/game-card";
import { GAME_LIST } from "@/lib/games";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "All Games — Seven Free Browser Games",
  description:
    "Seven quick browser games you can play right now: Reaction, Crowd Pick, Memory, Chain, Rush, Ascent and Salvo. No account, no download, under a minute each.",
  alternates: { canonical: canonical("/games") },
  openGraph: {
    title: "All games — ONE MORE",
    description: "Reaction, Crowd Pick, Memory, Chain, Rush, Ascent and Salvo. Under a minute each. No account needed.",
    url: canonical("/games"),
  },
};

export default function GamesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl pad-safe py-10">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Games</h1>
        <p className="mt-3 text-base leading-relaxed text-ink-dim">
          Seven ways to lose a minute — some you can pick up in a second, some with a ceiling you
          will not reach today. Each ends with a score, a personal best and a link you
          can throw at a friend.
        </p>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_LIST.map((game, index) => (
          <GameCard key={game.id} game={game} index={index} />
        ))}
      </div>

      <section className="mt-14 border-t border-line/70 pt-10">
        <h2 className="text-2xl font-bold tracking-tight">What you get in every game</h2>
        <div className="mt-4 grid gap-6 text-sm leading-relaxed text-ink-dim md:grid-cols-3">
          <p>
            <strong className="text-ink">Instant play.</strong> Tap a card and the game starts. No
            sign-up screen, no email, no permissions prompt, no tutorial you have to skip.
          </p>
          <p>
            <strong className="text-ink">A real score.</strong> Every run ends with a number, your
            personal best and an estimated performance band, so you always know whether that was a
            good run.
          </p>
          <p>
            <strong className="text-ink">A rematch link.</strong> Send your score as a URL. Whoever
            opens it plays the same game and finds out immediately whether they beat you.
          </p>
        </div>
      </section>
    </div>
  );
}
