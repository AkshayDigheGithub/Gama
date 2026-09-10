"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { GameLoading } from "@/components/game/game-loading";

/**
 * The game engine is only fetched once someone actually opens the route, which
 * keeps it out of the homepage bundle entirely.
 */
const RushGame = dynamic(() => import("@/games/rush/rush-game"), {
  ssr: false,
  loading: () => <GameLoading label="Loading Rush" />,
});

export function GameLoader() {
  return (
    <Suspense fallback={<GameLoading label="Loading Rush" />}>
      <RushGame />
    </Suspense>
  );
}
