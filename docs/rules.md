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

`hexes` is everything the board uses from the box, sea included. Seafarers boards are dealt on the
rulebook's printed maps, sea and harbors included (see [Printed maps](#printed-maps)). Boards from v1
links grow their islands instead and draw the open sea only as orientation (ruling R2).

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
| `s8` | 3–4 | 49: sea 19, desert 3, gold 2, 5 of each | 27 | 5 + 4 | A wonder, or 10 VP and the most stages | 5 wonder cards, 5 Great Wall and 2 Great Bridge tokens, 4 player markers | p. 22, map p. 23 |
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

## Printed maps

Each Seafarers scenario prints its map: the frame, the sea, every island hex with its number, and
the harbor spots. [`src/engine/maps.ts`](../src/engine/maps.ts) holds them, transcribed hex by hex
from the pages below. A deal keeps every outline and changes only what the scenario's «Варианты
раскладки поля» (layout variants) allow. **As printed in the rulebook** (link flag `p`) deals the map
exactly as its setup («Подготовка») says, chance included: the fog, harbors laid at random.

| Scenario | Map | As printed (setup) | A deal (layout variants) |
| --- | --- | --- | --- |
| 1 · Heading for New Shores | p. 8 (3 players), p. 9 (4) | The map exactly | The main island's hexes, numbers and harbors among themselves; the small islands' (outlined in red) land and numbers among themselves, all small islands together (R11) |
| 2 · The Four Islands | p. 10, p. 11 | The map exactly | Hexes, numbers and harbors within each island; forest and pasture don't get 2, 3, 11 or 12 |
| 3 · Oceania | p. 12, p. 13 | Both islands and the sea with harbors as printed; the fog is the table's other hexes, face down, with their numbers in a face-down pile | Hexes, numbers and harbors within each island; the rules allow two 6/8 side by side here |
| 4 · Through the Desert | p. 14, p. 15 | The map exactly | The main island's land, numbers and harbors, except the three deserts (R12); the land and numbers of the small islands and of the strip west of the deserts (both outlined in red), together. No 6/8 side by side or on gold |
| 5 · The Forgotten Tribe | p. 16 | The map; harbor tokens laid face down on their spots, then turned over | Hexes and numbers (R13); the main island's three easternmost hexes don't get 5, 6, 8 or 9. The small islands have no numbers |
| 6 · Cloth for Catan | p. 18 | The map; harbors at random; two villages (number tokens on intersections) on each small island | The main islands' hexes and numbers, both islands together (R14). The small islands and their villages stay |
| 7 · The Pirate Islands | p. 20 | The map; harbors at random. One pasture and two hills have no number | Nothing else: «сбалансирован только при заданных условиях» (balanced only as given) |
| 8 · The Wonders of Catan | p. 23 | The map; harbors at random | The main island's hexes and numbers within its outline; the deserts stay; no 6/8 next to a desert |
| 9 · The New World | p. 24 | Everything at random inside the frame | The same; the players place the harbors in turn |

When nothing but chance differs (Scenarios 7 and 9), Setup doesn't offer As printed. The token rules
(6 and 8 apart, equal numbers apart, spread terrain) apply within what a deal may change; As printed
keeps the printed numbers, so they only apply to its fog.

## Rulings

| # | Gap | What the app does |
| --- | --- | --- |
| R1 | The 5–6 player extension isn't in the rulebook the data comes from | Standard counts (30 hexes, 28 tokens, 11 harbors, 2 deserts); the frame's outline is approximate, as the scenario rules say |
| R2 | Boards from v1 links (no `v=` in the link) | They keep v1's boards, so a shared link never changes: islands grown from a centre to the right size, one hex of sea between them. Every new board follows the printed maps (`v=2`) |
| R3 | Harbors on v1 boards | v1 didn't place them: the board doesn't draw them, and the Scenario screen says to lay them as the map shows |
| R4 | Revealed fog land takes the top token from a face-down pile | The generator gives fog hexes numbers anyway, shown only in the "Reveal fog" preview |
| R5 | Where gold fields go on v1 boards | Gold prefers the small isles when a scenario has them (v1's choice). Printed maps put it where printed |
| R6 | Deserts on v1 boards | Scenario 1 (4 players) and Scenario 8 keep the desert on the main island; Scenario 4 lines three deserts up across the main island. Printed maps keep Scenario 4's and 8's deserts in place, as their variants say |
| R7 | Scenario 7's tokenless hexes on v1 boards | Three random isle hexes (not desert or gold). Printed: the pasture and two hills the setup names |
| R8 | Scenario 6's villages on v1 boards | Two tokens per islet from the spare tokens, never a pair of equals when it can be avoided. Printed: as on the map |
| R9 | A pool short of tokens | Spare tokens in the standard order 6, 8, 5, 9, 4, 10, 3, 11, 2, 12 |
| R10 | The A–R order | v1's approximation: outer ring first, clockwise by angle; the desert is skipped |
| R11 | Scenario 1's red outline also takes in sea between the small islands | «Гексы малых островов» (the small islands' hexes) means their land: the sea stays, so each small island keeps its printed outline. Scenario 4 names sea when it means it |
| R12 | Scenario 4 lets the main island's sea move too («гексы суши и моря») | The printed coast stays, so the harbor spots stay on it; the land, numbers and harbor types move |
| R13 | Scenario 5 lets every hex move, but its small islands never take numbers | The main island's hexes trade places among themselves and the small islands' among themselves, so the numbers stay on the main island |
| R14 | Scenario 6 moves «гексы главных островов» (the main islands' hexes) without saying within each island | Both main islands deal as one group, as Scenarios 2 and 3 say «в пределах островов» (within the islands) when they mean that |
| R15 | Scenarios 5–8 lay harbors at random, so their maps print no types | The spots get the scenario's harbor tokens, shuffled on every board, As printed too |
| R16 | The robber's and the pirate's start | Not drawn. The scenario text names it; most maps put the pirate on the frame, which has no hex |
