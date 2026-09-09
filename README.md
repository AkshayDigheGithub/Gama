# ONE MORE

**Play. Beat. One More.**

A fast browser-game platform built around one loop:

> open → play instantly → get a score → see the result → play ONE MORE → share

Three games, a daily challenge, streaks and shareable head-to-head links —
with **no database, no login, no signup and no backend state**. Everything the
player accumulates lives in their own browser. Deploy it to Vercel and it works.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Development server                              |
| `npm run build`     | Production build                                |
| `npm start`         | Serve the production build                      |
| `npm run lint`      | ESLint                                          |
| `npm run typecheck` | `tsc --noEmit`                                  |
| `npm run icons`     | Regenerate the PWA/favicon set from `scripts/`  |

### Deploying to Vercel

Import the repository and deploy — there is nothing to configure. No database,
no environment variables, no external services.

One optional variable, once a custom domain exists:

```
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

It drives canonical URLs, the sitemap, `robots.txt`, Open Graph tags and the
absolute URLs inside share links. Without it, the app falls back to Vercel's
own deployment URL, so previews still produce working links.

---

## The games

| Game           | Length | Scoring                                                            |
| -------------- | ------ | ------------------------------------------------------------------ |
| **Reaction**   | ~30s   | Five rounds. Four points per millisecond saved against a 600 ms floor. Tap early and the round is forfeited. |
| **Crowd Pick** | ~20s   | One number, 1–100. Your uniqueness against a simulated crowd, ×100. |
| **Memory**     | ~60s   | 2×2 → 3×3 → 4×4 and up. Clearing a level banks time and points; each miss costs two seconds. The run ends when the clock does. |

Game rules live in `games/<game>/` as plain TypeScript with no React imports
(`engine.ts`, `crowd.ts`, `scoring.ts`). The React component in the same folder
drives them. That split is what makes the rules testable and portable.

---

## Architecture: built to have a backend added

There is no database *now*, but every place one would eventually plug in is
already an interface with a local implementation behind it. Version 2 writes a
new class and registers it; no game screen changes.

| Seam                 | Interface                    | Today                       | Later                      |
| -------------------- | ---------------------------- | --------------------------- | -------------------------- |
| Leaderboard          | `lib/leaderboard/types.ts`   | `LocalLeaderboardProvider`  | `ApiLeaderboardProvider`   |
| Player / identity    | `lib/player/types.ts`        | `LocalPlayerStore`          | Account-backed store       |
| Analytics            | `lib/analytics/types.ts`     | `ConsoleAnalyticsProvider`  | PostHog, GA, anything      |
| Monetization         | `components/monetization/`   | Inert placeholders          | Real ad / premium adapters |

```ts
// providers/leaderboard/index.ts — the only place this decision is made.
export function getLeaderboardProvider(): LeaderboardProvider {
  instance ??= new LocalLeaderboardProvider();
  return instance;
}
```

Every leaderboard method is already `async`, so swapping in a networked
provider does not turn synchronous UI into asynchronous UI after the fact.

### Where state lives

`localStorage`, behind a versioned, observable wrapper (`lib/storage/`):

| Key                 | Contents                                    |
| ------------------- | ------------------------------------------- |
| `oneMorePlayer`     | `{ playerId, username, createdAt }`         |
| `oneMoreStats`      | Games played and totals, per game           |
| `oneMoreBestScores` | Personal best per game                      |
| `oneMoreStreak`     | `lastPlayedDate`, current and longest streak |
| `oneMoreSettings`   | Haptics and other preferences               |
| `oneMoreDaily`      | Daily challenge results (last 30 days)      |

Values are wrapped in a `{ v, d }` envelope so a future build can migrate old
shapes, and every read is validated and clamped — corrupt or hand-edited JSON
falls back to defaults instead of crashing. `useLocalStorage()` reads through
`useSyncExternalStore`, so server rendering sees the fallback, hydration
matches, and writes broadcast across components and browser tabs.

---

## What is simulated, and how it says so

Three surfaces are generated rather than real. Each one is labelled in the UI:

- **The leaderboard roster** — a deterministic set of characters seeded from
  today's date, so ranks are stable within a day and refresh daily. Marked
  *Demo board* everywhere it appears.
- **The Crowd Pick crowd** — a model of how people actually pick numbers (the
  pull toward numbers ending in 7, avoidance of round numbers and edges, the
  bulge in the middle third). Labelled as simulated, not real players.
- **Performance percentiles** — a fixed benchmark curve per game, stated as an
  estimate rather than a live population.

Local scores are not verified and the app says so. This is deliberate: the
alternative is implying a global competition that does not exist yet.

---

## Challenges and sharing

A challenge is carried entirely in the URL — there is nothing to store:

```
/challenge?game=reaction&score=8420&name=SwiftTiger&t=<checksum>
```

Opening it shows the challenger's score and an **Accept challenge** button that
starts the same game with the target attached. The result screen then compares
the two runs directly.

Incoming parameters are treated as hostile: the game id must be known, the
score must be a plain integer (capped at 1,000,000), and the name is stripped
to `[A-Za-z0-9 _-]` and length-limited. The `t` checksum catches edited or
truncated links — it is *not* security, and the challenge page says as much
when it fails.

Sharing uses the Web Share API where available and falls back to the clipboard.

---

## Daily challenge and streaks

The daily challenge is derived from the calendar date: the date seeds the game
choice and the target score, so the same device sees the same challenge all day
and tomorrow brings a new one — no server, no cron.

Streaks are credited **once per calendar day, only on a completed game**.
Reloading, reopening a game or retrying does nothing. A stored date in the
future is refused, and `lastCreditedAt` is monotonic, so winding the device
clock backwards will not manufacture a streak.

---

## Mobile, motion and performance

- Bottom navigation on phones, header navigation from `sm` up.
- Safe-area insets everywhere; the viewport is locked during active play so a
  fast tap never scrolls the page instead of registering.
- Haptics via `navigator.vibrate` when the player has them enabled.
- Every animation respects `prefers-reduced-motion` — the score jumps straight
  to its final value rather than playing a slower count-up.
- Game engines are `dynamic()`-imported with `ssr: false`, so nothing from a
  game reaches the homepage bundle.
- Framer Motion ships through `LazyMotion` + `m` components rather than the
  full `motion` bundle.
- Every route is statically prerendered except `/challenge`, which reads query
  parameters by definition.

## PWA

Web app manifest, generated icon set (including maskable), theme colour and
`standalone` display. A small service worker (`public/sw.js`) makes the app
installable and serves a real `/offline` page when a navigation fails; it is
network-first for documents, so a deploy is never masked by a stale cache.

---

## Project structure

```
app/
  (site)/        home, games index, leaderboard, daily, challenge, offline
  (play)/        the three game routes — no header or footer, full-bleed
components/      ui/ (shadcn-style), game/, leaderboard/, challenge/, layout/, monetization/
games/           reaction/, crowd-pick/, memory/ — rules first, React second
lib/             storage/, analytics/, leaderboard/, challenge/, player/, scoring/, daily/, streak/
providers/       concrete implementations + React context for each seam
hooks/           useLocalStorage, useShare, useRunRecorder, useHaptics, useScrollLock
```

---

## Deliberately not here

No database, no authentication, no payments, no real multiplayer, no admin
panel and no ads. The MVP is aimed at exactly two things: retention and
sharing. Everything else is a seam waiting for evidence that it is needed.
