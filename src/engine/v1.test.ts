import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { buildBoard, DEFAULT_OPTIONS, type DealOptions } from './board.ts'
import { VARIANT_IDS, type VariantId } from './scenarios.ts'

/**
 * Same code, same board as v1 (docs/design.md → Determinism). The original single-file app is
 * kept in docs/v1/index.html; this test runs its generator, untouched, next to the port.
 */
type V1Cell = {
  q: number
  r: number
  kind: string
  terrain: string
  num: number | null
  letter?: string | null
  villages: number[] | null
}
type V1Board = {
  cells: V1Cell[]
  harbors: { cell: number; dir: number; type: string }[]
  leftover: number[]
}
type V1 = { buildBoard(id: string, seed: string, opts: Record<string, boolean>): V1Board }

function loadV1(): V1 {
  const html = readFileSync(new URL('../../docs/v1/index.html', import.meta.url), 'utf8')
  const script = html.slice(html.indexOf('<script>') + '<script>'.length)
  // Everything above the renderer is pure: RNG, scenarios, layout and dealing.
  const pure = script.slice(0, script.indexOf('const NS ='))
  return runInNewContext(`${pure}\n;({ buildBoard })`) as V1
}

const v1 = loadV1()
const CODES = ['якорь-4821', 'anchor-4821', 'катан', 'surf-3170', 'сидро-1000', 'a']
const OPTION_SETS: DealOptions[] = [
  DEFAULT_OPTIONS,
  { red: false, same: false, spread: false, letters: false },
  { red: true, same: false, spread: true, letters: true },
  { red: false, same: true, spread: false, letters: false },
]

const simplify = (cells: readonly V1Cell[]) =>
  cells.map((c) => [c.q, c.r, c.kind, c.terrain, c.num, c.letter ?? null, c.villages ?? null])

describe('v1 compatibility', () => {
  it.each(VARIANT_IDS as readonly VariantId[])('%s deals exactly what v1 dealt', (id) => {
    for (const code of CODES) {
      for (const options of OPTION_SETS) {
        const old = v1.buildBoard(id, code, { ...options })
        const now = buildBoard(id, code, options)
        const label = `${id} ${code} ${JSON.stringify(options)}`
        expect(simplify(now.cells as readonly V1Cell[]), label).toEqual(simplify(old.cells))
        expect(now.harbors, label).toEqual(old.harbors)
        expect(now.leftover, label).toEqual(old.leftover)
      }
    }
  })
})
