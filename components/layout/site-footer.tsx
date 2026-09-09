import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      className="relative z-10 mt-16 border-t border-line/70"
      style={{ paddingBottom: "max(1.5rem, var(--safe-b))" }}
    >
      <div className="mx-auto w-full max-w-5xl pad-safe py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-black uppercase tracking-[0.16em]">
              One<span className="text-accent">More</span>
            </div>
            <p className="mt-1 text-xs text-ink-faint">Play. Beat. One More.</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-faint">
            <Link href="/games" className="transition-colors hover:text-ink-dim">
              Games
            </Link>
            <Link href="/daily" className="transition-colors hover:text-ink-dim">
              Daily challenge
            </Link>
            <Link href="/leaderboard" className="transition-colors hover:text-ink-dim">
              Leaderboard
            </Link>
          </nav>
        </div>
        <p className="mt-6 max-w-2xl text-[0.6875rem] leading-relaxed text-ink-faint">
          No account, no database. Scores, streaks and settings live in this browser only. The
          leaderboard roster and the Crowd Pick crowd are simulated for this MVP — they are not real
          players, and local scores are not verified.
        </p>
      </div>
    </footer>
  );
}
