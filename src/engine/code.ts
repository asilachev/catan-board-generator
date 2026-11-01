import type { Random } from './rng.ts'

/**
 * Board codes such as `anchor-4821`. A code is just a string: the board is built from its hash, so
 * any text works and a code means the same board in every language (docs/design.md →
 * Board codes). New codes take a word from the current language's list.
 */

/** Longest code the input takes, in characters. */
export const MAX_CODE_LENGTH = 40

/** Longest code a link may carry. v1 had no limit; this only keeps absurd links out. */
export const MAX_LINK_CODE_LENGTH = 200

/**
 * The form a code is hashed in, v1's: the text trimmed, nothing more. Case and inner spaces count
 * (`Anchor` and `anchor` are different boards), as they did in v1, so every code and link v1 made
 * still builds the same board. The input turns off auto-capitalisation for that reason.
 */
export function normalizeCode(text: string): string {
  return text.trim()
}

/** A new code: a word from `words` and four digits, e.g. `anchor-4821`. */
export function makeCode(words: readonly string[], random: Random): string {
  const word = words[Math.floor(random() * words.length)] ?? 'catan'
  const digits = 1000 + Math.floor(random() * 9000)
  return `${word.trim().toLowerCase().replace(/\s+/g, '-')}-${digits}`
}
