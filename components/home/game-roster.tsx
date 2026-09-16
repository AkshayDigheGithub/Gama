import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { GameIcon } from "@/components/game/game-icon";
import { GAME_LIST, type GameDefinition } from "@/lib/games";

const TONE: Record<GameDefinition["accent"], string> = {
  accent: "text-accent",
  cool: "text-cool",
  royal: "text-royal",
  amber: "text-amber",
  rose: "text-rose",
};

/**
 * The roster in words — the longest-form description of each game on the site,
 * and the copy search engines read.
 *
 * Every row is a link into the game, with hover and focus states done in CSS
 * alone: this block is the bottom of a long page and does not deserve a
 * kilobyte of JavaScript to make it feel alive.
 */
export function GameRoster() {
  return (
    <ul className="mt-5 grid gap-2 md:grid-cols-2">
      {GAME_LIST.map((game) => (
        <li key={game.id}>
          <Link
            href={game.href}
            className="group flex h-full gap-3.5 rounded-2xl border border-line/70 bg-surface/30 p-4 transition-colors hover:border-ink-faint/40 hover:bg-surface/70"
          >
            <span
              className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 ${TONE[game.accent]}`}
            >
              <GameIcon icon={game.icon} className="size-4.5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-bold text-ink">{game.name}</h3>
                <span className="inline-flex shrink-0 items-center gap-1 text-[0.6875rem] font-semibold text-ink-faint">
                  <Clock className="size-3" />
                  {game.durationLabel}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink-dim">{game.description}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-faint transition-colors group-hover:text-accent">
                Play {game.name}
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
