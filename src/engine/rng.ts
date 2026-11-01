/** A function returning a float in [0, 1). */
export type Random = () => number

/**
 * The 32-bit string hash v1 used to turn "scenario#code" into a seed. Kept bit for bit, so a code
 * builds the same board it built in the first version of the app (docs/design.md → Determinism).
 */
export function hashSeed(text: string): number {
  let h = 1779033703 ^ text.length
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

/** mulberry32: a tiny, well-known seeded PRNG, exactly as v1 wrote it. */
export function mulberry32(seed: number): Random {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher–Yates shuffle. Returns a new array; the input is untouched. */
export function shuffled<T>(items: readonly T[], random: Random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const tmp = out[i] as T
    out[i] = out[j] as T
    out[j] = tmp
  }
  return out
}
