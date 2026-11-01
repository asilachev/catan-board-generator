import type { Random } from './rng.ts'

/**
 * Board codes such as `anchor-4821`. A code is just a string: the board is built from its hash, so
 * any text works and a code means the same board in every language (docs/design.md →
 * Board codes). New codes take a word from the current language's list.
 */

/** Longest code accepted from a link or the input, in characters. */
export const MAX_CODE_LENGTH = 40

/**
 * The form a code is hashed in: trimmed, lower-case, inner spaces as one hyphen, at most
 * MAX_CODE_LENGTH characters. `Anchor 4821` and `anchor-4821` are the same board. v1's codes
 * are already in this form, so its links still open the same boards.
 */
export function normalizeCode(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '-').slice(0, MAX_CODE_LENGTH)
}

/** A new code: a word from `words` and four digits, e.g. `anchor-4821`. */
export function makeCode(words: readonly string[], random: Random): string {
  const word = words[Math.floor(random() * words.length)] ?? 'catan'
  const digits = 1000 + Math.floor(random() * 9000)
  return `${normalizeCode(word)}-${digits}`
}
