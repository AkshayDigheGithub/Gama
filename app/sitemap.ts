import type { MetadataRoute } from "next";
import { GAME_LIST } from "@/lib/games";
import { canonical } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: canonical("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: canonical("/games"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...GAME_LIST.map((game) => ({
      url: canonical(game.href),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: canonical("/daily"), lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: canonical("/leaderboard"), lastModified: now, changeFrequency: "daily", priority: 0.6 },
  ];
}
