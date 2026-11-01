import type { Cell, CellKind, DealOptions, Harbor } from './board.ts'
import { AXIAL_DIRECTIONS, axialKey } from './hex.ts'
import { shuffled, type Random } from './rng.ts'
import type { HarborType, Terrain, TerrainCounts, TokenCounts, Variant } from './scenarios.ts'

/**
 * Seafarers boards from the rulebook's printed maps (#7, docs/rules.md → Printed maps).
 *
 * Each scenario's map is transcribed hex by hex from the rulebook: the sea inside the frame, the
 * islands with their printed terrain and numbers, and the harbor spots. A deal keeps every outline
 * and changes only what the scenario's «Варианты раскладки поля» (layout variants) allows: terrain
 * and numbers trade places within groups of islands, harbor types among the printed spots. With
 * the `printed` option the deal is the rulebook's own map, except what its setup leaves to chance
 * (the fog, harbors laid at random).
 */

/** Terrain letters in map rows; an upper-case letter marks a hex that never moves. */
const LETTERS: Readonly<Record<string, Terrain | 'fog'>> = {
  '~': 'sea',
  d: 'desert',
  g: 'gold',
  h: 'hills',
  f: 'forest',
  p: 'pasture',
  w: 'fields',
  m: 'mountains',
  '?': 'fog',
}

export interface PrintedHex {
  /** Column in half-hex widths (doubled coordinates) and row, as on the printed map. */
  readonly x: number
  readonly y: number
  /** `fog`: laid face down from what the map leaves of the scenario's table (Scenario 3). */
  readonly terrain: Terrain | 'fog'
  readonly number: number | null
  /** Hexes of one group trade places with each other. Null: stays as printed. */
  readonly group: string | null
  /** Never moves, whatever its group (the deserts of Scenarios 4 and 8). */
  readonly fixed: boolean
}

/** A harbor spot: the land hex, the direction of the harbor's sea hex (AXIAL_DIRECTIONS), its printed type. */
export type HarborSpot = readonly [x: number, y: number, dir: number, type: HarborType]

/** Scenario 6: a village on a small island's coast, with its printed number and the hex it's drawn on. */
export type VillageSpot = readonly [x: number, y: number, number: number]

export interface PrintedMap {
  /** The rulebook page the map is printed on. */
  readonly page: number
  /**
   * One string per row of hexes. A hex is a token starting at column 3·x of its row: the terrain
   * letter, the printed number, then the shuffle group as a lower-case letter, e.g. `h12a`.
   */
  readonly rows: readonly string[]
  readonly harbors: readonly HarborSpot[]
  /**
   * How harbor types are laid. `setup`: the rulebook's own setup (the `printed` option).
   * `variable`: its layout variants. `group` shuffles types among the spots on one group's coast.
   */
  readonly harborDeal: {
    readonly setup: 'printed' | 'all'
    readonly variable: 'printed' | 'group' | 'all'
  }
  /**
   * Groups dealt from what the map leaves of the scenario's table, always at random: the fog
   * (Scenario 3), the whole new world (Scenario 9).
   */
  readonly fromTable?: readonly string[]
  /** The rulebook's advice for numbers: these terrains or hexes shouldn't get these numbers. */
  readonly avoid?: readonly Avoid[]
  readonly villages?: readonly VillageSpot[]
}

export interface Avoid {
  readonly terrains?: readonly Terrain[]
  /** Hexes by printed position, [x, y]. */
  readonly at?: readonly (readonly [number, number])[]
  readonly numbers: readonly number[]
}

/**
 * Whether the rulebook's own map differs from its layout variants on this map: something moves
 * that isn't always random. Scenario 7 changes nothing but harbors at random, Scenario 9 is all
 * random, so neither offers the choice.
 */
export function offersPrinted(map: PrintedMap): boolean {
  const tabled = new Set(map.fromTable ?? [])
  return (
    parseMap(map.rows).some((h) => h.group !== null && !h.fixed && !tabled.has(h.group)) ||
    map.harborDeal.setup !== map.harborDeal.variable
  )
}

/** Reads a map's rows. Throws on anything that isn't a hex on the grid, so a typo can't move one. */
export function parseMap(rows: readonly string[]): PrintedHex[] {
  const hexes: PrintedHex[] = []
  rows.forEach((row, y) => {
    for (const match of row.matchAll(/\S+/g)) {
      const token = match[0]
      const column = match.index
      const parsed = /^([~?dghfpwmDGHFPWM])(\d{1,2})?([a-z])?$/.exec(token)
      const letter = parsed?.[1]
      const terrain = letter === undefined ? undefined : LETTERS[letter.toLowerCase()]
      if (!parsed || letter === undefined || terrain === undefined)
        throw new Error(`Map row ${y}: "${token}" isn't a hex`)
      if (column % 3 !== 0)
        throw new Error(`Map row ${y}: "${token}" starts at column ${column}, not a multiple of 3`)
      const x = column / 3
      if ((x + y) % 2 !== 0)
        throw new Error(`Map row ${y}: "${token}" (x ${x}) is off the hex grid`)
      const number = parsed[2] === undefined ? null : Number(parsed[2])
      if (number !== null && (number < 2 || number > 12 || number === 7))
        throw new Error(`Map row ${y}: "${token}" has no such number token`)
      hexes.push({
        x,
        y,
        terrain,
        number,
        group: parsed[3] ?? null,
        fixed: letter !== letter.toLowerCase(),
      })
    }
  })
  return hexes
}

/** The hex at a printed position, as an axial coordinate. */
export const axialOf = (x: number, y: number): [number, number] => [(x - y) / 2, y]

/** Terrain per kind on a map, fog and sea included: what the scenario's table should list. */
export function mapTerrain(map: PrintedMap): Record<string, number> {
  const out: Record<string, number> = {}
  for (const h of parseMap(map.rows)) out[h.terrain] = (out[h.terrain] ?? 0) + 1
  return out
}

/** Printed numbers on a map, by value. */
export function mapTokens(map: PrintedMap): Record<number, number> {
  const out: Record<number, number> = {}
  for (const h of parseMap(map.rows))
    if (h.number !== null) out[h.number] = (out[h.number] ?? 0) + 1
  for (const [, , n] of map.villages ?? []) out[n] = (out[n] ?? 0) + 1
  return out
}

const RED = (n: number) => n === 6 || n === 8
const EDGE = (n: number) => n === 2 || n === 12
const STANDARD = [6, 8, 5, 9, 4, 10, 3, 11, 2, 12]

interface Work {
  readonly hex: PrintedHex
  readonly q: number
  readonly r: number
  terrain: Terrain | null
  num: number | null
  readonly adj: number[]
}

/** The table's tiles the map doesn't print elsewhere, in the table's key order. */
function terrainLeft(counts: TerrainCounts, used: readonly Terrain[]): Terrain[] {
  const left = new Map<Terrain, number>()
  for (const [terrain, n] of Object.entries(counts) as [Terrain, number][]) left.set(terrain, n)
  for (const t of used) left.set(t, (left.get(t) ?? 0) - 1)
  const out: Terrain[] = []
  for (const [terrain, n] of left) for (let i = 0; i < n; i++) out.push(terrain)
  return out
}

/** The table's number tokens the map doesn't print elsewhere, smallest first. */
function tokensLeft(counts: TokenCounts, used: readonly number[]): number[] {
  const left = new Map<number, number>()
  for (const key of Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b))
    left.set(key, counts[key] ?? 0)
  for (const n of used) left.set(n, (left.get(n) ?? 0) - 1)
  const out: number[] = []
  for (const [n, k] of left) for (let i = 0; i < k; i++) out.push(n)
  return out
}

/** Random swaps between places of the same group that never raise the cost. */
function climb<T>(
  start: readonly T[],
  groups: readonly string[],
  cost: (values: readonly T[]) => number,
  random: Random,
  iterations: number,
): T[] {
  let current = [...start]
  let currentCost = cost(current)
  for (let it = 0; it < iterations && currentCost > 0; it++) {
    const i = Math.floor(random() * current.length)
    const j = Math.floor(random() * current.length)
    if (i === j || groups[i] !== groups[j] || current[i] === current[j]) continue
    const next = [...current]
    next[i] = current[j] as T
    next[j] = current[i] as T
    const nextCost = cost(next)
    if (nextCost <= currentCost) {
      current = next
      currentCost = nextCost
    }
  }
  return current
}

export interface PrintedDeal {
  readonly cells: Cell[]
  readonly harbors: Harbor[]
  readonly leftover: number[]
  /** Per cell: whether the deal chose its number (printed numbers that stay are false). */
  readonly dealt: boolean[]
}

/** Deals a printed map: the outlines as printed, the rest as the scenario allows. */
export function dealPrinted(
  variant: Variant,
  map: PrintedMap,
  options: DealOptions,
  random: Random,
): PrintedDeal {
  const hexes = parseMap(map.rows)
  const fromTable = new Set(map.fromTable ?? [])
  const moves = (h: PrintedHex) =>
    h.group !== null && !h.fixed && (!options.printed || fromTable.has(h.group))
  const tabled = (h: PrintedHex) => h.group !== null && fromTable.has(h.group)

  const work: Work[] = hexes.map((hex) => {
    const [q, r] = axialOf(hex.x, hex.y)
    return { hex, q, r, terrain: hex.terrain === 'fog' ? null : hex.terrain, num: null, adj: [] }
  })
  const at = new Map(work.map((w, i) => [axialKey(w.q, w.r), i]))
  for (const w of work)
    for (const [dq, dr] of AXIAL_DIRECTIONS) {
      const j = at.get(axialKey(w.q + dq, w.r + dr))
      if (j !== undefined) w.adj.push(j)
    }
  const cell = (i: number) => work[i] as Work
  const groupsInOrder = [...new Set(hexes.filter(moves).map((h) => h.group as string))]
  const membersOf = (g: string) =>
    work.flatMap((w, i) => (moves(w.hex) && w.hex.group === g ? [i] : []))

  // Terrain, group by group in the order the map first shows them.
  for (const g of groupsInOrder) {
    const members = membersOf(g)
    let deal: Terrain[] = fromTable.has(g)
      ? terrainLeft(
          variant.hexes,
          hexes.filter((h) => !tabled(h) && h.terrain !== 'fog').map((h) => h.terrain as Terrain),
        )
      : members.map((i) => cell(i).hex.terrain as Terrain)
    deal = shuffled(deal, random)
    while (deal.length < members.length) deal.push('sea')
    deal = deal.slice(0, members.length)
    if (options.spread && members.length > 3) {
      const position = new Map(members.map((ci, k) => [ci, k]))
      const pairs: [number, number][] = []
      members.forEach((ci, k) => {
        for (const nb of cell(ci).adj) {
          const o = position.get(nb)
          if (o !== undefined && o > k) pairs.push([k, o])
        }
      })
      deal = climb(
        deal,
        members.map(() => g),
        (a) => pairs.reduce((n, [x, y]) => (a[x] === a[y] && a[x] !== 'sea' ? n + 1 : n), 0),
        random,
        4000,
      )
    }
    members.forEach((ci, k) => {
      cell(ci).terrain = deal[k] ?? 'sea'
    })
  }

  // Numbers: what stays keeps its printed number; each group deals its own printed numbers.
  const numbered = (w: Work) => w.terrain !== null && w.terrain !== 'sea' && w.terrain !== 'desert'
  work.forEach((w) => {
    if (!moves(w.hex) && numbered(w)) w.num = w.hex.number
  })
  const leftover: number[] = []
  const slots: number[] = []
  const slotGroups: string[] = []
  let values: number[] = []
  for (const g of groupsInOrder) {
    const members = membersOf(g)
    let pool = fromTable.has(g)
      ? tokensLeft(variant.tokens, [
          ...hexes.filter((h) => !tabled(h) && h.number !== null).map((h) => h.number as number),
          ...(map.villages ?? []).map(([, , n]) => n),
        ])
      : members.flatMap((i) => (cell(i).hex.number === null ? [] : [cell(i).hex.number as number]))
    pool = shuffled(pool, random)
    // A group printed without numbers stays without (Scenario 5's small islands).
    const open = pool.length === 0 ? [] : members.filter((i) => numbered(cell(i)))
    for (let k = 0; pool.length < open.length; k++)
      pool.push(STANDARD[k % STANDARD.length] as number)
    open.forEach((ci, k) => {
      slots.push(ci)
      slotGroups.push(g)
      values.push(pool[k] as number)
    })
    leftover.push(...pool.slice(open.length))
  }

  // Then the placement rules, swapping only within a group.
  const slotOf = new Map(slots.map((ci, k) => [ci, k]))
  const numberAt = (a: readonly number[], ci: number) => {
    const k = slotOf.get(ci)
    return k === undefined ? cell(ci).num : (a[k] as number)
  }
  const pairs: [number, number][] = []
  work.forEach((w, i) => {
    for (const j of w.adj) if (j > i && numbered(w) && numbered(cell(j))) pairs.push([i, j])
  })
  const avoided = (ci: number, n: number) =>
    (map.avoid ?? []).some(
      (rule) =>
        rule.numbers.includes(n) &&
        ((rule.terrains?.includes(cell(ci).terrain as Terrain) ?? false) ||
          (rule.at?.some(([x, y]) => x === cell(ci).hex.x && y === cell(ci).hex.y) ?? false)),
    )
  const cost = (a: readonly number[]) => {
    let total = 0
    for (const [i, j] of pairs) {
      const n = numberAt(a, i)
      const m = numberAt(a, j)
      if (n === null || m === null) continue
      if (options.red && RED(n) && RED(m)) total += 6
      if (options.same && n === m) total += 3
      if (options.same && EDGE(n) && EDGE(m)) total += 1
    }
    slots.forEach((ci, k) => {
      const n = a[k] as number
      const c = cell(ci)
      if (variant.noRedOnGold && RED(n) && c.terrain === 'gold') total += 6
      if (variant.noRedNearDesert && RED(n) && c.adj.some((j) => cell(j).terrain === 'desert'))
        total += 4
      if (avoided(ci, n)) total += 2
    })
    return total
  }
  if (slots.length > 1) values = climb(values, slotGroups, cost, random, 15000)
  slots.forEach((ci, k) => {
    cell(ci).num = values[k] ?? null
  })

  // Harbors: printed spots; their types as the setup or the layout variants say.
  const mode = options.printed ? map.harborDeal.setup : map.harborDeal.variable
  const spots = map.harbors.flatMap(([x, y, dir, type]) => {
    const [q, r] = axialOf(x, y)
    const i = at.get(axialKey(q, r))
    return i === undefined ? [] : [{ i, dir, type, group: cell(i).hex.group ?? '' }]
  })
  const types = spots.map((s) => s.type)
  if (mode !== 'printed') {
    const pools = new Map<string, number[]>()
    spots.forEach((s, k) => {
      const key = mode === 'all' ? '' : s.group
      if (mode === 'group' && key === '') return
      const list = pools.get(key)
      if (list) list.push(k)
      else pools.set(key, [k])
    })
    for (const members of pools.values()) {
      const dealt = shuffled(
        members.map((k) => types[k] as HarborType),
        random,
      )
      members.forEach((k, n) => {
        types[k] = dealt[n] as HarborType
      })
    }
  }
  const harbors: Harbor[] = spots.map((s, k) => ({
    cell: s.i,
    dir: s.dir,
    type: types[k] as HarborType,
  }))

  // Islands as dealt (Scenario 9 deals sea too), for the cells' kind: the biggest is the main
  // island. Fog lies face down, so it isn't land yet.
  const land = (w: Work) => w.hex.terrain !== 'fog' && w.terrain !== null && w.terrain !== 'sea'
  const island = new Array<number>(work.length).fill(-1)
  const sizes: number[] = []
  work.forEach((w, i) => {
    if (island[i] !== -1 || !land(w)) return
    const id = sizes.length
    const stack = [i]
    island[i] = id
    let size = 0
    while (stack.length > 0) {
      const c = stack.pop() as number
      size++
      for (const j of cell(c).adj) {
        if (island[j] === -1 && land(cell(j))) {
          island[j] = id
          stack.push(j)
        }
      }
    }
    sizes.push(size)
  })
  const main = sizes.indexOf(Math.max(...sizes))
  const villages = new Map<number, number[]>()
  for (const [x, y, n] of map.villages ?? []) {
    const [q, r] = axialOf(x, y)
    const i = at.get(axialKey(q, r))
    if (i !== undefined) villages.set(i, [...(villages.get(i) ?? []), n])
  }

  const cells: Cell[] = work.map((w, i) => {
    const kind: CellKind =
      w.hex.terrain === 'fog' ? 'fog' : !land(w) ? 'sea' : island[i] === main ? 'main' : 'isle'
    return {
      q: w.q,
      r: w.r,
      kind,
      region: island[i] ?? -1,
      terrain: w.terrain ?? 'sea',
      num: w.num,
      letter: null,
      villages: villages.get(i) ?? null,
      adj: w.adj,
    }
  })
  const dealt = work.map((_, i) => slotOf.has(i))
  return { cells, harbors, leftover, dealt }
}
