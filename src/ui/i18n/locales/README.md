# Translations

Every text in the app lives here, in one file per language:

| File | Language |
| --- | --- |
| `en.json` | English: the source, bundled with the app, and the fallback for missing texts |
| `es.json` | Español |
| `de.json` | Deutsch |
| `ru.json` | Русский |
| `sr.json` | Српски (Cyrillic only) |

The app loads only the file for the chosen language, so each file is one self-contained translation.
The landing page has its own texts in `site/locales/`, but takes scenario names, victory targets,
button labels and sample codes from these files.

## What's in a file

- **Screens:** `board`, `setup`, `scenario`, `sheet`, `share`, `language`, `pwa`, `toasts`, `tabs`.
- **Game words:** `game`, `terrain`, `resource`, `victory`, `extras`.
- **`codeWords`:** twenty one-word, lower-case nautical words for new board codes
  (`anchor-4821`). Any code works in every language; these only make new ones readable.
- **`scenarios`:** per board group (`base34`, `base56`, `s1` … `s9`): `name`, `short` (the board's
  header), `tagline` (empty when the victory target says it all), `story`, and `rules`. Groups with
  separate 3- and 4-player layouts keep their rules per layout: `s1_3`, `s1_4`, …, `s4_4`.

## Changing a text

Edit the value and keep the key. Tests check every file against `en.json`, so nothing silently goes
missing. They check that:

- every file has the same keys;
- every message parses;
- a translation only uses placeholders that English uses;
- every scenario has a name, a story and as many rules as its layout needs.

## Message syntax

Messages use a small part of [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/):

| Syntax | Meaning | Example |
| --- | --- | --- |
| `{name}` | a value from the app | `"Dealing hexes · {n} of {total}"` |
| `{name, select, a {…} other {…}}` | pick a branch by value | |
| `{n, plural, one {…} few {…} many {…} other {…}}` | pick by the language's plural rules | `"{n, plural, one {# игрок} few {# игрока} many {# игроков} other {# игрока}}"` |
| `#` | inside `plural`: the number | `"{n, plural, one {# token} other {# tokens}}"` |

- **`other`.** Every `select` and `plural` needs an `other` branch.
- **Plural categories.** Russian: one, few, many, other. Serbian: one, few, other. English, Spanish
  and German: one and other.
- **Apostrophes.** Use the typographic ’ rather than '.

## Typography

Write ordinary spaces. When a text is shown, `../typography.ts` adds the non-breaking spaces Russian
needs (a short word stays with the next one, a number with its word, a dash never starts a line).
Russian quotes are «ёлочки» with „лапки“ inside; Serbian uses „…“.

## Adding a language

1. Copy `en.json` to `<code>.json` and translate every value.
2. Add the language to `LANGS` and `LOADERS` in `src/ui/i18n/index.ts`, with its own sample line.
3. Add it to the landing page: `site/locales/<code>.json` and `LANGS` in `scripts/build-site.mjs`.
4. Run `npm test` and `npm run typecheck`. Then check the key screens at 360 px wide in the new
   language: long words must still fit.
