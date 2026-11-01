/**
 * Hex geometry in axial coordinates (q, r), pointy-top hexes. Islands are grown from a centre
 * cell, so a scenario's shape is a list of regions and sizes rather than a hand-drawn map
 * (docs/rules.md → Board shapes). Ported from v1 without changes in behaviour.
 */

export type Axial = readonly [q: number, r: number]

/** The six neighbour directions, in the order v1 used (the order matters for determinism). */
export const AXIAL_DIRECTIONS: readonly Axial[] = [
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
]

export const axialKey = (q: number, r: number): string => `${q}|${r}`

export function axialDistance(a: Axial, b: Axial): number {
  const dq = a[0] - b[0]
  const dr = a[1] - b[1]
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2
}

/** The cells at distance k from the centre, starting from the "up-left" corner. */
export function ringCells(cq: number, cr: number, k: number): Axial[] {
  if (k === 0) return [[cq, cr]]
  const out: Axial[] = []
  const start = AXIAL_DIRECTIONS[4] as Axial
  let q = cq + start[0] * k
  let r = cr + start[1] * k
  for (const [dq, dr] of AXIAL_DIRECTIONS) {
    for (let i = 0; i < k; i++) {
      out.push([q, r])
      q += dq
      r += dr
    }
  }
  return out
}

/** Every cell within maxK of the centre, ring by ring. */
export function spiralCells(cq: number, cr: number, maxK: number): Axial[] {
  const out: Axial[] = []
  for (let k = 0; k <= maxK; k++) out.push(...ringCells(cq, cr, k))
  return out
}

function cubeRound(q: number, r: number): Axial {
  const x = q
  const z = r
  const y = -x - z
  let rx = Math.round(x)
  const ry = Math.round(y)
  let rz = Math.round(z)
  const dx = Math.abs(rx - x)
  const dy = Math.abs(ry - y)
  const dz = Math.abs(rz - z)
  // v1 also recomputed y when it was furthest off, but only x and z are returned.
  if (dx > dy && dx > dz) rx = -ry - rz
  else if (dz >= dy) rz = -rx - ry
  return [rx, rz]
}

/** The cell at a distance (in hex widths) and angle (degrees, 0 = east, clockwise) from 0,0. */
export function axialFromPolar(distance: number, degrees: number): Axial {
  const a = (degrees * Math.PI) / 180
  const x = distance * Math.cos(a)
  const y = distance * Math.sin(a)
  const r = y / 1.5
  const q = x / Math.sqrt(3) - r / 2
  return cubeRound(q, r)
}

/**
 * Grows a compact island of `size` cells from the free cell nearest to `center`. Unless `touch`
 * is set, it keeps one cell of sea between itself and the cells already taken.
 */
export function growIsland(
  size: number,
  center: Axial,
  occupied: ReadonlySet<string>,
  touch: boolean,
): Axial[] {
  const inSet = new Set<string>()
  const chosen: Axial[] = []
  const free = ([q, r]: Axial) => {
    if (occupied.has(axialKey(q, r)) || inSet.has(axialKey(q, r))) return false
    if (!touch) {
      for (const [dq, dr] of AXIAL_DIRECTIONS)
        if (occupied.has(axialKey(q + dq, r + dr))) return false
    }
    return true
  }
  const seed = spiralCells(center[0], center[1], 9).find(free)
  if (!seed) return []
  chosen.push(seed)
  inSet.add(axialKey(seed[0], seed[1]))
  while (chosen.length < size) {
    let best: Axial | null = null
    let bestScore = Infinity
    for (const cell of chosen) {
      for (const [dq, dr] of AXIAL_DIRECTIONS) {
        const next: Axial = [cell[0] + dq, cell[1] + dr]
        if (!free(next)) continue
        const score = axialDistance(next, seed) * 100 + next[1] * 3 + next[0]
        if (score < bestScore) {
          bestScore = score
          best = next
        }
      }
    }
    if (!best) break
    chosen.push(best)
    inSet.add(axialKey(best[0], best[1]))
  }
  return chosen
}

/** Pixel centre of a cell for hexes of circumradius `size` (pointy-top). */
export function cellCenter(q: number, r: number, size: number): { x: number; y: number } {
  return { x: Math.sqrt(3) * size * (q + r / 2), y: 1.5 * size * r }
}

/** The corners of a pointy-top hex, clockwise from the top. */
export function hexCorners(cx: number, cy: number, radius: number): { x: number; y: number }[] {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 90)
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) }
  })
}

/**
 * The two corners of the edge that faces direction `dir` (an index into AXIAL_DIRECTIONS), for a
 * hex of circumradius `radius` centred at the origin.
 */
export function edgeCorners(
  dir: number,
  radius: number,
): [{ x: number; y: number }, { x: number; y: number }] {
  // Direction d points at angle 60°·d (0 = east, clockwise); its edge spans the corners at
  // 60°·d − 30° and 60°·d + 30°.
  const corner = (deg: number) => ({
    x: radius * Math.cos((deg * Math.PI) / 180),
    y: radius * Math.sin((deg * Math.PI) / 180),
  })
  return [corner(60 * dir - 30), corner(60 * dir + 30)]
}
