"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { GAME_LIST } from "@/lib/games";

/** Single-key destinations. Digits map onto the roster in card order. */
const PLACES: ReadonlyArray<{ key: string; href: string; label: string }> = [
  { key: "g", href: "/games", label: "All games" },
  { key: "d", href: "/daily", label: "Daily challenge" },
  { key: "l", href: "/leaderboard", label: "Leaderboard" },
];

/**
 * Keyboard launcher for the home page.
 *
 * Arcades have buttons, and a desktop visitor has 104 of them. Pressing 1–7
 * launches a game, G/D/L jump around the site, R rolls a random game and ? or
 * / opens the cheat sheet. Mounted only by the home page, so it never competes
 * with typing inside a game.
 *
 * Keys are ignored while a field has focus or a modifier is held, so browser
 * and OS shortcuts keep working and nobody gets teleported mid-sentence.
 */
export function ShortcutLauncher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const random = useCallback(
    () => GAME_LIST[Math.floor(Math.random() * GAME_LIST.length)].href,
    [],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;

      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (event.key === "?" || event.key === "/") {
        event.preventDefault();
        setOpen((previous) => !previous);
        return;
      }

      const slot = Number(event.key);
      if (Number.isInteger(slot) && slot >= 1 && slot <= GAME_LIST.length) {
        event.preventDefault();
        router.push(GAME_LIST[slot - 1].href);
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        router.push(random());
        return;
      }
      const place = PLACES.find((entry) => entry.key === key);
      if (place) {
        event.preventDefault();
        router.push(place.href);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [random, router]);

  return (
    <>
      {/* Hidden where there is no keyboard to press. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface/60 px-3 py-1.5 text-xs font-semibold text-ink-faint transition-colors hover:border-ink-faint/50 hover:text-ink-dim sm:inline-flex"
      >
        <Keyboard className="size-3.5" />
        Press
        <Kbd>1</Kbd>–<Kbd>7</Kbd>
        to launch, <Kbd>?</Kbd> for shortcuts
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription className="mt-1">
            Available anywhere on the home page.
          </DialogDescription>

          <dl className="mt-4 flex flex-col gap-1.5">
            {GAME_LIST.map((game, index) => (
              <Row key={game.id} keys={[String(index + 1)]} label={game.name} />
            ))}
            <Row keys={["R"]} label="Random game" />
            {PLACES.map((place) => (
              <Row key={place.key} keys={[place.key.toUpperCase()]} label={place.label} />
            ))}
            <Row keys={["?"]} label="This list" />
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-2/40 px-3 py-2">
      <dt className="text-sm text-ink-dim">{label}</dt>
      <dd className="flex gap-1">
        {keys.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </dd>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="grid h-5 min-w-5 place-items-center rounded border border-line bg-surface-2 px-1 font-mono text-[0.625rem] font-bold text-ink">
      {children}
    </kbd>
  );
}
