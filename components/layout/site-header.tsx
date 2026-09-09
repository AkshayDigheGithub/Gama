"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ProfileDialog } from "./profile-dialog";
import { StreakChip } from "./streak-chip";

const LINKS = [
  { href: "/games", label: "Games" },
  { href: "/daily", label: "Daily" },
  { href: "/leaderboard", label: "Ranks" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-40 border-b border-line/70 bg-canvas/90 backdrop-blur-xl"
      style={{ paddingTop: "var(--safe-t)" }}
    >
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 pad-safe">
        <Link href="/" className="mr-1 shrink-0 text-sm font-black tracking-[0.16em] uppercase">
          One<span className="text-accent">More</span>
        </Link>

        {/* Below `sm` these live in the bottom bar, where thumbs actually are. */}
        <nav className="hidden min-w-0 flex-1 items-center gap-1 sm:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-semibold transition-colors",
                  active ? "bg-surface-2 text-ink" : "text-ink-faint hover:text-ink-dim",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <StreakChip />
          <ProfileDialog />
        </div>
      </div>
    </header>
  );
}
