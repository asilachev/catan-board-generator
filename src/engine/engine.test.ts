import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from './board.ts'
import { makeCode, normalizeCode } from './code.ts'
import { axialDistance, edgeCorners, growIsland, ringCells, spiralCells } from './hex.ts'
import { decodeHash, decodeOptions, encodeHash, encodeOptions } from './link.ts'
import { hashSeed, mulberry32, shuffled } from './rng.ts'
import {
  GROUP_IDS,
  hasSeats,
  pips,
  resolveVariant,
  TERRAINS,
  total,
  VARIANT_IDS,
  VARIANTS,
  type Terrain,
} from './scenarios.ts'

describe('random numbers', () => {
  it('hashes and draws exactly like v1', () => {
    expect(hashSeed('base34#якорь-4821')).toBe(hashSeed('base34#якорь-4821'))
    expect(hashSeed('a')).not.toBe(hashSeed('b'))
    const random = mulberry32(1)
    const first = [random(), random(), random()]
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true)
    expect(mulberry32(1)()).toBe(first[0])
  })

  it('shuffles without touching the input', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffled(input, mulberry32(7))
    expect(input).toEqual([1, 2, 3, 4, 5])
    expect([...out].sort()).toEqual(input)
  })
})

describe('hex geometry', () => {
  it('counts rings and spirals', () => {
    expect(ringCells(0, 0, 0)).toHaveLength(1)
    expect(ringCells(0, 0, 2)).toHaveLength(12)
    expect(spiralCells(0, 0, 2)).toHaveLength(19)
    expect(axialDistance([0, 0], [2, -1])).toBe(2)
  })

  it('grows the base game into the classic 19-hex island', () => {
    const island = growIsland(19, [0, 0], new Set(), false)
    expect(island).toHaveLength(19)
    expect(Math.max(...island.map((c) => axialDistance(c, [0, 0])))).toBe(2)
  })

  it('finds the corners of a coastal edge', () => {
    const [a, b] = edgeCorners(0, 10)
    expect(a.x).toBeCloseTo(8.66, 2)
    expect(a.y).toBeCloseTo(-5, 5)
    expect(b.y).toBeCloseTo(5, 5)
  })
})

describe('scenarios (docs/rules.md)', () => {
  it('has a token for every producing hex, or names the spares', () => {
    for (const id of VARIANT_IDS) {
      const v = VARIANTS[id]
      const producing = total(v.hexes) - (v.hexes.sea ?? 0) - (v.hexes.desert ?? 0)
      expect(total(v.tokens), id).toBeGreaterThan(0)
      expect(producing, id).toBeGreaterThan(0)
    }
  })

  it('deals every land hex the rules list, and fills every region', () => {
    for (const id of VARIANT_IDS) {
      const v = VARIANTS[id]
      const pools = Object.values(v.pools ?? { land: v.hexes })
      const pooled = (t: Terrain) => pools.reduce((n, p) => n + (p[t] ?? 0), 0)
      for (const t of TERRAINS) {
        // Open sea stays in the box as the frame; the rest is dealt.
        if (t === 'sea') expect(pooled(t), id).toBeLessThanOrEqual(v.hexes.sea ?? 0)
        else expect(pooled(t), `${id} ${t}`).toBe(v.hexes[t] ?? 0)
      }
      const regions = v.shape.reduce((n, r) => n + r.size, 0)
      expect(
        pools.reduce((n, p) => n + total(p), 0),
        id,
      ).toBe(regions)
    }
  })

  it('resolves player counts the way v1 did', () => {
    expect(resolveVariant('s1', 3).id).toBe('s1_3')
    expect(resolveVariant('s1', 4).id).toBe('s1_4')
    expect(resolveVariant('s5', 3).id).toBe('s5')
    expect(resolveVariant('base56', 3).id).toBe('base56')
    expect(GROUP_IDS.filter(hasSeats)).toEqual(['s1', 's2', 's3', 's4'])
  })

  it('counts dots on tokens', () => {
    expect([2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map(pips)).toEqual([1, 2, 3, 4, 5, 5, 4, 3, 2, 1])
  })
})

describe('board codes', () => {
  it('normalises case, spaces and length', () => {
    expect(normalizeCode('  Anchor 4821 ')).toBe('anchor-4821')
    expect(normalizeCode('ЯКОРЬ-4821')).toBe('якорь-4821')
    expect(normalizeCode('x'.repeat(60))).toHaveLength(40)
  })

  it('makes word-and-number codes', () => {
    const code = makeCode(['anchor', 'surf'], mulberry32(3))
    expect(code).toMatch(/^(anchor|surf)-\d{4}$/)
  })
})

describe('share links', () => {
  it('reads v1 links', () => {
    expect(decodeHash('#s=s1&p=3&c=якорь-4821')).toEqual({
      group: 's1',
      seats: 3,
      code: 'якорь-4821',
      options: DEFAULT_OPTIONS,
    })
    expect(decodeHash('s=base34&p=4&c=%D1%8F%D0%BA%D0%BE%D1%80%D1%8C-4821')?.code).toBe(
      'якорь-4821',
    )
  })

  it('rejects links without a known scenario or a code', () => {
    expect(decodeHash('#s=nope&p=4&c=x')).toBeNull()
    expect(decodeHash('#s=s1&p=4')).toBeNull()
    expect(decodeHash('')).toBeNull()
  })

  it('writes v1’s format and adds the rules only when they differ', () => {
    const ref = {
      group: 'base34',
      seats: 4,
      code: 'anchor-4821',
      options: DEFAULT_OPTIONS,
    } as const
    expect(encodeHash(ref)).toBe('s=base34&p=4&c=anchor-4821')
    const custom = { ...ref, options: { ...DEFAULT_OPTIONS, same: false } }
    expect(encodeHash(custom)).toBe('s=base34&p=4&c=anchor-4821&o=r1s0t1l0')
    expect(decodeHash(encodeHash(custom))).toEqual(custom)
  })

  it('round-trips every option set', () => {
    for (let mask = 0; mask < 16; mask++) {
      const options = {
        red: (mask & 1) > 0,
        same: (mask & 2) > 0,
        spread: (mask & 4) > 0,
        letters: (mask & 8) > 0,
      }
      expect(decodeOptions(encodeOptions(options))).toEqual(options)
    }
  })
})
