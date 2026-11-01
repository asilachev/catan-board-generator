# App design

The design is the Pencil file `catan.pen` (the owner's pen.dev workspace): components, screens
01–12, element states (19), user journey and motion (13), strings (18) and the landing page (20–24).
This document records what the code follows and the decisions behind it.

## Principles

1. **A companion, not a digital game.** The table holds the real game; the app deals and says what
   to take from the box. No game art.
2. **Same code, same board.** A board is a pure function of the variant, the code and the token
   rules, on any device and in any language. Codes from v1 still work.
3. **Readable at arm's length.** Big tiles, numbers in Spectral, probability dots, a legend.
4. **Few taps, thumb reach.** One primary action per screen at the bottom; a floating tab bar.
5. **Offline and phone-first.** Installs as a PWA, works without a network, keeps the screen awake
   on the board, remembers everything on the device.

## Screens

| Design | Screen | Notes |
| --- | --- | --- |
| 01 · Board | `BoardScreen` | Header (logo, title, scenario picker, share), the board, code card, legend, Rebuild / New board |
| 02 · Setup | `SetupScreen` | Game tiles, scenario (radio list for the base game), board code with dice, token rules, language, Build board |
| 03 · Scenario | `ScenarioScreen` | Victory target, players, story; what's on the board; number tokens; harbors; extras; scenario rules; rulebooks |
| 04 · Seafarers board | `BoardScreen` | The board in a rounded sea panel with open sea around the islands; wide boards scroll, ± zoom 0.6×–2×, pinch, double tap fits |
| 05 · Splash | `Splash` | Only when launched from the home screen; 900 ms, then fades |
| 06 · Language | `LanguageScreen` | First launch (preselects the browser's language; Continue saves it) and from Setup (applies at once) |
| 07 · Setup (Seafarers) | `SetupScreen` | Scenario row opens the sheet; Players 3/4 where the rules print two layouts; Reveal fog in Scenario 3 |
| 08 · Scenario sheet | `ScenarioSheet` | Bottom sheet over a 40% scrim; also opens from the board's title |
| 09 · Generating | `BoardScreen` | The deal: progress pill, Rebuild disabled, New board shows "Dealing…" |
| 10 · Share sheet | `ShareSheet` | Code and link; Copy link, Send… (Web Share), Print, Save PNG |
| 11 · Toast | `Toaster` | Link copied (with Send), works offline, rule relaxed (with Again), new version (with Reload) |
| 12 · Install prompt | `InstallBanner` | From the second launch, while the browser offers to install (Android/desktop Chrome) or on iPhone Safari ("How" opens the steps); dismissing hides it for 30 days |

Navigation: three tabs (Board, Setup, Scenario). Setup changes apply at once and are remembered;
"Build board" goes to the board and deals. The first launch shows the language picker, then Setup,
or the board when the app was opened from a shared link.

## Determinism

- `buildBoard(variant, code, options)` in `src/engine/board.ts` is v1's algorithm step by step:
  seed = `hashSeed("<variant>#<code>")`, mulberry32, then terrain by pool, the desert and gold
  placement rules, numbers by hill climbing, letters, villages, harbors.
- `src/engine/v1.test.ts` loads `docs/v1/index.html`, runs its generator in a VM, and compares every
  variant across codes and token rules. A failing test means shared boards would change.
- New codes take a word from the current language's `codeWords` and four digits from
  `crypto.getRandomValues`; the engine never makes randomness of its own.

## Board codes

- A code is any text. It's normalised before hashing: trimmed, lower case, inner spaces as one
  hyphen, at most 40 characters. v1's codes are already in that form.
- Codes are words of each language (`anchor-4821`, `ancla-4821`, `якорь-4821`…), but any code builds
  the same board in every language.

## Share links

- `#s=<group>&p=<players>&c=<code>`, v1's format, so v1 links open the same boards.
- `&o=r1s0t1l0` is added only when the token rules differ from the defaults (r = 6 and 8 apart,
  s = equal numbers apart, t = spread terrain, l = letters), because they change the board.
- The address bar always shows the current board's link; a link opened in the app becomes the
  current board. `?lang=xx` (from the landing page) sets the language once and is removed.

## The deal

The storyboard (design 13): coast and empty sand slots (120 ms) → tiles dealt in a spiral from the
centre (scale 0.6 → 1 and fade, 220 ms each, 25 ms apart, tighter on big boards) → number tokens
drop in (−12 px, 160 ms, 15 ms apart) → harbors and piers. About 1.3 s for the base game.

- It plays whenever a board appears that hasn't been dealt on screen yet: a new code, a new
  scenario, new token rules, Build board, Rebuild (after a 180 ms nudge).
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

English, Español, Deutsch, Русский, Српски (Cyrillic only), in the design's order. The browser's
language on first launch, then the picked one. Russian text gets non-breaking spaces by
`typography.ts`. Translations of Spanish, German and Serbian should get a native speaker's review.

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
- **Analytics:** Vercel Web Analytics only in Vercel builds; anonymous page views, no cookies.

## Landing page

`site/` is a static page on GitHub Pages, in the app's five languages: `catan.silachev.com/`
(English), then `es/`, `de/`, `ru/` and `sr/`.

- **Sections** (design 20): hero, "you'll need the board game", stats, features, gallery, how it
  works, the deal, the math, Seafarers, scenarios, languages, install, FAQ, footer with the legal
  notice.
- **Each page shows the app in its own language.** `npm run site:shots` captures the app with
  Playwright and Google Chrome in every language: 11 phone screens and the 4 deal frames (the board
  alone, paused at 120, 420, 820 and 1100 ms: coast, spiral, tokens, harbors). They aren't committed; the Pages workflow captures them on every
  build.
- **One source of truth.** Scenario names, victory targets, button labels and sample codes come from
  the app's translations and engine; the page's own copy is in `site/locales/<lang>.json`.
  `npm run site` fails on a missing text, a leftover placeholder or a missing file.
- **Language:** a globe menu (details/summary, works without JavaScript) and chips in the footer;
  `hreflang` alternates; the English page sends a first visit to the browser's language unless a
  language was picked here. "Open the app" carries the page's language (`?lang=ru`).
- **Layout:** no sideways scrolling from 320 px up; the section links show from 1180 px.
