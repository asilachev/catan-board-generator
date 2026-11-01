# App design

The design is the Pencil file `catan.pen` (the owner's pen.dev workspace): components, screens
01–12, element states (19), user journey and motion (13), strings (18) and the landing page (20–24).
This document records what the code follows and the decisions behind it.

## Principles

1. **A companion, not a digital game.** The table holds the real game; the app deals and says what
   to take from the box. No game art.
2. **Same code, same board.** A board is a pure function of the variant, the code and the token
   rules, on any device and in any language. Links from v1 still open the boards they showed.
3. **Readable at arm's length.** Big tiles, numbers in Spectral, probability dots, a legend.
4. **Few taps, thumb reach.** One primary action per screen at the bottom; a floating tab bar.
5. **Offline and phone-first.** Installs as a PWA, works without a network, keeps the screen awake
   on the board, remembers everything on the device.

## Screens

| Design | Screen | Notes |
| --- | --- | --- |
| 01 · Board | `BoardScreen` | Header (logo, title, scenario picker, share), the board, code card (code, copy link), legend, New game / New board |
| 02 · Setup | `SetupScreen` | Game tiles, scenario (radio list for the base game), board code with dice, token rules, language, Build board |
| 03 · Scenario | `ScenarioScreen` | Victory target, players, story; what's on the board; number tokens; harbors; extras; scenario rules; rulebooks |
| 04 · Seafarers board | `BoardScreen` | The board in a rounded sea panel with open sea around the islands; wide boards scroll, ± zoom 0.6×–2×, pinch, double tap fits |
| 05 · Splash | `Splash` | Only when launched from the home screen; 900 ms, then fades |
| 06 · Language | `LanguageMenu` | A dropdown at the top of Board (next to Share) and Setup: the current code, then the five languages in their own names (#21). A pick applies at once and is remembered. There is no first-launch picker: the app starts in the browser's language |
| 07 · Setup (Seafarers) | `SetupScreen` | Scenario row opens the sheet; Players 3/4 where the rules print two layouts; Reveal fog in Scenario 3 |
| 08 · Scenario sheet | `ScenarioSheet` | Bottom sheet over a 40% scrim. From the board's title it also switches the game (Base game / Seafarers on top), so any board is two taps away |
| 09 · Generating | `BoardScreen` | The deal: progress pill, New board shows "Dealing…" |
| 10 · Share sheet | `ShareSheet` | Code and link; Copy link, Send… (Web Share), Print, Save PNG |
| 11 · Toast | `Toaster` | Link copied (with Send), works offline, rule relaxed (with Again), new version (with Reload) |
| 12 · Install prompt | `InstallBanner` | From the second launch, while the browser offers to install (Android/desktop Chrome) or on iPhone Safari ("How" opens the steps); dismissing hides it for 30 days |

Navigation: three tabs (Board, Setup, Scenario). Setup changes apply at once and are remembered;
"Build board" goes to the board and deals. Every launch opens on the board: the saved one, a shared
link's, or on the first launch the base game for 3–4 players with a fresh code, in the browser's
language. Setup opens only when someone asks for it: its tab, or New game on the board, which ends
this game with a fresh code and opens Setup for the next one. New board deals another board of the
same scenario. The code card shows the code and copies the link, nothing else (#17).

## Determinism

- `buildBoard(variant, code, options, version)` in `src/engine/board.ts` seeds mulberry32 with
  `hashSeed("<variant>#<code>")`, then deals by the board's version:
  - **Version 2**, every new board: Seafarers scenarios are dealt on the rulebook's printed maps
    (`src/engine/printed.ts`, data in `maps.ts`). Terrain, then numbers, trade places within the
    groups the scenario allows, numbers by hill climbing, then harbor types (docs/rules.md →
    Printed maps). The base game deals as in version 1.
  - **Version 1**, links without `v=`: v1's algorithm step by step: terrain by pool, the desert and
    gold placement rules, numbers by hill climbing, letters, villages, harbors.
- `src/engine/v1.test.ts` loads `docs/v1/index.html`, runs its generator in a VM, and compares every
  variant across codes and token rules with version 1. A failing test means shared boards would
  change. Changing how version 2 deals changes every board shared since; it needs a version 3.
- New codes take a word from the current language's `codeWords` and four digits from
  `crypto.getRandomValues`; the engine never makes randomness of its own.

## Board codes

- A code is any text, hashed the way v1 hashed it: trimmed, and otherwise exactly as typed. Case
  and inner spaces count (`Anchor` and `anchor` are different boards), so every code and link v1
  made still builds the same board. The input turns off auto-capitalisation and takes up to 40
  characters; a link may carry up to 200 (v1 had no limit).
- Codes are words of each language (`anchor-4821`, `ancla-4821`, `якорь-4821`…), but any code builds
  the same board in every language.

## Share links

- `#s=<group>&p=<players>&c=<code>&v=2`. Without `v=` it is v1's format, and v1's links open the
  boards they showed then (version 1, docs/rules.md → R2).
- `&o=r1s0t1l0` is added only when the options differ from the defaults (r = 6 and 8 apart,
  s = equal numbers apart, t = spread terrain, l = letters), because they change the board. `p1`
  (as printed in the rulebook) follows only where it changes the board: a version 2 board of a
  scenario that offers it. So every board has exactly one link.
- A board keeps its version while only the token rules change, so a v1 link's board stays itself;
  a new code, scenario, player count or As printed makes a version 2 board. Settings saved before
  boards had versions load as v1 boards, and a `v=` newer than the app knows reads as the newest it
  knows (the update toast offers the rest).
- The address bar always shows the current board's link; a link opened in the app becomes the
  current board. `?lang=xx` (from the landing page) sets the language once and is removed.

## The deal

The storyboard (design 13): coast and empty sand slots (80 ms) → tiles dealt in a spiral from the
centre (scale 0.6 → 1 and fade, 220 ms each, 25 ms apart, tighter on big boards) → number tokens
drop in as the last tiles land (−12 px, 160 ms, up to 15 ms apart) → harbors and piers. About
1.1 s for the base game.

- It plays whenever a board appears that hasn't been dealt on screen yet: a new code, a new
  scenario, new token rules, As printed, Build board (which replays it for the same board).
- The pieces animate in CSS. An invisible clock animation runs for the whole deal; the progress pill
  reads its time, so a paused animation (the landing page's frames) shows the matching step.
- Reduced motion: every animation is one instant frame, so the board simply appears.

## Motion

| Trigger | Motion |
| --- | --- |
| Tab switch | Content rises 8 px and fades in, 200 ms |
| Push (language from Setup) | Slides 24 px from the right, 240 ms |
| Bottom sheet | Up 280 ms over a fading scrim; down 180 ms; drag the top down to close |
| Game switch | The accent morphs brick red ↔ sea blue in 300 ms (`@property --accent`); the tile's check pops |
| Toggle, radio | 160 ms |
| Toast | Rises 16 px, holds 2.4 s (4 s for warnings), fades out |

## Visual language

- **Two surfaces.** The sea ("the table") for the board; parchment ("the rulebook") for setup,
  scenario and language. `data-surface` on `<html>` switches the page behind them and the theme
  colour.
- **Accent by game.** Brick red `#b8432b` for the base game, sea blue `#1b6fae` for Seafarers
  (`data-game` on `<html>`).
- **Tokens** come from the Pencil variables (`src/ui/styles/global.css`); terrain colours are the
  design's `t-*` colours.
- **Fonts.** Alegreya SC 800 (headings, buttons), PT Sans 400/700 (text), Spectral 800 (numerals),
  PT Mono (codes). Latin and Cyrillic subsets, bundled, `font-display: block`.
- **Board.** Pointy-top hexes of circumradius 32 (the design's 55 × 64 tile), drawn at 93% so the
  sand frame shows between them; a darker bottom edge; Lucide glyphs; cream tokens with pips; 6 and
  8 in red; harbors on the coast with two piers to the edge's corners.
- **Touch.** Tap targets at least 44 px; no double-tap zoom; the board doesn't select text.

## Languages

English, Español, Deutsch, Русский, Српски (Cyrillic only), in the design's order. The app follows
the browser: the first of its preferred languages the app speaks (Serbian in either script is
Cyrillic), English otherwise. A language picked in the menu at the top of Board and Setup, or
`?lang=` from the landing page, is remembered and wins from then on. Russian text gets non-breaking
spaces by `typography.ts`. Translations of Spanish, German and Serbian should get a native
speaker's review.

## Tech and hosting

- **Stack:** Vite, React and TypeScript, built to static files in `dist/`. There is no server code.
- **Hosting:** the same `dist/`, with the same caching and headers, two ways:
  - **Vercel** (`vercel.ts`): the owner's copy at `app.catan.silachev.com`. Git integration deploys
    `master` and previews pull requests.
  - **Docker** (`docker/nginx.conf`, unprivileged nginx on 8080): CI publishes
    `ghcr.io/asilachev/catan-board-generator`.
  - A year's cache for hashed `/assets/`, `no-cache` for everything else; unknown paths fall back to
    `index.html`; security headers and `X-Robots-Tag: noindex` (the landing page is the public
    face). The CSP allows `blob:` and `data:` images for Save PNG.
  - HTTPS is required: PWA install, offline mode, the clipboard and the wake lock need it.
- **Updates:** the service worker is in prompt mode, so a new version waits until the player taps
  Reload on "A new version is ready" (nothing is lost: the board lives in the address and in
  storage). The app looks for one when it loads, when it comes back to the foreground (at most
  every 5 minutes; an installed app often resumes without loading) and hourly while it stays open.
  The dev server has no service worker, so the toast never shows there.
- **Analytics:** Vercel Web Analytics only in Vercel builds; anonymous page views, no cookies.

## Landing page

`site/` is a static page on GitHub Pages, in the app's five languages: `catan.silachev.com/`
(English), then `es/`, `de/`, `ru/` and `sr/`.

- **Sections** (design 20): hero, "you'll need the board game", stats, features, gallery, how it
  works, the deal, the math, Seafarers, scenarios, languages, install, FAQ, footer with the legal
  notice.
- **Each page shows the app in its own language.** `npm run site:shots` captures the app with
  Playwright and Google Chrome in every language: 11 phone screens and the 4 deal frames (the board
  alone, paused at 80, 380, 760 and 1000 ms: coast, spiral, tokens, harbors). They aren't committed; the Pages workflow captures them on every
  build.
- **One source of truth.** Scenario names, victory targets, button labels and sample codes come from
  the app's translations and engine; the page's own copy is in `site/locales/<lang>.json`.
  `npm run site` fails on a missing text, a leftover placeholder or a missing file.
- **Language:** a globe menu (details/summary, works without JavaScript) and chips in the footer;
  `hreflang` alternates; the English page sends a first visit to the browser's language unless a
  language was picked here. "Open the app" carries the page's language (`?lang=ru`).
- **Layout:** no sideways scrolling from 320 px up; the section links show from 1180 px.
- **v1's links keep working.** v1 lived at `catan.silachev.com` and shared links like
  `catan.silachev.com/#s=s4&p=4&c=anchor-4821`. Every page hands a link with a board in its hash
  (`s` and `c`) to the app before anything renders, the hash unchanged; the app reads v1's format.
