"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAME_LIST } from "@/lib/games";

/** Fast enough to blur, slow enough to read a name or two on the way past. */
const TICK_MS = 70;
const MIN_TICKS = 9;

/**
 * "Surprise me" — the arcade cabinet's attract-mode roll.
 *
 * Choosing between seven games is a decision, and a decision is friction.
 * The button spins through the roster and drops the player straight into
 * wherever it stops, which is a genuinely random game: the landing slot is
 * picked by the spin, not chosen in advance and dressed up as one.
 */
export function QuickPlay() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [slot, setSlot] = useState<number | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const roll = useCallback(() => {
    if (interval.current) return;

    // Reduced motion gets the outcome without the theatre.
    if (reduced) {
      router.push(GAME_LIST[Math.floor(Math.random() * GAME_LIST.length)].href);
      return;
    }

    let cursor = Math.floor(Math.random() * GAME_LIST.length);
    const ticks = MIN_TICKS + Math.floor(Math.random() * GAME_LIST.length);
    let done = 0;
    setSlot(cursor);

    interval.current = setInterval(() => {
      cursor = (cursor + 1) % GAME_LIST.length;
      done += 1;
      setSlot(cursor);
      if (done >= ticks) {
        stop();
        router.push(GAME_LIST[cursor].href);
      }
    }, TICK_MS);
  }, [reduced, router, stop]);

  const spinning = slot !== null;

  return (
    <Button
      variant="secondary"
      size="xl"
      onClick={roll}
      aria-label="Play a random game"
      className="relative overflow-hidden"
    >
      <Dices className={spinning ? "animate-spin" : undefined} />
      {/* The label is swapped in place so the button never changes width. */}
      <span className="min-w-[7.5rem] text-center tabular">
        {spinning ? GAME_LIST[slot].name : "Surprise me"}
      </span>
    </Button>
  );
}
