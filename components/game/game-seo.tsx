import Link from "next/link";
import type { GameDefinition } from "@/lib/games";
import { GAME_LIST } from "@/lib/games";

/**
 * Crawlable copy for a game route.
 *
 * It sits below the play surface rather than being hidden, so search engines
 * and screen readers get real content while the game itself stays uncluttered.
 */
export function GameSeo({ game }: { game: GameDefinition }) {
  const others = GAME_LIST.filter((other) => other.id !== game.id);

  return (
    <section className="mx-auto w-full max-w-3xl pad-safe pb-16 pt-4">
      <div className="border-t border-line/70 pt-10">
        <h2 className="text-2xl font-bold tracking-tight">{game.name} — how it works</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-dim">{game.description}</p>

        <h3 className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">
          How to play
        </h3>
        <ol className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-ink-dim">
          {game.howToPlay.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-surface-2 text-[0.625rem] font-bold text-ink-faint">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <p className="mt-8 text-sm leading-relaxed text-ink-dim">
          A run takes about {game.durationLabel.toLowerCase()}. There is no account, no download and
          no database — your scores and streak are kept in this browser only, and the leaderboard
          roster is simulated for this early version.
        </p>

        <h3 className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">
          More games
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {others.map((other) => (
            <Link
              key={other.id}
              href={other.href}
              className="rounded-[var(--radius-pill)] border border-line bg-surface/60 px-4 py-2 text-sm font-semibold text-ink-dim transition-colors hover:border-ink-faint/50 hover:text-ink"
            >
              {other.name}
            </Link>
          ))}
          <Link
            href="/leaderboard"
            className="rounded-[var(--radius-pill)] border border-line bg-surface/60 px-4 py-2 text-sm font-semibold text-ink-dim transition-colors hover:border-ink-faint/50 hover:text-ink"
          >
            Leaderboard
          </Link>
        </div>
      </div>
    </section>
  );
}
