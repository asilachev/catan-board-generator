# AGENTS.md

Guidance for AI coding agents, and for humans, working in this repository.

## What this project is

A phone-first PWA that deals fair, shareable boards for **CATAN**: the base game for 3–4 and 5–6
players and all nine **Seafarers** scenarios.

The app is a **companion**:

- the table holds the real game: tiles, tokens, harbors, pieces;
- the app replaces shuffling and dealing: it says which tile and which number go where, which
  harbors go on the frame, and what to take from the box for the scenario.

The public face is the landing page at <https://catan.silachev.com/> (GitHub Pages, `site/`); the
owner's copy of the app runs at <https://app.catan.silachev.com/> (Vercel).

## Read these first

| Doc | Contains |
| --- | --- |
| [`docs/rules.md`](docs/rules.md) | Every board's tiles, tokens, harbors and victory target with its rulebook source, and the **rulings table** (how the app fills gaps in the rules) |
| [`docs/design.md`](docs/design.md) | Screens, navigation, determinism and board codes, share links, the deal animation, visual language, languages, PWA, hosting, landing page |
| [`docs/v1/`](docs/v1/) | The original single-file app. Its generator is the reference: `src/engine/v1.test.ts` runs it next to the port |
| [`docs/reference/`](docs/reference/) | The rulebook PDFs the data was checked against. They are gitignored; `npm run reference` is meant to download them from a `reference-docs` release (where they live is #6) |
| Pencil file `catan.pen` | The design: components, screens 01–12, states, user journey and motion, strings, landing page. It lives in the owner's pen.dev workspace |

When behaviour depends on a rule, cite the doc section in code comments or tests. If the code needs a
rule the docs don't cover, or contradicts them, **stop and raise it in the issue**. Don't guess. Any
change to a rule or ruling updates the docs in the same PR.

## Ground rules

- **Companion, not a digital game.** No game art, no CATAN logo, no card or tile scans. Icons are
  [Lucide](https://lucide.dev) plus our own drawings (the cactus, the logo, the tokens).
- **Same code, same board.** A board is a pure function of `(variant, code, options, version)`.
  - Links made by any version keep building the same board, v1's included: a link without `v=` is
    dealt as v1 dealt it, and `src/engine/v1.test.ts` checks that against `docs/v1/index.html`.
    New boards are version 2: Seafarers on the rulebook's printed maps (`src/engine/maps.ts`).
  - The order of random draws, the key order of the scenario tables and the printed maps are part
    of that contract. Changing them changes every shared board: it needs an issue and a new
    version (`BOARD_VERSION`, the link's `v=`) first.
- **Engine purity.** `src/engine/` is plain TypeScript: no React, DOM, `Date.now()` or
  `Math.random()`. All randomness comes from the seeded RNG; new codes get their randomness from the
  UI (`crypto.getRandomValues`).
- **Faithful to the rulebooks.** Tile, token and harbor counts and victory targets come from the
  rulebooks (`docs/rules.md` lists the pages). Each gap is a ruling in `docs/rules.md`. Don't
  silently change a default.
- **Fonts.** Alegreya SC for headings, PT Sans for text, Spectral for numerals (Alegreya has old-style
  figures), PT Mono for codes. All OFL, bundled from `@fontsource`. Don't add another face.
- **Rulebooks are not ours.** Never commit the PDFs. The app points to CATAN GmbH's official rules
  page and names the section to read, not a page of one edition.
- **Credit and disclaim.** Wherever credits appear: CATAN® and CATAN – Seafarers are trademarks of
  CATAN GmbH; this is an unofficial fan project, not affiliated with or endorsed by CATAN GmbH or its
  publishers, and you need your own copy of the game.
- **Languages.** English, Español, Deutsch, Русский and Српски. **Serbian is Cyrillic only.**
- **Visibility.** The landing page is public; the app sends `noindex`, because the landing page is
  its public face. The repository is public under the MIT License (`LICENSE`), like
  splendor-marvel-automa: no secrets, no rulebook scans, nothing that isn't ours to share.
- **No secrets.** There is no backend. Don't add analytics, accounts or network calls without an
  issue that approves them.
  - The one approved analytics is Vercel Web Analytics: anonymous, cookieless page views, only in
    builds made on Vercel (`__VERCEL_ANALYTICS__` in `vite.config.ts`). Other builds compile it out.

## Commands

You need Node 22 or later (see `.nvmrc`). Use npm.

| Command | What it does |
| --- | --- |
| `npm ci` | Install dependencies exactly as locked |
| `npm run dev` | Start the dev server (add `-- --host` to open it on a phone on the same Wi-Fi) |
| `npm test` | Run all tests once (Vitest). The `engine` project runs on Node, the `ui` project on jsdom |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run Oxlint; warnings fail |
| `npm run format` / `format:check` | Format, or check formatting, with Prettier (code and config only; Markdown is excluded) |
| `npm run typecheck` | `tsc -b`, strict |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run icons` | Redraw `public/favicon.svg`, `docs/assets/logo.svg` and the PWA PNGs (needs Google Chrome) |
| `npm run screenshots` | Build, then capture the app in English into `.screenshots/en/` (needs Google Chrome; every phone shot must be 780×1688). Options after `--`: `--lang ru,de`, `--only board,setup`, `--out <dir>`, `--width 360` |
| `npm run site:shots` | Build, then capture the app in all five languages for the landing page into `.screenshots/` (not committed) |
| `npm run readme:shots` | Build, capture six English screens and frame them in the landing page's phone into `docs/screenshots/` (committed, every image the same size; needs Google Chrome). Rerun it when those screens change |
| `npm run site` | Render the landing page in five languages into `_site/` from `site/index.html` and `site/locales/*.json`, with the screenshots, fonts and icons. `npx vite preview --outDir _site` serves it |
| `npm run reference` | Download the rulebook PDFs into `docs/reference/` from the `reference-docs` release (needs `gh` auth) |
| `docker build -t catan-boards .` | Build the production image (nginx on port 8080); `docker compose up -d` runs the published one |

CI (`.github/workflows/ci.yml`) runs `lint`, `format:check`, `typecheck`, `test` and `build` on every
PR and on every push to `master`. Run the same commands before pushing. `docker.yml` builds the
image on PRs and publishes it to GHCR from `master`. `pages.yml` captures the screenshots and builds
the landing page on every run, and deploys it to GitHub Pages from `master`. `vercel.ts` configures
the other way to host the app, Vercel's Git integration; keep its caching and security headers in
step with `docker/nginx.conf` and `docker/security-headers.inc`.

## Code layout

```
src/
  engine/   pure TypeScript: scenarios, hex geometry, dealing, codes, share links; *.test.ts on Node
  ui/       React UI from the Pencil design; *.test.ts(x) on jsdom with Testing Library
    board/       the board as SVG, its viewport (fit, scroll, zoom), legend, deal timing, PNG export
    components/  kit: buttons, toggles, segmented control, sheets, toasts, tab bar, logo
    screens/     board, setup, scenario, language, scenario sheet, share sheet, print sheet
    i18n/        translations: locales/{en,es,de,ru,sr}.json (ICU), loader, t(), typography
    pwa/         install banner and iOS steps, splash, update and offline toasts
    state/       storage (prefs, settings, address bar), wake lock
  test/     shared test setup
public/     favicon and PWA icons (renders of scripts/gen-icons.mjs)
site/       landing page: an HTML template, CSS and locales/{en,es,de,ru,sr}.json, rendered by scripts/build-site.mjs
scripts/    icons, screenshots, landing page build
docs/       rules, design, the v1 app, the README's screenshots, reference PDFs (gitignored)
```

**Conventions**

- Imports use explicit `.ts` / `.tsx` extensions.
- Use named exports.
- Style with CSS Modules (`*.module.css`), using the tokens in `src/ui/styles/global.css`.
- **All UI text lives in `src/ui/i18n/locales/*.json`**, one file per language, in ICU message syntax
  (see `locales/README.md`). Code calls `t('section.key', { vars })`, with keys typed from `en.json`.
  Add each new text to every file; tests fail on a missing key or an unknown placeholder. Check new
  screens at 360 px in the longest languages, German and Russian.
- TypeScript is strict, with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.

## Workflow

GitHub Issues hold the plan, organised with milestones and labels: `engine`, `ui`, `infra`, `rules`,
`documentation`, `enhancement`, `bug`.

1. **Pick an issue** and read its acceptance criteria. If anything is unclear, comment on the issue
   first.
2. **Branch** from `master` with the name `<issue-number>-<short-slug>`, for example `7-fog-preview`.
3. **Commit** in small steps. Use imperative messages ("Keep the desert on the main island") and
   reference the issue (`#7`). **Never add `Co-Authored-By` or any other attribution trailer**: keep
   the history clean.
4. **Open a PR** whose body says `Closes #<n>`. Summarise what changed, how it was tested, and any rule
   decisions with links to the docs.
5. **CI must be green.** It runs lint, format check, typecheck, tests and build. **Squash-merge** into
   `master`, then delete the branch. The squash commit uses the PR title as its subject and a short
   summary as its body, with no trailers.
6. **Track new work** you discover as a new issue. Don't widen the PR you're working on.

### Definition of done

- Acceptance criteria met.
- Each engine rule touched has unit tests; `v1.test.ts` still passes (or the issue says why not).
- No `any` without a comment explaining it. Strict TypeScript passes.
- UI works at 360 px width with touch, with tap targets of at least 44 px, in all five languages.
- Docs updated: rules and rulings, design, this file if workflow or commands changed.
