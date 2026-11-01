import {
  AXIAL_DIRECTIONS,
  axialDistance,
  axialFromPolar,
  axialKey,
  growIsland,
  type Axial,
} from './hex.ts'
import { hashSeed, mulberry32, shuffled, type Random } from './rng.ts'
import {
  VARIANTS,
  type HarborType,
  type PoolKey,
  type RegionKind,
  type Terrain,
  type TerrainCounts,
  type TokenCounts,
  type Variant,
  type VariantId,
} from './scenarios.ts'

/**
 * Board generation. A board is a pure function of (variant, code, options): the same inputs
 * always deal the same tiles, tokens and harbors, on any device and in any language
 * (docs/design.md → Determinism). This is v1's algorithm, ported step by step; the order of
 * random draws is part of the contract, and v1.test.ts checks it against the original file.
 */

/** The token placement rules the player can switch (Setup → Token placement). */
export interface DealOptions {
  /** 6 and 8 never on neighbouring hexes. */
  readonly red: boolean
  /** Equal numbers (and 2 next to 12) never side by side. */
  readonly same: boolean
  /** Fewer clusters of the same terrain. */
  readonly spread: boolean
  /** The base game's A–R token order, where the scenario offers it. */
  readonly letters: boolean
}

export const DEFAULT_OPTIONS: DealOptions = { red: true, same: true, spread: true, letters: false }

/** `notokenPick` marks isle hexes that lost their token (Scenario 7). */
export type CellKind = RegionKind | 'notokenPick'

export interface Cell {
  readonly q: number
  readonly r: number
  readonly kind: CellKind
  /** Index into the variant's `shape`. */
  readonly region: number
  readonly terrain: Terrain
  readonly num: number | null
  /** A–R in letter mode. */
  readonly letter: string | null
  /** Scenario 6: the two numbers of an islet's villages. */
  readonly villages: readonly number[] | null
  /** Indexes of neighbouring cells. */
  readonly adj: readonly number[]
}

export interface Harbor {
  readonly cell: number
  /** The coastal edge it sits on: an index into AXIAL_DIRECTIONS. */
  readonly dir: number
  readonly type: HarborType
}

/** Pairs of neighbouring hexes that still break a rule after dealing. */
export interface Violations {
  /** 6 or 8 next to 6 or 8 (including the scenario's own red-number rules). */
  readonly red: number
  /** Equal numbers side by side. */
  readonly same: number
}

export interface Board {
  readonly variant: Variant
  readonly code: string
  readonly options: DealOptions
  readonly cells: readonly Cell[]
  readonly harbors: readonly Harbor[]
  /** Tokens left in the box (villages took theirs). */
  readonly leftover: readonly number[]
  readonly violations: Violations
}

/** Mutable working copy while dealing. */
interface Work {
  q: number
  r: number
  kind: CellKind
  region: number
  terrain: Terrain | null
  num: number | null
  letter: string | null
  villages: number[] | null
  adj: number[]
}

const RED = (n: number) => n === 6 || n === 8
const EDGE = (n: number) => n === 2 || n === 12
const LETTER_NUMBERS = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11]

/** The cells of a variant's shape, before anything is dealt. */
export function buildLayout(variant: Variant): Work[] {
  const occupied = new Set<string>()
  const cells: Work[] = []
  variant.shape.forEach((region, index) => {
    const center: Axial = region.at ? axialFromPolar(region.at[0], region.at[1]) : [0, 0]
    for (const [q, r] of growIsland(region.size, center, occupied, region.touch === true)) {
      cells.push({
        q,
        r,
        kind: region.kind,
        region: index,
        terrain: null,
        num: null,
        letter: null,
        villages: null,
        adj: [],
      })
      occupied.add(axialKey(q, r))
    }
  })
  const lookup = new Map(cells.map((c, i) => [axialKey(c.q, c.r), i]))
  for (const cell of cells) {
    for (const [dq, dr] of AXIAL_DIRECTIONS) {
      const j = lookup.get(axialKey(cell.q + dq, cell.r + dr))
      if (j !== undefined) cell.adj.push(j)
    }
  }
  return cells
}

/** The tiles of a count table, in the table's key order. */
function tilePool(counts: TerrainCounts): Terrain[] {
  const out: Terrain[] = []
  for (const [terrain, n] of Object.entries(counts) as [Terrain, number][]) {
    for (let i = 0; i < n; i++) out.push(terrain)
  }
  return out
}

/** The tokens of a count table, smallest number first (v1's object-key order). */
function tokenBag(counts: TokenCounts): number[] {
  const out: number[] = []
  for (const n of Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b)) {
    for (let i = 0; i < (counts[n] ?? 0); i++) out.push(n)
  }
  return out
}

/** Spare tokens when a pool runs short: the standard order 6, 8, 5, 9, 4, 10, … */
function standardTokens(n: number): number[] {
  const cycle = [6, 8, 5, 9, 4, 10, 3, 11, 2, 12]
  return Array.from({ length: n }, (_, i) => cycle[i % cycle.length] as number)
}

function poolFor(kind: CellKind): PoolKey {
  if (kind === 'fog' || kind === 'notoken' || kind === 'random') return kind
  return 'land'
}

/** Neighbouring pairs among `indexes`, as positions in that list. */
function localPairs(indexes: readonly number[], cells: readonly Work[]): [number, number][] {
  const position = new Map(indexes.map((ci, k) => [ci, k]))
  const pairs: [number, number][] = []
  indexes.forEach((ci, k) => {
    for (const nb of (cells[ci] as Work).adj) {
      const o = position.get(nb)
      if (o !== undefined && o > k) pairs.push([k, o])
    }
  })
  return pairs
}

/** Random swaps that never raise the cost, until it reaches 0 or the iterations run out. */
function hillClimb<T>(
  start: readonly T[],
  cost: (a: readonly T[]) => number,
  random: Random,
  iterations: number,
): T[] {
  let current = [...start]
  let currentCost = cost(current)
  for (let it = 0; it < iterations && currentCost > 0; it++) {
    const i = Math.floor(random() * current.length)
    const j = Math.floor(random() * current.length)
    if (i === j || current[i] === current[j]) continue
    const next = [...current]
    const tmp = next[i] as T
    next[i] = next[j] as T
    next[j] = tmp
    const nextCost = cost(next)
    if (nextCost <= currentCost) {
      current = next
      currentCost = nextCost
    }
  }
  return current
}

const indexes = (cells: readonly Work[], keep: (c: Work) => boolean): number[] =>
  cells.flatMap((c, i) => (keep(c) ? [i] : []))

function swapTerrain(cells: Work[], a: number, b: number): void {
  const ca = cells[a] as Work
  const cb = cells[b] as Work
  const tmp = ca.terrain
  ca.terrain = cb.terrain
  cb.terrain = tmp
}

/** Deals the board for a variant and a code. */
export function buildBoard(variantId: VariantId, code: string, options: DealOptions): Board {
  const variant = VARIANTS[variantId]
  const random = mulberry32(hashSeed(`${variantId}#${code}`))
  const cells = buildLayout(variant)
  const pools = variant.pools ?? { land: variant.hexes }
  const cell = (i: number) => cells[i] as Work

  // Terrain, pool by pool in the order the regions first use them.
  const byPool = new Map<PoolKey, number[]>()
  cells.forEach((c, i) => {
    const key = poolFor(c.kind)
    const list = byPool.get(key)
    if (list) list.push(i)
    else byPool.set(key, [i])
  })
  for (const [key, members] of byPool) {
    const counts = pools[key] ?? pools.land ?? {}
    let deal = shuffled(tilePool(counts), random)
    while (deal.length < members.length) deal.push('pasture')
    deal = deal.slice(0, members.length)
    if (options.spread && members.length > 3) {
      const pairs = localPairs(members, cells)
      deal = hillClimb(
        deal,
        (a) => pairs.reduce((n, [x, y]) => (a[x] === a[y] ? n + 1 : n), 0),
        random,
        4000,
      )
    }
    members.forEach((ci, k) => {
      cell(ci).terrain = deal[k] ?? null
    })
  }

  // The desert stays on the main island, where the robber starts.
  if (variant.desertOnMain) {
    const main = indexes(cells, (c) => c.kind === 'main')
    const stray = indexes(cells, (c) => c.terrain === 'desert' && c.kind !== 'main')
    const freeMain = shuffled(
      main.filter((i) => cell(i).terrain !== 'desert'),
      random,
    )
    stray.forEach((s, k) => {
      const f = freeMain[k]
      if (f !== undefined) swapTerrain(cells, f, s)
    })
  }

  // Scenario 4: a wall of deserts across the main island.
  if (variant.desertWall) {
    const wallSize = variant.desertWall
    const columns = new Map<number, number[]>()
    for (const i of indexes(cells, (c) => c.region === 0)) {
      const q = cell(i).q
      const list = columns.get(q)
      if (list) list.push(i)
      else columns.set(q, [i])
    }
    let pick: number | null = null
    for (const q of [...columns.keys()].sort((a, b) => a - b)) {
      if (
        (columns.get(q)?.length ?? 0) >= wallSize &&
        (pick === null || Math.abs(q) < Math.abs(pick))
      )
        pick = q
    }
    if (pick !== null) {
      const column = [...(columns.get(pick) ?? [])].sort((a, b) => cell(a).r - cell(b).r)
      const wall: number[] = []
      for (let k = 0; k < wallSize && k < column.length; k++) {
        wall.push(column[Math.floor((k * column.length) / wallSize)] as number)
      }
      for (const w of wall) {
        if (cell(w).terrain === 'desert') continue
        const d = cells.findIndex((c, i) => c.terrain === 'desert' && !wall.includes(i))
        if (d >= 0) swapTerrain(cells, w, d)
      }
    }
  }

  // Gold fields prefer the small isles.
  const isles = indexes(cells, (c) => c.kind === 'isle')
  if (isles.length > 0) {
    const golds = indexes(cells, (c) => c.terrain === 'gold' && c.kind !== 'isle')
    const free = shuffled(
      isles.filter((i) => cell(i).terrain !== 'gold'),
      random,
    )
    golds.forEach((g, k) => {
      const f = free[k]
      if (f !== undefined) swapTerrain(cells, f, g)
    })
  }

  // Scenario 7: some isle hexes get no token.
  if (variant.noTokenIsles) {
    const candidates = shuffled(
      indexes(cells, (c) => c.kind === 'isle' && c.terrain !== 'desert' && c.terrain !== 'gold'),
      random,
    )
    for (const i of candidates.slice(0, variant.noTokenIsles)) cell(i).kind = 'notokenPick'
  }

  // Number tokens.
  const needs = indexes(
    cells,
    (c) =>
      c.kind !== 'notoken' &&
      c.kind !== 'notokenPick' &&
      c.terrain !== null &&
      c.terrain !== 'sea' &&
      c.terrain !== 'desert',
  )
  let bag = tokenBag(variant.tokens)
  if (bag.length < needs.length) bag = bag.concat(standardTokens(needs.length - bag.length))
  bag = shuffled(bag, random)
  let numbers = bag.slice(0, needs.length)
  const leftover = bag.slice(needs.length)

  const pairs = localPairs(needs, cells)
  const onGold = needs.map((i) => cell(i).terrain === 'gold')
  const nearDesert = needs.map((i) => cell(i).adj.some((j) => cell(j).terrain === 'desert'))
  const scenarioRed = (a: readonly number[]) => {
    let cost = 0
    if (variant.noRedOnGold) a.forEach((n, k) => (cost += onGold[k] && RED(n) ? 6 : 0))
    if (variant.noRedNearDesert) a.forEach((n, k) => (cost += nearDesert[k] && RED(n) ? 4 : 0))
    return cost
  }
  numbers = hillClimb(
    numbers,
    (a) => {
      let cost = 0
      for (const [x, y] of pairs) {
        const n = a[x] as number
        const m = a[y] as number
        if (options.red && RED(n) && RED(m)) cost += 6
        if (options.same && n === m) cost += 3
        if (options.same && EDGE(n) && EDGE(m)) cost += 1
      }
      return cost + scenarioRed(a)
    },
    random,
    15000,
  )
  needs.forEach((ci, k) => {
    cell(ci).num = numbers[k] ?? null
  })

  // The rulebook's A–R order replaces the dealt numbers (no randomness).
  if (options.letters && variant.letters) {
    const angle = (c: Work) => Math.atan2(1.5 * c.r, Math.sqrt(3) * (c.q + c.r / 2))
    const order = cells
      .map((_, i) => i)
      .sort((a, b) => {
        const ra = axialDistance([cell(a).q, cell(a).r], [0, 0])
        const rb = axialDistance([cell(b).q, cell(b).r], [0, 0])
        if (ra !== rb) return rb - ra
        return angle(cell(a)) - angle(cell(b))
      })
    let k = 0
    for (const i of order) {
      const c = cell(i)
      c.letter = null
      if (c.terrain === 'desert' || c.terrain === 'sea') {
        c.num = null
        continue
      }
      c.num = LETTER_NUMBERS[k % LETTER_NUMBERS.length] ?? null
      c.letter = String.fromCharCode(65 + (k % 18))
      k++
    }
  }

  // Scenario 6: two numbers for each islet's villages, never a pair of equals if avoidable.
  if (variant.villages) {
    const per = variant.villages
    const villages = indexes(cells, (c) => c.kind === 'notoken')
    let source = [...leftover]
    while (source.length < villages.length * per) source.push(standardTokens(1)[0] as number)
    source = shuffled(source, random)
    villages.forEach((i, k) => {
      const pair = source.slice(k * per, (k + 1) * per)
      if (pair.length === 2 && pair[0] === pair[1]) {
        const swap = source.findIndex((v, j) => j >= (k + 1) * per && v !== pair[0])
        if (swap >= 0) {
          const tmp = source[swap] as number
          source[swap] = pair[1] as number
          pair[1] = tmp
        }
      }
      cell(i).villages = pair
    })
  }

  // Base game: harbor types dealt evenly around the coast.
  const harbors: Harbor[] = []
  if (variant.harborTypes) {
    const taken = new Set(cells.map((c) => axialKey(c.q, c.r)))
    const edges: { i: number; d: number; ang: number }[] = []
    cells.forEach((c, i) => {
      AXIAL_DIRECTIONS.forEach(([dq, dr], d) => {
        if (taken.has(axialKey(c.q + dq, c.r + dr))) return
        const px = Math.sqrt(3) * (c.q + c.r / 2) + (Math.sqrt(3) * (dq + dr / 2)) / 2
        const py = 1.5 * c.r + (1.5 * dr) / 2
        edges.push({ i, d, ang: Math.atan2(py, px) })
      })
    })
    edges.sort((a, b) => a.ang - b.ang)
    const types = shuffled(variant.harborTypes, random)
    types.forEach((type, k) => {
      const edge = edges[Math.floor((k * edges.length) / types.length)]
      if (edge) harbors.push({ cell: edge.i, dir: edge.d, type })
    })
  }

  const done: Cell[] = cells.map((c) => ({ ...c, terrain: c.terrain ?? 'pasture' }))
  return {
    variant,
    code,
    options,
    cells: done,
    harbors,
    leftover,
    violations: countViolations(done, options, variant),
  }
}

/** Neighbouring pairs that still break the active rules. */
export function countViolations(
  cells: readonly Cell[],
  options: DealOptions,
  variant: Variant,
): Violations {
  let red = 0
  let same = 0
  cells.forEach((c, i) => {
    if (c.num === null) return
    if (variant.noRedOnGold && c.terrain === 'gold' && RED(c.num)) red++
    if (variant.noRedNearDesert && RED(c.num) && c.adj.some((j) => cells[j]?.terrain === 'desert'))
      red++
    for (const j of c.adj) {
      const other = cells[j]?.num
      if (j < i || other === null || other === undefined) continue
      if (options.red && RED(c.num) && RED(other)) red++
      if (options.same && c.num === other) same++
    }
  })
  return { red, same }
}
