import type { Metadata } from "next";
import { GameSeo } from "@/components/game/game-seo";
import { GAMES } from "@/lib/games";
import { canonical } from "@/lib/site";
import { GameLoader } from "./loader";

const game = GAMES["salvo"];

export const metadata: Metadata = {
  title: `${game.name} — ${game.tagline}`,
  description: game.description,
  alternates: { canonical: canonical(game.href) },
  openGraph: {
    type: "website",
    title: `${game.name} — ONE MORE`,
    description: game.description,
    url: canonical(game.href),
  },
  twitter: {
    card: "summary_large_image",
    title: `${game.name} — ONE MORE`,
    description: game.description,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: `${game.name} — ONE MORE`,
  description: game.description,
  url: canonical(game.href),
  genre: "Casual",
  gamePlatform: "Web browser",
  playMode: "SinglePlayer",
  applicationCategory: "Game",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static, hand-built object — no user input reaches this string.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GameLoader />
      <GameSeo game={game} />
    </>
  );
}
