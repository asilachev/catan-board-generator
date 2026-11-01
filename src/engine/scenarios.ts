/**
 * The boards the app can deal: the base game for 3–4 and 5–6 players and the nine Seafarers
 * scenarios, some with separate 3- and 4-player layouts. Tile, token and harbor counts and the
 * victory targets come from the rulebooks; docs/rules.md lists the sources page by page.
 *
 * The data is v1's, unchanged. Key order inside `hexes` and `pools` matters: tiles are dealt in
 * that order before shuffling, so reordering would change every board a code builds.
 * All words live in the translation files (`scenarios.<id>` in src/ui/i18n/locales).
 */

export const TERRAINS = [
  'forest',
  'pasture',
  'fields',
  'hills',
  'mountains',
  'desert',
  'gold',
  'sea',
] as const
export type Terrain = (typeof TERRAINS)[number]

/** The five terrains that produce a resource, in the order the app lists them. */
export const RESOURCES = ['forest', 'pasture', 'fields', 'hills', 'mountains'] as const
export type Resource = (typeof RESOURCES)[number]

/** A harbor trades 3:1 for anything ("any") or 2:1 for one resource. */
export type HarborType = 'any' | Resource

export type Game = 'base' | 'seafarers'

/**
 * How a region is filled:
 * - `main`/`isle`: land from the `land` pool (gold prefers isles);
 * - `fog`: face-down hexes from the `fog` pool (Scenario 3);
 * - `notoken`: islets without number tokens (Scenarios 5 and 6);
 * - `random`: everything from one pool, sea included (Scenario 9).
 */
export type RegionKind = 'main' | 'isle' | 'fog' | 'notoken' | 'random'
export type PoolKey = 'land' | 'fog' | 'notoken' | 'random'

export interface Region {
  readonly kind: RegionKind
  readonly size: number
  /** Centre as [distance in hex widths, angle in degrees], 0° = east, clockwise. Default 0,0. */
  readonly at?: readonly [distance: number, degrees: number]
  /** May touch the regions placed before it (fog around islands). */
  readonly touch?: boolean
}

export type TerrainCounts = Readonly<Partial<Record<Terrain, number>>>
/** Number → how many tokens. */
export type TokenCounts = Readonly<Record<number, number>>

/** Pieces from the box a scenario needs besides tiles, tokens and harbors. */
export type ExtraKind =
  | 'vpTokens'
  | 'devCards'
  | 'cloth'
  | 'fortresses'
  | 'playerTokens'
  | 'wonderCards'
  | 'wallTokens'
  | 'bridgeTokens'
export interface Extra {
  readonly kind: ExtraKind
  readonly n: number
}

export type Victory =
  | { readonly kind: 'points'; readonly points: number }
  /** Scenario 7: capture your own pirate fortress and reach the points. */
  | { readonly kind: 'fortress'; readonly points: number }
  /** Scenario 8: finish a wonder, or reach the points with the most wonder stages. */
  | { readonly kind: 'wonder'; readonly points: number }

/** Where a variant is described in the Russian editions the data was checked against. */
export interface Source {
  readonly book: 'base' | 'seafarers'
  readonly page: number
}

export const GROUP_IDS = [
  'base34',
  'base56',
  's1',
  's2',
  's3',
  's4',
  's5',
  's6',
  's7',
  's8',
  's9',
] as const
/** What the player picks: a base-game layout or a Seafarers scenario (also the link's `s=`). */
export type GroupId = (typeof GROUP_IDS)[number]

export const VARIANT_IDS = [
  'base34',
  'base56',
  's1_3',
  's1_4',
  's2_3',
  's2_4',
  's3_3',
  's3_4',
  's4_3',
  's4_4',
  's5',
  's6',
  's7',
  's8',
  's9',
] as const
/** One concrete layout: a group, plus the player count where the rules print two. */
export type VariantId = (typeof VARIANT_IDS)[number]

export type Seats = 3 | 4

export interface Variant {
  readonly id: VariantId
  readonly group: GroupId
  readonly game: Game
  /** 1–9 for Seafarers scenarios, null for the base game. */
  readonly number: number | null
  /** Set when the rules print separate 3- and 4-player layouts. */
  readonly seats: Seats | null
  readonly players: { readonly min: number; readonly max: number }
  readonly hexes: TerrainCounts
  readonly tokens: TokenCounts
  /** Printed harbors: `special` 2:1 and `generic` 3:1. */
  readonly harbors: { readonly special: number; readonly generic: number }
  /** Base game: the harbor types dealt around the sea frame. Seafarers: harbors follow the map. */
  readonly harborTypes?: readonly HarborType[]
  readonly extras: readonly Extra[]
  readonly victory: Victory
  readonly source: Source
  /** How many scenario rules the translation files hold for this variant. */
  readonly ruleCount: number
  readonly shape: readonly Region[]
  /** Tile pools by region kind; without it every region deals from `hexes`. */
  readonly pools?: Readonly<Partial<Record<PoolKey, TerrainCounts>>>
  /** Offers the rulebook's A–R token order. */
  readonly letters?: boolean
  /** The desert must end up on the main island (the robber starts there). */
  readonly desertOnMain?: boolean
  /** That many deserts form a wall across the main island (Scenario 4). */
  readonly desertWall?: number
  /** No 6 or 8 on gold fields. */
  readonly noRedOnGold?: boolean
  /** No 6 or 8 next to a desert. */
  readonly noRedNearDesert?: boolean
  /** That many isle hexes get no number token (Scenario 7). */
  readonly noTokenIsles?: number
  /** Number tokens per islet village (Scenario 6). */
  readonly villages?: number
}

const BASE_HARBORS: readonly HarborType[] = ['forest', 'pasture', 'fields', 'hills', 'mountains']
const vpTokens = (n: number): Extra => ({ kind: 'vpTokens', n })
const points = (n: number): Victory => ({ kind: 'points', points: n })
const seafarers = (page: number): Source => ({ book: 'seafarers', page })

const LIST: readonly Variant[] = [
  {
    id: 'base34',
    group: 'base34',
    game: 'base',
    number: null,
    seats: null,
    players: { min: 3, max: 4 },
    hexes: { forest: 4, pasture: 4, fields: 4, hills: 3, mountains: 3, desert: 1 },
    tokens: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 },
    harbors: { special: 5, generic: 4 },
    harborTypes: ['any', 'any', 'any', 'any', ...BASE_HARBORS],
    extras: [],
    victory: points(10),
    source: { book: 'base', page: 12 },
    ruleCount: 4,
    letters: true,
    shape: [{ kind: 'main', size: 19 }],
  },
  {
    id: 'base56',
    group: 'base56',
    game: 'base',
    number: null,
    seats: null,
    players: { min: 5, max: 6 },
    hexes: { forest: 6, pasture: 6, fields: 6, hills: 5, mountains: 5, desert: 2 },
    tokens: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 },
    harbors: { special: 5, generic: 6 },
    harborTypes: ['any', 'any', 'any', 'any', 'any', 'any', ...BASE_HARBORS],
    extras: [],
    victory: points(10),
    source: { book: 'base', page: 3 },
    ruleCount: 3,
    shape: [{ kind: 'main', size: 30 }],
  },
  {
    id: 's1_3',
    group: 's1',
    game: 'seafarers',
    number: 1,
    seats: 3,
    players: { min: 3, max: 3 },
    hexes: { sea: 13, gold: 2, hills: 4, forest: 3, pasture: 5, fields: 4, mountains: 4 },
    tokens: { 2: 1, 3: 2, 4: 3, 5: 3, 6: 2, 8: 3, 9: 2, 10: 3, 11: 2, 12: 1 },
    harbors: { special: 5, generic: 3 },
    extras: [vpTokens(18)],
    victory: points(14),
    source: seafarers(8),
    ruleCount: 4,
    pools: { land: { gold: 2, hills: 4, forest: 3, pasture: 5, fields: 4, mountains: 4 } },
    shape: [
      { kind: 'main', size: 14 },
      { kind: 'isle', size: 3, at: [8.5, -30] },
      { kind: 'isle', size: 3, at: [9, 2] },
      { kind: 'isle', size: 2, at: [8.5, 32] },
    ],
  },
  {
    id: 's1_4',
    group: 's1',
    game: 'seafarers',
    number: 1,
    seats: 4,
    players: { min: 4, max: 4 },
    hexes: {
      sea: 14,
      desert: 1,
      gold: 2,
      hills: 5,
      forest: 5,
      pasture: 5,
      fields: 5,
      mountains: 5,
    },
    tokens: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 1 },
    harbors: { special: 5, generic: 4 },
    extras: [vpTokens(24)],
    victory: points(14),
    source: seafarers(9),
    ruleCount: 4,
    desertOnMain: true,
    pools: {
      land: { desert: 1, gold: 2, hills: 5, forest: 5, pasture: 5, fields: 5, mountains: 5 },
    },
    shape: [
      { kind: 'main', size: 19 },
      { kind: 'isle', size: 4, at: [9, -30] },
      { kind: 'isle', size: 3, at: [9.5, 2] },
      { kind: 'isle', size: 2, at: [9, 33] },
    ],
  },
  {
    id: 's2_3',
    group: 's2',
    game: 'seafarers',
    number: 2,
    seats: 3,
    players: { min: 3, max: 3 },
    hexes: { sea: 15, hills: 4, forest: 4, pasture: 4, fields: 4, mountains: 4 },
    tokens: { 2: 1, 3: 2, 4: 2, 5: 3, 6: 2, 8: 2, 9: 3, 10: 2, 11: 2, 12: 1 },
    harbors: { special: 5, generic: 4 },
    extras: [vpTokens(18)],
    victory: points(13),
    source: seafarers(10),
    ruleCount: 4,
    pools: { land: { hills: 4, forest: 4, pasture: 4, fields: 4, mountains: 4 } },
    shape: [
      { kind: 'main', size: 5, at: [6, -145] },
      { kind: 'main', size: 5, at: [6, -35] },
      { kind: 'main', size: 5, at: [6, 35] },
      { kind: 'main', size: 5, at: [6, 145] },
    ],
  },
  {
    id: 's2_4',
    group: 's2',
    game: 'seafarers',
    number: 2,
    seats: 4,
    players: { min: 4, max: 4 },
    hexes: { sea: 12, hills: 4, forest: 5, pasture: 5, fields: 5, mountains: 4 },
    tokens: { 2: 1, 3: 2, 4: 3, 5: 3, 6: 2, 8: 2, 9: 3, 10: 3, 11: 3, 12: 1 },
    harbors: { special: 5, generic: 4 },
    extras: [vpTokens(24)],
    victory: points(13),
    source: seafarers(11),
    ruleCount: 4,
    pools: { land: { hills: 4, forest: 5, pasture: 5, fields: 5, mountains: 4 } },
    shape: [
      { kind: 'main', size: 6, at: [6.5, -145] },
      { kind: 'main', size: 6, at: [6.5, -35] },
      { kind: 'main', size: 6, at: [6.5, 35] },
      { kind: 'main', size: 5, at: [6.5, 145] },
    ],
  },
  {
    id: 's3_3',
    group: 's3',
    game: 'seafarers',
    number: 3,
    seats: 3,
    players: { min: 3, max: 3 },
    hexes: { sea: 18, gold: 2, hills: 4, forest: 5, pasture: 5, fields: 4, mountains: 4 },
    tokens: { 3: 3, 4: 2, 5: 3, 6: 3, 8: 3, 9: 3, 10: 2, 11: 3, 12: 2 },
    harbors: { special: 5, generic: 3 },
    extras: [],
    victory: points(12),
    source: seafarers(12),
    ruleCount: 4,
    pools: {
      land: { gold: 1, hills: 3, forest: 4, pasture: 4, fields: 3, mountains: 3 },
      fog: { sea: 6, gold: 1, hills: 1, forest: 1, pasture: 1, fields: 1, mountains: 1 },
    },
    shape: [
      { kind: 'main', size: 9, at: [6, 170] },
      { kind: 'main', size: 9, at: [6, -10] },
      { kind: 'fog', size: 12, at: [0, 0], touch: true },
    ],
  },
  {
    id: 's3_4',
    group: 's3',
    game: 'seafarers',
    number: 3,
    seats: 4,
    players: { min: 4, max: 4 },
    hexes: { sea: 15, gold: 2, hills: 5, forest: 5, pasture: 5, fields: 5, mountains: 5 },
    tokens: { 2: 1, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 },
    harbors: { special: 5, generic: 4 },
    extras: [],
    victory: points(12),
    source: seafarers(13),
    ruleCount: 4,
    pools: {
      land: { gold: 1, hills: 4, forest: 4, pasture: 4, fields: 4, mountains: 3 },
      fog: { sea: 5, gold: 1, hills: 1, forest: 1, pasture: 1, fields: 1, mountains: 2 },
    },
    shape: [
      { kind: 'main', size: 10, at: [6.5, 170] },
      { kind: 'main', size: 10, at: [6.5, -10] },
      { kind: 'fog', size: 12, at: [0, 0], touch: true },
    ],
  },
  {
    id: 's4_3',
    group: 's4',
    game: 'seafarers',
    number: 4,
    seats: 3,
    players: { min: 3, max: 3 },
    hexes: {
      sea: 10,
      desert: 3,
      gold: 2,
      hills: 3,
      forest: 5,
      pasture: 4,
      fields: 4,
      mountains: 4,
    },
    tokens: { 2: 1, 3: 2, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 2, 11: 1, 12: 1 },
    harbors: { special: 5, generic: 3 },
    extras: [vpTokens(24)],
    victory: points(14),
    source: seafarers(14),
    ruleCount: 4,
    noRedOnGold: true,
    desertWall: 3,
    pools: {
      land: { desert: 3, gold: 2, hills: 3, forest: 5, pasture: 4, fields: 4, mountains: 4 },
    },
    shape: [
      { kind: 'main', size: 19 },
      { kind: 'isle', size: 3, at: [8.5, -22] },
      { kind: 'isle', size: 3, at: [8.5, 22] },
    ],
  },
  {
    id: 's4_4',
    group: 's4',
    game: 'seafarers',
    number: 4,
    seats: 4,
    players: { min: 4, max: 4 },
    hexes: {
      sea: 12,
      desert: 3,
      gold: 2,
      hills: 5,
      forest: 5,
      pasture: 5,
      fields: 5,
      mountains: 5,
    },
    tokens: { 2: 1, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 },
    harbors: { special: 5, generic: 4 },
    extras: [vpTokens(32)],
    victory: points(14),
    source: seafarers(15),
    ruleCount: 4,
    noRedOnGold: true,
    desertWall: 3,
    pools: {
      land: { desert: 3, gold: 2, hills: 5, forest: 5, pasture: 5, fields: 5, mountains: 5 },
    },
    shape: [
      { kind: 'main', size: 22 },
      { kind: 'isle', size: 4, at: [9, -28] },
      { kind: 'isle', size: 2, at: [9.5, 2] },
      { kind: 'isle', size: 2, at: [9, 30] },
    ],
  },
  {
    id: 's5',
    group: 's5',
    game: 'seafarers',
    number: 5,
    seats: null,
    players: { min: 3, max: 4 },
    hexes: {
      sea: 19,
      desert: 3,
      gold: 2,
      hills: 5,
      forest: 5,
      pasture: 5,
      fields: 5,
      mountains: 5,
    },
    tokens: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 },
    harbors: { special: 5, generic: 1 },
    extras: [
      { kind: 'devCards', n: 4 },
      { kind: 'vpTokens', n: 8 },
    ],
    victory: points(13),
    source: seafarers(16),
    ruleCount: 4,
    pools: {
      land: { desert: 3, gold: 2, hills: 4, forest: 4, pasture: 3, fields: 3, mountains: 2 },
      notoken: { hills: 1, forest: 1, pasture: 2, fields: 2, mountains: 3 },
    },
    shape: [
      { kind: 'main', size: 21 },
      { kind: 'notoken', size: 3, at: [8, -25] },
      { kind: 'notoken', size: 2, at: [8, 25] },
      { kind: 'notoken', size: 2, at: [8, 155] },
      { kind: 'notoken', size: 2, at: [8, -155] },
    ],
  },
  {
    id: 's6',
    group: 's6',
    game: 'seafarers',
    number: 6,
    seats: null,
    players: { min: 3, max: 4 },
    hexes: {
      sea: 18,
      desert: 2,
      gold: 2,
      hills: 3,
      forest: 4,
      pasture: 4,
      fields: 5,
      mountains: 4,
    },
    tokens: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 },
    harbors: { special: 5, generic: 4 },
    extras: [{ kind: 'cloth', n: 50 }],
    victory: points(14),
    source: seafarers(18),
    ruleCount: 4,
    villages: 2,
    pools: {
      land: { desert: 2, gold: 2, hills: 3, forest: 3, pasture: 3, fields: 4, mountains: 3 },
      notoken: { forest: 1, pasture: 1, fields: 1, mountains: 1 },
    },
    shape: [
      { kind: 'main', size: 10, at: [6.5, 178] },
      { kind: 'main', size: 10, at: [6.5, -2] },
      { kind: 'notoken', size: 1, at: [3.6, -120] },
      { kind: 'notoken', size: 1, at: [3.6, -60] },
      { kind: 'notoken', size: 1, at: [3.6, 60] },
      { kind: 'notoken', size: 1, at: [3.6, 120] },
    ],
  },
  {
    id: 's7',
    group: 's7',
    game: 'seafarers',
    number: 7,
    seats: null,
    players: { min: 3, max: 4 },
    hexes: {
      sea: 19,
      desert: 3,
      gold: 2,
      hills: 5,
      forest: 5,
      pasture: 5,
      fields: 5,
      mountains: 5,
    },
    tokens: { 2: 1, 3: 2, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 2, 12: 1 },
    harbors: { special: 5, generic: 3 },
    extras: [
      { kind: 'fortresses', n: 12 },
      { kind: 'playerTokens', n: 4 },
    ],
    victory: { kind: 'fortress', points: 10 },
    source: seafarers(20),
    ruleCount: 4,
    noTokenIsles: 3,
    pools: {
      land: { desert: 3, gold: 2, hills: 5, forest: 5, pasture: 5, fields: 5, mountains: 5 },
    },
    shape: [
      { kind: 'main', size: 12, at: [6.5, 0] },
      { kind: 'isle', size: 6, at: [7, -138] },
      { kind: 'isle', size: 6, at: [7.5, 180] },
      { kind: 'isle', size: 6, at: [7, 138] },
    ],
  },
  {
    id: 's8',
    group: 's8',
    game: 'seafarers',
    number: 8,
    seats: null,
    players: { min: 3, max: 4 },
    hexes: {
      sea: 19,
      desert: 3,
      gold: 2,
      hills: 5,
      forest: 5,
      pasture: 5,
      fields: 5,
      mountains: 5,
    },
    tokens: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 1 },
    harbors: { special: 5, generic: 4 },
    extras: [
      { kind: 'wonderCards', n: 5 },
      { kind: 'wallTokens', n: 5 },
      { kind: 'bridgeTokens', n: 2 },
      { kind: 'playerTokens', n: 4 },
    ],
    victory: { kind: 'wonder', points: 10 },
    source: seafarers(22),
    ruleCount: 4,
    noRedNearDesert: true,
    desertOnMain: true,
    pools: {
      land: { desert: 3, gold: 2, hills: 5, forest: 5, pasture: 5, fields: 5, mountains: 5 },
    },
    shape: [
      { kind: 'main', size: 22 },
      { kind: 'isle', size: 4, at: [8.5, -30] },
      { kind: 'isle', size: 2, at: [9, 26] },
      { kind: 'isle', size: 2, at: [8.5, 180] },
    ],
  },
  {
    id: 's9',
    group: 's9',
    game: 'seafarers',
    number: 9,
    seats: null,
    players: { min: 3, max: 4 },
    hexes: { sea: 19, hills: 4, forest: 5, pasture: 5, fields: 5, mountains: 4 },
    tokens: { 2: 1, 3: 3, 4: 3, 5: 3, 6: 2, 8: 2, 9: 3, 10: 3, 11: 2, 12: 1 },
    harbors: { special: 5, generic: 5 },
    extras: [vpTokens(16)],
    victory: points(12),
    source: seafarers(24),
    ruleCount: 4,
    pools: { random: { sea: 19, hills: 4, forest: 5, pasture: 5, fields: 5, mountains: 4 } },
    shape: [{ kind: 'random', size: 42 }],
  },
]

export const VARIANTS: Readonly<Record<VariantId, Variant>> = Object.fromEntries(
  LIST.map((v) => [v.id, v]),
) as Record<VariantId, Variant>

/** The Seafarers rulebook's general rules, which every scenario builds on. */
export const SEAFARERS_GENERAL: Source = { book: 'seafarers', page: 4 }

export const isGroupId = (value: unknown): value is GroupId =>
  typeof value === 'string' && (GROUP_IDS as readonly string[]).includes(value)

export const isVariantId = (value: unknown): value is VariantId =>
  typeof value === 'string' && (VARIANT_IDS as readonly string[]).includes(value)

/** The groups of a game, in the order the app lists them. */
export const groupsOf = (game: Game): GroupId[] =>
  GROUP_IDS.filter((g) => (g.startsWith('base') ? 'base' : 'seafarers') === game)

export const gameOf = (group: GroupId): Game => (group.startsWith('base') ? 'base' : 'seafarers')

/** Whether the rules print separate 3- and 4-player layouts for this group. */
export const hasSeats = (group: GroupId): boolean =>
  LIST.some((v) => v.group === group && v.seats !== null)

/** The concrete layout for a group and player count, as v1 resolved it. */
export function resolveVariant(group: GroupId, seats: Seats): Variant {
  if (isVariantId(group)) return VARIANTS[group]
  const exact = `${group}_${seats}`
  if (isVariantId(exact)) return VARIANTS[exact]
  const other = `${group}_${seats === 3 ? 4 : 3}`
  if (isVariantId(other)) return VARIANTS[other]
  throw new Error(`No layout for ${group}`)
}

/** The variants of a group (one, or the 3- and 4-player layouts). */
export const variantsOf = (group: GroupId): Variant[] => LIST.filter((v) => v.group === group)

/** Total of a count table. */
export const total = (counts: Readonly<Record<string | number, number | undefined>>): number =>
  Object.values(counts).reduce<number>((sum, n) => sum + (n ?? 0), 0)

/** Dots on a number token: how many of the 36 two-dice rolls make it. */
export const pips = (n: number): number => 6 - Math.abs(7 - n)
