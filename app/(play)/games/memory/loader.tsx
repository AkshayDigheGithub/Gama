"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { GameLoading } from "@/components/game/game-loading";

/**
 * The game engine is only fetched once someone actually opens the route, which
 * keeps it out of the homepage bundle entirely.
 */
const MemoryGame = dynamic(() => import("@/games/memory/memory-game"), {
  ssr: false,
  loading: () => <GameLoading label="Loading Memory" />,
});

export function GameLoader() {
  return (
    <Suspense fallback={<GameLoading label="Loading Memory" />}>
      <MemoryGame />
    </Suspense>
  );
}
