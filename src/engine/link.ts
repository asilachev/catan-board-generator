import { DEFAULT_OPTIONS, type BoardVersion, type DealOptions } from './board.ts'
import { MAX_LINK_CODE_LENGTH, normalizeCode } from './code.ts'
import { isGroupId, type GroupId, type Seats } from './scenarios.ts'

/**
 * What a shared link describes: one board. The hash keeps v1's format, `#s=base34&p=4&c=anchor-4821`,
 * so old links still open. `o=` is added only when the token rules differ from the defaults, and
 * `v=2` for boards dealt from the printed maps: both change the board (docs/design.md → Share links).
 */
export interface BoardRef {
  readonly group: GroupId
  readonly seats: Seats
  readonly code: string
  readonly options: DealOptions
  /** A link without `v=` is v1's, dealt the v1 way. */
  readonly version: BoardVersion
}

/**
 * Option letters in `o=`, each followed by 1 or 0: r(ed) s(ame) t(errain spread) l(etters)
 * p(rinted map). A missing letter keeps its default, so older links read the same.
 */
const FLAGS = [
  ['r', 'red'],
  ['s', 'same'],
  ['t', 'spread'],
  ['l', 'letters'],
  ['p', 'printed'],
] as const satisfies readonly (readonly [string, keyof DealOptions])[]

export function encodeOptions(options: DealOptions): string {
  return FLAGS.map(([letter, key]) => `${letter}${options[key] ? 1 : 0}`).join('')
}

export function decodeOptions(text: string | null): DealOptions {
  const out = { ...DEFAULT_OPTIONS }
  if (!text) return out
  for (const [letter, key] of FLAGS) {
    const match = new RegExp(`${letter}([01])`).exec(text)
    if (match) out[key] = match[1] === '1'
  }
  return out
}

const sameOptions = (a: DealOptions, b: DealOptions) => FLAGS.every(([, k]) => a[k] === b[k])

/** The hash for a board, without the leading `#`. */
export function encodeHash(ref: BoardRef): string {
  const params = new URLSearchParams({ s: ref.group, p: String(ref.seats), c: ref.code })
  if (!sameOptions(ref.options, DEFAULT_OPTIONS)) params.set('o', encodeOptions(ref.options))
  if (ref.version > 1) params.set('v', String(ref.version))
  return params.toString()
}

/** Reads a board from a hash (with or without `#`); null if it doesn't name a scenario and code. */
export function decodeHash(hash: string): BoardRef | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const group = params.get('s')
  const code = normalizeCode(params.get('c') ?? '')
  if (!isGroupId(group) || code === '' || code.length > MAX_LINK_CODE_LENGTH) return null
  return {
    group,
    seats: params.get('p') === '3' ? 3 : 4,
    code,
    options: decodeOptions(params.get('o')),
    version: params.get('v') === '2' ? 2 : 1,
  }
}
