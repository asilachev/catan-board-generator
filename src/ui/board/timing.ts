import type { Geometry } from './geometry.ts'

/** Deal timings (design: Transitions → Generate board, Tokens drop). */
export const TILE_MS = 220
export const TOKEN_MS = 160
export const HARBOR_MS = 200
export const HARBOR_STAGGER = 20
/** Stagger between tiles: 25 ms, tighter on big boards so the deal stays under ~0.7 s. */
export const tileStagger = (n: number): number => Math.min(25, 460 / Math.max(1, n - 1))

export interface DealTiming {
  readonly tilesEnd: number
  readonly tokensStart: number
  readonly tokenStagger: number
  readonly tokensEnd: number
  readonly harborsStart: number
  readonly total: number
}

export function dealTiming(geometry: Geometry): DealTiming {
  const n = geometry.cells.length
  const tilesEnd = (n - 1) * tileStagger(n) + TILE_MS
  const tokens = geometry.cells.filter((c) => c.cell.num !== null).length
  const tokenStagger = Math.min(15, 260 / Math.max(1, tokens))
  const tokensStart = Math.max(0, tilesEnd - 160)
  const tokensEnd = tokensStart + Math.max(0, tokens - 1) * tokenStagger + TOKEN_MS
  const harbors = geometry.harbors.length
  const harborsStart = harbors > 0 ? tokensEnd - 60 : tokensEnd
  const total = harbors > 0 ? harborsStart + (harbors - 1) * HARBOR_STAGGER + HARBOR_MS : tokensEnd
  return { tilesEnd, tokensStart, tokenStagger, tokensEnd, harborsStart, total }
}
