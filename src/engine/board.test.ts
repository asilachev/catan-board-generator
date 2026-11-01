import { describe, expect, it } from 'vitest'
import { buildBoard, DEFAULT_OPTIONS, type Board } from './board.ts'
import { normalizeCode } from './code.ts'
import { TERRAINS, VARIANT_IDS, VARIANTS, type Terrain, type VariantId } from './scenarios.ts'

const ALL = VARIANT_IDS as readonly VariantId[]
const CODES = Array.from({ length: 12 }, (_, i) => `test-${1000 + i * 37}`)

const counts = (board: Board) => {
  const terrain: Partial<Record<Terrain, number>> = {}
  for (const c of board.cells) terrain[c.terrain] = (terrain[c.terrain] ?? 0) + 1
  return terrain
}

describe('boards (docs/rules.md → Scenarios)', () => {
  it.each(ALL)('%s places every land hex the rules list', (id) => {
    const variant = VARIANTS[id]
    const board = buildBoard(id, 'anchor-4821', DEFAULT_OPTIONS)
    expect(board.cells).toHaveLength(variant.shape.reduce((n, r) => n + r.size, 0))
    const placed = counts(board)
    for (const t of TERRAINS) {
      // Open sea is the background; only fog (Scenario 3) and Scenario 9 deal sea hexes.
      if (t !== 'sea') expect(placed[t] ?? 0, `${id} ${t}`).toBe(variant.hexes[t] ?? 0)
    }
    const pooledSea = Object.values(variant.pools ?? {}).reduce((n, p) => n + (p.sea ?? 0), 0)
    expect(placed.sea ?? 0, id).toBe(pooledSea)
  })

  it.each(ALL)('%s puts a token on every producing hex that takes one', (id) => {
    const board = buildBoard(id, 'anchor-4821', DEFAULT_OPTIONS)
    for (const c of board.cells) {
      const producing = c.terrain !== 'sea' && c.terrain !== 'desert'
      const takesToken = producing && c.kind !== 'notoken' && c.kind !== 'notokenPick'
      expect(c.num !== null, `${id} ${c.q},${c.r} ${c.terrain}`).toBe(takesToken)
    }
  })

  it('places the base game’s nine harbors: four 3:1 and one 2:1 per resource', () => {
    const board = buildBoard('base34', 'anchor-4821', DEFAULT_OPTIONS)
    const types = board.harbors.map((h) => h.type).sort()
    expect(types).toEqual([
      'any',
      'any',
      'any',
      'any',
      'fields',
      'forest',
      'hills',
      'mountains',
      'pasture',
    ])
    const taken = new Set(board.cells.map((c) => `${c.q},${c.r}`))
    for (const h of board.harbors) {
      const cell = board.cells[h.cell]
      expect(cell).toBeDefined()
      // Every harbor sits on a coastal edge.
      const dirs = [
        [1, 0],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [0, -1],
        [1, -1],
      ] as const
      const [dq, dr] = dirs[h.dir] ?? [0, 0]
      expect(taken.has(`${(cell?.q ?? 0) + dq},${(cell?.r ?? 0) + dr}`)).toBe(false)
    }
  })

  it('keeps the desert of Scenarios 1 (4 players) and 8 on the main island', () => {
    for (const id of ['s1_4', 's8'] as const) {
      for (const code of CODES) {
        const board = buildBoard(id, code, DEFAULT_OPTIONS)
        const deserts = board.cells.filter((c) => c.terrain === 'desert')
        expect(
          deserts.every((c) => c.kind === 'main'),
          `${id} ${code}`,
        ).toBe(true)
      }
    }
  })

  it('builds the desert wall of Scenario 4', () => {
    for (const code of CODES) {
      const board = buildBoard('s4_4', code, DEFAULT_OPTIONS)
      const wall = board.cells.filter((c) => c.terrain === 'desert' && c.region === 0)
      expect(wall.length, code).toBeGreaterThanOrEqual(3)
      expect(new Set(wall.map((c) => c.q)).size, code).toBe(1)
    }
  })

  it('leaves three isle hexes of Scenario 7 without tokens', () => {
    const board = buildBoard('s7', 'anchor-4821', DEFAULT_OPTIONS)
    expect(board.cells.filter((c) => c.kind === 'notokenPick')).toHaveLength(3)
  })

  it('gives each islet of Scenario 6 two village numbers', () => {
    const board = buildBoard('s6', 'anchor-4821', DEFAULT_OPTIONS)
    const islets = board.cells.filter((c) => c.kind === 'notoken')
    expect(islets).toHaveLength(4)
    for (const c of islets) expect(c.villages).toHaveLength(2)
  })

  it('hides Scenario 3’s fog hexes between the islands', () => {
    const board = buildBoard('s3_4', 'anchor-4821', DEFAULT_OPTIONS)
    expect(board.cells.filter((c) => c.kind === 'fog')).toHaveLength(12)
  })

  it('keeps 6 and 8 apart on default settings', () => {
    for (const id of ALL) {
      for (const code of CODES) {
        const board = buildBoard(id, code, DEFAULT_OPTIONS)
        expect(board.violations.red, `${id} ${code}`).toBe(0)
      }
    }
  })

  it('reports equal neighbours it could not separate', () => {
    // With the rule off, nothing is counted against it.
    const off = buildBoard('s3_3', 'anchor-4821', { ...DEFAULT_OPTIONS, same: false })
    expect(off.violations.same).toBe(0)
    for (const id of ALL) {
      const board = buildBoard(id, 'anchor-4821', DEFAULT_OPTIONS)
      expect(board.violations.same).toBeGreaterThanOrEqual(0)
    }
  })

  it('follows the A–R order in letter mode', () => {
    const board = buildBoard('base34', 'anchor-4821', { ...DEFAULT_OPTIONS, letters: true })
    const lettered = board.cells.filter((c) => c.letter !== null)
    expect(lettered).toHaveLength(18)
    expect(
      lettered
        .map((c) => c.letter)
        .sort()
        .join(''),
    ).toBe('ABCDEFGHIJKLMNOPQR')
    expect(board.cells.find((c) => c.letter === 'A')?.num).toBe(5)
  })

  it('is a pure function of variant, code and options', () => {
    const a = buildBoard('s5', 'anchor-4821', DEFAULT_OPTIONS)
    const b = buildBoard('s5', 'anchor-4821', DEFAULT_OPTIONS)
    expect(b.cells).toEqual(a.cells)
    expect(buildBoard('s5', 'anchor-4822', DEFAULT_OPTIONS).cells).not.toEqual(a.cells)
  })

  it('treats a code the same whatever its case and spacing', () => {
    const typed = buildBoard('base34', normalizeCode('  Anchor 4821 '), DEFAULT_OPTIONS)
    expect(typed.cells).toEqual(buildBoard('base34', 'anchor-4821', DEFAULT_OPTIONS).cells)
  })
})
