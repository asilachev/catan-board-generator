import { describe, expect, it } from 'vitest'
import { buildBoard, DEFAULT_OPTIONS, type Board, type DealOptions } from './board.ts'
import { AXIAL_DIRECTIONS, axialKey } from './hex.ts'
import { PRINTED_MAPS } from './maps.ts'
import {
  axialOf,
  dealPrinted,
  mapTerrain,
  mapTokens,
  parseMap,
  type PrintedMap,
} from './printed.ts'
import { hashSeed, mulberry32 } from './rng.ts'
import { RESOURCES, VARIANTS, type Terrain, type Variant, type VariantId } from './scenarios.ts'

/** A small map: island a (shuffled, a fixed desert), island b (as printed), harbors on both. */
const MAP: PrintedMap = {
  page: 0,
  rows: [
    '~     ~     ~     ~     ~',
    '   h6a   p5a   ~     m4    ~',
    '~     w8a   Da    ~     g10   ~',
    '   f9a   h3a   w11a  ~     ~',
    '~     ~     ~     ~     ~',
  ],
  harbors: [
    [1, 1, 4, 'hills'],
    [3, 1, 5, 'any'],
    [7, 1, 5, 'mountains'],
    [8, 2, 0, 'any'],
  ],
  harborDeal: { setup: 'printed', variable: 'group' },
}
const VARIANT: Variant = { ...VARIANTS.s2_3, noRedOnGold: false, noRedNearDesert: false }
const deal = (options: Partial<DealOptions> = {}, seed = 'anchor-4821') =>
  dealPrinted(VARIANT, MAP, { ...DEFAULT_OPTIONS, ...options }, mulberry32(hashSeed(seed)))
const at = (cells: { q: number; r: number }[], x: number, y: number) => {
  const [q, r] = axialOf(x, y)
  return cells.findIndex((c) => c.q === q && c.r === r)
}

describe('printed map rows', () => {
  it('reads terrain, number, group and fixed hexes at their printed places', () => {
    const hexes = parseMap(MAP.rows)
    expect(hexes).toHaveLength(26)
    expect(hexes.find((h) => h.x === 1 && h.y === 1)).toEqual({
      x: 1,
      y: 1,
      terrain: 'hills',
      number: 6,
      group: 'a',
      fixed: false,
    })
    expect(hexes.find((h) => h.x === 4 && h.y === 2)).toMatchObject({
      terrain: 'desert',
      fixed: true,
    })
    expect(hexes.find((h) => h.x === 7 && h.y === 1)).toMatchObject({ number: 4, group: null })
  })

  it('refuses tokens off the hex grid or that are no hex', () => {
    expect(() => parseMap(['  ~'])).toThrow(/column 2/)
    expect(() => parseMap(['   ~'])).toThrow(/off the hex grid/)
    expect(() => parseMap(['x'])).toThrow(/isn't a hex/)
    expect(() => parseMap(['h7'])).toThrow(/no such number/)
  })
})

describe('dealing a printed map', () => {
  const printed = parseMap(MAP.rows)

  it('as printed, is the rulebook’s map', () => {
    const { cells, harbors } = deal({ printed: true })
    for (const h of printed) {
      const c = cells[at(cells, h.x, h.y)]
      expect(c?.terrain).toBe(h.terrain)
      expect(c?.num).toBe(h.terrain === 'desert' || h.terrain === 'sea' ? null : h.number)
    }
    expect(harbors.map((h) => h.type)).toEqual(['hills', 'any', 'mountains', 'any'])
  })

  it('keeps every outline, the fixed hexes and what isn’t in a group', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const { cells } = deal({}, seed)
      for (const h of printed) {
        const c = cells[at(cells, h.x, h.y)]
        expect(c).toBeDefined()
        if (h.group === null || h.fixed) {
          expect(c?.terrain).toBe(h.terrain)
          if (h.terrain !== 'desert') expect(c?.num).toBe(h.number)
        }
      }
    }
  })

  it('shuffles a group’s own terrain and numbers among its hexes', () => {
    const group = printed.filter((h) => h.group === 'a' && !h.fixed)
    const tally = <T>(xs: T[]) => [...xs].map(String).sort()
    const boards = ['a', 'b', 'c', 'd', 'e'].map((seed) => deal({}, seed))
    for (const { cells } of boards) {
      const dealt = group.map((h) => cells[at(cells, h.x, h.y)])
      expect(tally(dealt.map((c) => c?.terrain))).toEqual(tally(group.map((h) => h.terrain)))
      expect(tally(dealt.flatMap((c) => (c?.num == null ? [] : [c.num])))).toEqual(
        tally(group.flatMap((h) => (h.number === null ? [] : [h.number]))),
      )
    }
    // And it really moves them.
    const layouts = new Set(
      boards.map(({ cells }) => group.map((h) => cells[at(cells, h.x, h.y)]?.terrain).join()),
    )
    expect(layouts.size).toBeGreaterThan(1)
  })

  it('shuffles harbor types only along one group’s coast', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const { harbors } = deal({}, seed)
      expect(
        harbors
          .slice(0, 2)
          .map((h) => h.type)
          .sort(),
      ).toEqual(['any', 'hills'])
      expect(harbors.slice(2).map((h) => h.type)).toEqual(['mountains', 'any'])
    }
  })

  it('leaves a group printed without numbers without them', () => {
    const map: PrintedMap = {
      ...MAP,
      rows: [...MAP.rows.slice(0, 4), '~     fb    pb    ~     ~'],
      harbors: [],
    }
    for (const seed of ['a', 'b', 'c']) {
      const { cells } = dealPrinted(VARIANT, map, DEFAULT_OPTIONS, mulberry32(hashSeed(seed)))
      expect([at(cells, 2, 4), at(cells, 4, 4)].map((i) => cells[i]?.num)).toEqual([null, null])
      expect(cells.filter((c) => c.num !== null)).toHaveLength(8)
    }
  })

  it('tells sea from land as dealt, when the table deals the sea too', () => {
    const map: PrintedMap = {
      page: 0,
      rows: ['~a    ~a    ~a', '   ~a    ~a    ~a', '~a    ~a    ~a'],
      harbors: [],
      harborDeal: { setup: 'all', variable: 'all' },
      fromTable: ['a'],
    }
    const variant: Variant = {
      ...VARIANT,
      hexes: { sea: 4, hills: 2, forest: 2 },
      tokens: { 4: 1, 5: 1, 9: 1, 10: 1 },
    }
    const { cells } = dealPrinted(variant, map, DEFAULT_OPTIONS, mulberry32(hashSeed('a')))
    for (const c of cells) expect(c.kind === 'sea').toBe(c.terrain === 'sea')
    expect(cells.filter((c) => c.kind !== 'sea')).toHaveLength(4)
    expect(cells.filter((c) => c.num !== null)).toHaveLength(4)
  })

  it('keeps 6 and 8 apart when it can', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const { cells } = deal({}, seed)
      for (const c of cells)
        if (c.num === 6 || c.num === 8)
          for (const j of c.adj) expect([6, 8]).not.toContain(cells[j]?.num)
    }
  })
})

// ---- The transcribed maps ------------------------------------------------------------------------

const MAPS = Object.entries(PRINTED_MAPS) as [VariantId, PrintedMap][]
const land = (t: string) => t !== 'sea' && t !== 'fog'

describe.runIf(MAPS.length > 0)('the rulebook’s maps (docs/rules.md → Printed maps)', () => {
  it.each(MAPS)('%s puts the table’s tiles and tokens on the map', (id, map) => {
    const variant = VARIANTS[id]
    const terrain = mapTerrain(map)
    const fog = terrain.fog ?? 0
    const tabled = new Set(map.fromTable ?? [])
    const fromTable = parseMap(map.rows).filter((h) => h.group !== null && tabled.has(h.group))
    if (fromTable.length === 0) {
      // Every tile of the table is printed, sea included.
      const printed: Record<string, number> = { ...terrain }
      delete printed.fog
      expect(printed).toEqual(
        Object.fromEntries(Object.entries(variant.hexes).filter(([, n]) => n > 0)),
      )
      expect(mapTokens(map)).toEqual(variant.tokens)
    } else {
      // The fog or the new world takes what the map leaves of the table.
      const total = Object.values(variant.hexes).reduce((s, n) => s + n, 0)
      expect(parseMap(map.rows).length).toBe(total)
      expect(fog + fromTable.filter((h) => h.terrain !== 'fog').length).toBe(fromTable.length)
    }
  })

  it.each(MAPS)('%s gives each group as many numbers as it has numbered hexes', (_id, map) => {
    const groups = new Map<string, { numbers: number; hexes: number }>()
    for (const h of parseMap(map.rows)) {
      if (
        h.group === null ||
        h.fixed ||
        h.terrain === 'fog' ||
        (map.fromTable ?? []).includes(h.group)
      )
        continue
      const g = groups.get(h.group) ?? { numbers: 0, hexes: 0 }
      if (h.number !== null) g.numbers++
      if (land(h.terrain) && h.terrain !== 'desert') g.hexes++
      groups.set(h.group, g)
    }
    // Or none at all: Scenario 5's small islands have no numbers.
    for (const [group, g] of groups) expect([0, g.hexes], `group ${group}`).toContain(g.numbers)
    // A printed number sits on land that produces.
    for (const h of parseMap(map.rows))
      if (h.number !== null) expect(['sea', 'desert', 'fog']).not.toContain(h.terrain)
  })

  it.each(MAPS)('%s puts its harbors on the coast, facing the sea', (id, map) => {
    const variant = VARIANTS[id]
    // Scenario 9's players place their own harbors, so its map has none.
    const types = map.harbors.map(([, , , type]) => type)
    if (id === 's9') expect(types).toEqual([])
    else {
      expect(types.filter((t) => t === 'any')).toHaveLength(variant.harbors.generic)
      // The special harbors are one per resource.
      expect(types.filter((t) => t !== 'any').sort()).toEqual([...RESOURCES].sort())
    }
    const hexes = new Map(parseMap(map.rows).map((h) => [axialKey(...axialOf(h.x, h.y)), h]))
    for (const [x, y, dir] of map.harbors) {
      const [q, r] = axialOf(x, y)
      const [dq, dr] = AXIAL_DIRECTIONS[dir] ?? [0, 0]
      expect(land(hexes.get(axialKey(q, r))?.terrain ?? 'sea'), `harbor at ${x},${y}`).toBe(true)
      expect(hexes.get(axialKey(q + dq, r + dr))?.terrain ?? 'sea', `harbor at ${x},${y}`).toBe(
        'sea',
      )
    }
  })

  it.each(MAPS)('%s as printed is the rulebook’s map', (id, map) => {
    const board: Board = buildBoard(id, 'anchor-4821', { ...DEFAULT_OPTIONS, printed: true })
    const tabled = new Set(map.fromTable ?? [])
    for (const h of parseMap(map.rows)) {
      if (h.terrain === 'fog' || (h.group !== null && tabled.has(h.group))) continue
      const [q, r] = axialOf(h.x, h.y)
      const c = board.cells.find((cell) => cell.q === q && cell.r === r)
      expect(c?.terrain as Terrain).toBe(h.terrain)
      expect(c?.num ?? null).toBe(h.number)
    }
  })

  it('calls both of Scenario 6’s main islands main', () => {
    const board = buildBoard('s6', 'anchor-4821', { ...DEFAULT_OPTIONS, printed: true })
    expect(board.cells.filter((c) => c.kind === 'main')).toHaveLength(20)
    expect(board.printedMap).toBe(true)
  })

  it.each(MAPS)('%s keeps its outline in every deal', (id, map) => {
    const outline = parseMap(map.rows)
      .map((h) => axialKey(...axialOf(h.x, h.y)))
      .sort()
    for (const code of ['anchor-4821', 'surf-3170', 'якорь-1000']) {
      const board = buildBoard(id, code, DEFAULT_OPTIONS)
      expect(board.cells.map((c) => axialKey(c.q, c.r)).sort()).toEqual(outline)
    }
  })
})
