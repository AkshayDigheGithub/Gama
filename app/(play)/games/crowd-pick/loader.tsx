"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { GameLoading } from "@/components/game/game-loading";

/**
 * The game engine is only fetched once someone actually opens the route, which
 * keeps it out of the homepage bundle entirely.
 */
const CrowdPickGame = dynamic(() => import("@/games/crowd-pick/crowd-pick-game"), {
  ssr: false,
  loading: () => <GameLoading label="Loading Crowd Pick" />,
});

export function GameLoader() {
  return (
    <Suspense fallback={<GameLoading label="Loading Crowd Pick" />}>
      <CrowdPickGame />
    </Suspense>
  );
}
