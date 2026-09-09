"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { identifyPlayer, trackEvent } from "@/lib/analytics";
import { toDateKey } from "@/lib/daily/date-key";
import {
  bestScoresSchema,
  playerSchema,
  settingsSchema,
  statsSchema,
  streakSchema,
} from "@/lib/player/schemas";
import type { RecordResultInput, RecordResultOutcome } from "@/lib/player/types";
import { generateUsername } from "@/lib/player/username";
import { liveStreak, playedToday } from "@/lib/streak/streak";
import { useHydrated, useLocalStorage } from "@/hooks/use-local-storage";
import { getPlayerStore } from "./local-player-provider";
import type { BestScores, Player, PlayerStats, Settings, StreakState } from "@/types";

interface PlayerContextValue {
  /** `null` until the browser has hydrated — never guess on the server. */
  player: Player | null;
  username: string;
  hydrated: boolean;
  stats: PlayerStats;
  bestScores: BestScores;
  streak: StreakState;
  currentStreak: number;
  playedToday: boolean;
  settings: Settings;
  setUsername: (name: string) => void;
  shuffleUsername: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  recordResult: (input: RecordResultInput) => RecordResultOutcome;
  resetProfile: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerContextProvider({ children }: { children: ReactNode }) {
  const store = getPlayerStore();
  const hydrated = useHydrated();

  const [player, setPlayer] = useLocalStorage(playerSchema);
  const [stats] = useLocalStorage(statsSchema);
  const [bestScores] = useLocalStorage(bestScoresSchema);
  const [streak] = useLocalStorage(streakSchema);
  const [settings, setSettings] = useLocalStorage(settingsSchema);

  // First visit: mint an anonymous identity. Never during SSR.
  useEffect(() => {
    const ensured = store.ensurePlayer();
    setPlayer(ensured);
    identifyPlayer(ensured.playerId);
  }, [store, setPlayer]);

  const todayKey = hydrated ? toDateKey() : "";

  const value = useMemo<PlayerContextValue>(
    () => ({
      player,
      username: player?.username ?? "Player",
      hydrated,
      stats,
      bestScores,
      streak,
      currentStreak: todayKey ? liveStreak(streak, todayKey) : 0,
      playedToday: todayKey ? playedToday(streak, todayKey) : false,
      settings,
      setUsername: (name: string) => {
        const next = store.setUsername(name);
        if (next) {
          setPlayer(next);
          trackEvent("username_changed", {});
        }
      },
      shuffleUsername: () => {
        const next = store.setUsername(generateUsername());
        if (next) setPlayer(next);
      },
      updateSettings: (patch: Partial<Settings>) => {
        setSettings((current) => ({ ...current, ...patch }));
      },
      recordResult: (input: RecordResultInput) => store.recordResult(input),
      resetProfile: () => {
        store.reset();
        setPlayer(store.ensurePlayer());
      },
    }),
    [player, hydrated, stats, bestScores, streak, settings, todayKey, store, setPlayer, setSettings],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside <PlayerContextProvider>");
  return context;
}
