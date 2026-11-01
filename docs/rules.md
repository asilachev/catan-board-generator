# Boards and rulings

What the app deals for each board, where the numbers come from, and how it fills the gaps the
rulebooks leave. The data lives in [`src/engine/scenarios.ts`](../src/engine/scenarios.ts); the
words (names, stories, scenario rules) in `scenarios.<id>` of the translation files.

## Sources

The counts were checked against the Russian editions by Hobby World, the ones the first version of
the app was built from. They are in `docs/reference/` (gitignored, see its README):

| Book | File | Edition |
| --- | --- | --- |
| Base game | `catan-rules-ru.pdf` | Hobby World, version 1.1 |
| Seafarers («Мореходы») | `catan-seafarers-rules-ru-2025.pdf` | Hobby World, 2025, version 1.0 |

Page numbers below refer to these files. Other editions number pages differently, so the app names
the section to read («Scenario 1 · Heading for New Shores») and links CATAN GmbH's official rules
page (<https://www.catan.com/understand-catan/game-rules>) instead of a page.

## Boards

`hexes` is everything the board uses from the box, sea included. The app deals the land (and the sea
inside the fog and in Scenario 9); open sea around Seafarers islands is drawn only as orientation.

| Variant | Players | Hexes | Tokens | Harbors (2:1 + 3:1) | Victory | Also from the box | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `base34` | 3–4 | 19: forest 4, pasture 4, fields 4, hills 3, mountains 3, desert 1 | 18 | 5 + 4, dealt on the frame | 10 VP | | Base, p. 12 (advanced setup) |
| `base56` | 5–6 | 30: 6, 6, 6, 5, 5, desert 2 | 28 | 5 + 6, dealt on the frame | 10 VP | | Ruling R1 |
| `s1_3` | 3 | 35: sea 13, gold 2, hills 4, forest 3, pasture 5, fields 4, mountains 4 | 22 | 5 + 3 | 14 VP | 18 VP tokens | Seafarers, p. 8 |
| `s1_4` | 4 | 42: sea 14, desert 1, gold 2, 5 of each | 27 | 5 + 4 | 14 VP | 24 VP tokens | p. 9 |
| `s2_3` | 3 | 35: sea 15, 4 of each | 20 | 5 + 4 | 13 VP | 18 VP tokens | p. 10 |
| `s2_4` | 4 | 35: sea 12, hills 4, forest 5, pasture 5, fields 5, mountains 4 | 23 | 5 + 4 | 13 VP | 24 VP tokens | p. 11 |
| `s3_3` | 3 | 42: sea 18, gold 2, hills 4, forest 5, pasture 5, fields 4, mountains 4 | 24 | 5 + 3 | 12 VP | | p. 12 |
| `s3_4` | 4 | 42: sea 15, gold 2, 5 of each | 27 | 5 + 4 | 12 VP | | p. 13 |
| `s4_3` | 3 | 35: sea 10, desert 3, gold 2, hills 3, forest 5, pasture 4, fields 4, mountains 4 | 22 | 5 + 3 | 14 VP | 24 VP tokens | p. 14 |
| `s4_4` | 4 | 42: sea 12, desert 3, gold 2, 5 of each | 27 | 5 + 4 | 14 VP | 32 VP tokens | p. 15 |
| `s5` | 3–4 | 49: sea 19, desert 3, gold 2, 5 of each | 18 | 5 + 1 | 13 VP | 4 development cards, 8 VP tokens | p. 16 |
| `s6` | 3–4 | 42: sea 18, desert 2, gold 2, hills 3, forest 4, pasture 4, fields 5, mountains 4 | 28 | 5 + 4 | 14 VP | 50 cloth tokens | p. 18 |
| `s7` | 3–4 | 49: sea 19, desert 3, gold 2, 5 of each | 24 | 5 + 3 | Own fortress + 10 VP | 12 fortress tokens, 4 player markers | p. 20 |
| `s8` | 3–4 | 49: sea 19, desert 3, gold 2, 5 of each | 27 | 5 + 4 | A wonder, or 10 VP and the most stages | 5 wonder cards, 5 Great Wall and 2 Great Bridge tokens, 4 player markers | p. 22 |
| `s9` | 3–4 | 42: sea 19, hills 4, forest 5, pasture 5, fields 5, mountains 4 | 23 | 5 + 5 | 12 VP | 16 VP tokens | p. 24 |

"5 of each" means hills, forest, pasture, fields and mountains 5 each. Exact token counts per number
are in `scenarios.ts`; the Scenario screen lists them. The general Seafarers rules are on p. 4.

## Token placement rules

| Rule | Default | Where it comes from |
| --- | --- | --- |
| 6 and 8 never adjacent | on | The Seafarers rules (and good practice for the base game) |
| No equal numbers side by side (and no 2 next to 12) | on | House rule |
| Spread terrain | on | House rule: fewer clusters of the same terrain |
| Tokens by letters A–R | off | Base game advanced setup; offered for `base34` only |

When a rule can't be met everywhere, the deal keeps the best arrangement it found and the app says
so ("Rule relaxed"). The search weighs a 6 next to an 8 twice as heavily as equal neighbours, so
equal numbers give way first.

Scenario rules on top: no 6 or 8 on gold fields (Scenario 4), none next to a desert (Scenario 8).

## Rulings

| # | Gap | What the app does |
| --- | --- | --- |
| R1 | The 5–6 player extension isn't in the rulebook the data comes from | Standard counts (30 hexes, 28 tokens, 11 harbors, 2 deserts); the frame's outline is approximate, as the scenario rules say |
| R2 | Seafarers maps are printed layouts | Islands grow from a centre to the right size, with one hex of sea between them; the rules allow rearranging hexes and tokens within an island, not the islands themselves |
| R3 | Seafarers harbors sit where the map shows | Not drawn on the board; the Scenario screen lists them and says so |
| R4 | Revealed fog land takes the top token from a face-down pile | The generator gives fog hexes numbers anyway, shown only in the "Reveal fog" preview |
| R5 | Where gold fields go | Gold prefers the small isles when a scenario has them (v1's choice) |
| R6 | The desert must stay where the robber starts | Scenario 1 (4 players) and Scenario 8 keep the desert on the main island; Scenario 4 lines three deserts up across the main island |
| R7 | Scenario 7's tokenless hexes | Three random isle hexes (not desert or gold) |
| R8 | Scenario 6's villages | Two tokens per islet from the spare tokens, never a pair of equals when it can be avoided |
| R9 | A pool short of tokens | Spare tokens in the standard order 6, 8, 5, 9, 4, 10, 3, 11, 2, 12 |
| R10 | The A–R order | v1's approximation: outer ring first, clockwise by angle; the desert is skipped |
