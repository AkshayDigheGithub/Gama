"use client";

import { useState } from "react";
import { Dice5, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateUsername, USERNAME_MAX, validateUsername } from "@/lib/player/username";
import { usePlayer } from "@/providers/player/player-context";
import { formatNumber } from "@/lib/utils";

/** Anonymous profile: rename, reroll, toggle haptics. No account anywhere. */
export function ProfileDialog() {
  const { username, hydrated, setUsername, settings, updateSettings, stats } = usePlayer();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(username);
  const [error, setError] = useState<string | null>(null);

  // Seeding the field when the dialog opens is a user event, not a sync target.
  const onOpenChange = (next: boolean) => {
    if (next) {
      setDraft(username);
      setError(null);
    }
    setOpen(next);
  };

  const save = () => {
    const result = validateUsername(draft);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setUsername(result.value);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-9 max-w-[9.5rem] items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface/70 px-3 text-xs font-semibold text-ink-dim transition-colors hover:text-ink"
        >
          <User className="size-3.5 shrink-0" />
          <span className="truncate">{hydrated ? username : "Player"}</span>
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>Your player name</DialogTitle>
        <DialogDescription className="mt-1">
          Anonymous and stored only in this browser. It appears on your challenge links.
        </DialogDescription>

        <div className="mt-5 flex flex-col gap-2">
          <Label htmlFor="username">Display name</Label>
          <div className="flex gap-2">
            <Input
              id="username"
              value={draft}
              maxLength={USERNAME_MAX}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                setDraft(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => event.key === "Enter" && save()}
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Random name"
              className="h-11 w-11 shrink-0"
              onClick={() => {
                setDraft(generateUsername());
                setError(null);
              }}
            >
              <Dice5 />
            </Button>
          </div>
          {error ? <p className="text-xs text-hot">{error}</p> : null}
          <p className="text-[0.6875rem] text-ink-faint">
            Letters, numbers, spaces, hyphens and underscores. Up to {USERNAME_MAX} characters.
          </p>
        </div>

        <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/60 px-4 py-3">
          <span className="text-sm font-semibold">Haptic feedback</span>
          <input
            type="checkbox"
            checked={settings.haptics}
            onChange={(event) => updateSettings({ haptics: event.target.checked })}
            className="size-5 accent-[var(--color-accent)]"
          />
        </label>

        <p className="mt-4 text-[0.6875rem] text-ink-faint">
          {formatNumber(stats.totalGames)} games played on this device.
        </p>

        <Button block size="lg" className="mt-4" onClick={save}>
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
