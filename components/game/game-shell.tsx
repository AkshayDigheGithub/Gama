"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/hooks/use-scroll-lock";

interface GameShellProps {
  title: string;
  eyebrow?: ReactNode;
  hud?: ReactNode;
  children: ReactNode;
  /** Locks the viewport — enable while a run is actually in progress. */
  locked?: boolean;
  className?: string;
}

/**
 * Chrome shared by every game: a thin header, an optional HUD strip and a
 * full-height play area that fits inside the device's safe areas.
 */
export function GameShell({ title, eyebrow, hud, children, locked = false, className }: GameShellProps) {
  useScrollLock(locked);

  return (
    <div
      className={cn(
        "relative z-10 flex min-h-[100svh] flex-col pad-safe",
        locked && "h-[100svh] overflow-hidden play-lock",
      )}
      style={{ paddingTop: "max(0.75rem, var(--safe-t))", paddingBottom: "max(0.75rem, var(--safe-b))" }}
    >
      <header className="flex shrink-0 items-center gap-3 py-1">
        <Link
          href="/games"
          aria-label="Back to games"
          className="grid size-10 place-items-center rounded-xl border border-line bg-surface/70 text-ink-dim transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="truncate text-base font-bold tracking-tight">{title}</h1>
        </div>
        {hud}
      </header>

      <main className={cn("flex min-h-0 flex-1 flex-col", className)}>{children}</main>
    </div>
  );
}
