import {
  AXIAL_DIRECTIONS,
  axialKey,
  cellCenter,
  type Board,
  type Cell,
  type Harbor,
} from '../../engine/index.ts'

/**
 * Where everything sits on the drawn board, in SVG units. The hex circumradius is R = 32, the
 * size of the design's hex tiles (55.4 × 64), so the base board is drawn 1:1 with the design.
 */
export const R = 32
export const HEX_W = Math.sqrt(3) * R
/** Tiles are drawn a little smaller than the grid, so the sand frame shows between them. */
export const TILE = 0.93 * R
/** The sand under the land reaches a little past the tiles. */
export const SAND = 1.07 * R
export const TOKEN_R = 14
export const TOKEN_Y = 0.26 * R
export const HARBOR_R = 15
const HARBOR_OUT = 0.866 * R + 0.62 * R
const PAD = 10

export interface PlacedCell {
  readonly index: number
  readonly cell: Cell
  readonly x: number
  readonly y: number
  /** Position in the deal: a spiral from the centre outwards. */
  readonly order: number
}

export interface PlacedHarbor {
  readonly harbor: Harbor
  readonly x: number
  readonly y: number
  /** The two tile corners the piers run to. */
  readonly piers: readonly [{ x: number; y: number }, { x: number; y: number }]
}

export interface Geometry {
  readonly cells: readonly PlacedCell[]
  /**
   * Open sea around the islands of a Seafarers board from a v1 link: drawn for orientation, not
   * part of the deal. Printed maps deal their sea as cells, up to the frame.
   */
  readonly sea: readonly { x: number; y: number }[]
  readonly harbors: readonly PlacedHarbor[]
  readonly viewBox: { x: number; y: number; width: number; height: number }
}

export function boardGeometry(board: Board): Geometry {
  const raw = board.cells.map((cell, index) => ({ index, cell, ...cellCenter(cell.q, cell.r, R) }))
  // Deal order: by distance from the middle of the land, then clockwise from the top.
  const cx = raw.reduce((s, c) => s + c.x, 0) / Math.max(1, raw.length)
  const cy = raw.reduce((s, c) => s + c.y, 0) / Math.max(1, raw.length)
  const ranked = [...raw].sort((a, b) => {
    const da = Math.round(Math.hypot(a.x - cx, a.y - cy) / (HEX_W * 0.9))
    const db = Math.round(Math.hypot(b.x - cx, b.y - cy) / (HEX_W * 0.9))
    if (da !== db) return da - db
    const angle = (p: { x: number; y: number }) =>
      (Math.atan2(p.y - cy, p.x - cx) + Math.PI * 2.5) % (Math.PI * 2)
    return angle(a) - angle(b)
  })
  const orderOf = new Map(ranked.map((c, k) => [c.index, k]))
  const cells: PlacedCell[] = raw.map((c) => ({ ...c, order: orderOf.get(c.index) ?? 0 }))

  const taken = new Set(board.cells.map((c) => axialKey(c.q, c.r)))
  const sea: { x: number; y: number }[] = []
  if (board.variant.game === 'seafarers' && !board.cells.some((c) => c.kind === 'sea')) {
    const seen = new Set<string>()
    for (const c of board.cells) {
      for (const [dq, dr] of AXIAL_DIRECTIONS) {
        const q = c.q + dq
        const r = c.r + dr
        const k = axialKey(q, r)
        if (taken.has(k) || seen.has(k)) continue
        seen.add(k)
        sea.push(cellCenter(q, r, R))
      }
    }
  }

  const harbors: PlacedHarbor[] = board.harbors.map((harbor) => {
    const c = cells[harbor.cell] ?? { x: 0, y: 0 }
    const angle = (60 * harbor.dir * Math.PI) / 180
    const corner = (deg: number) => ({
      x: c.x + TILE * Math.cos((deg * Math.PI) / 180),
      y: c.y + TILE * Math.sin((deg * Math.PI) / 180),
    })
    return {
      harbor,
      x: c.x + HARBOR_OUT * Math.cos(angle),
      y: c.y + HARBOR_OUT * Math.sin(angle),
      piers: [corner(60 * harbor.dir - 30), corner(60 * harbor.dir + 30)],
    }
  })

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const bump = (x: number, y: number, rx: number, ry: number) => {
    minX = Math.min(minX, x - rx)
    maxX = Math.max(maxX, x + rx)
    minY = Math.min(minY, y - ry)
    maxY = Math.max(maxY, y + ry)
  }
  for (const c of cells) bump(c.x, c.y, (SAND * Math.sqrt(3)) / 2, SAND)
  for (const s of sea) bump(s.x, s.y, HEX_W / 2, R)
  for (const h of harbors) bump(h.x, h.y, HARBOR_R + 3, HARBOR_R + 3)
  if (!Number.isFinite(minX))
    return { cells, sea, harbors, viewBox: { x: 0, y: 0, width: 1, height: 1 } }
  return {
    cells,
    sea,
    harbors,
    viewBox: {
      x: minX - PAD,
      y: minY - PAD,
      width: maxX - minX + PAD * 2,
      height: maxY - minY + PAD * 2,
    },
  }
}

/** Corners of a pointy-top hex as an SVG points string. */
export function hexPoints(x: number, y: number, radius: number): string {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 90)
    return `${(x + radius * Math.cos(a)).toFixed(2)},${(y + radius * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}
