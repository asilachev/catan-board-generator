import { BOARD_VERSION, DEFAULT_OPTIONS, type BoardVersion, type DealOptions } from './board.ts'
import { MAX_LINK_CODE_LENGTH, normalizeCode } from './code.ts'
import { PRINTED_MAPS } from './maps.ts'
import { offersPrinted } from './printed.ts'
import { isGroupId, resolveVariant, type GroupId, type Seats } from './scenarios.ts'

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
 * p(rinted map). A missing letter keeps its default, so older links read the same; `p` is written
 * only when it is on, so links that don't use it keep v1's form.
 */
const FLAGS = [
  ['r', 'red'],
  ['s', 'same'],
  ['t', 'spread'],
  ['l', 'letters'],
  ['p', 'printed'],
] as const satisfies readonly (readonly [string, keyof DealOptions])[]

export function encodeOptions(options: DealOptions): string {
  return FLAGS.map(([letter, key]) =>
    key === 'printed' && !options.printed ? '' : `${letter}${options[key] ? 1 : 0}`,
  ).join('')
}

/**
 * Whether As printed changes this board: a version 2 board of a scenario whose map offers the
 * choice (docs/rules.md → Printed maps). Elsewhere the option is kept but means nothing.
 */
export function printedApplies(ref: Pick<BoardRef, 'group' | 'seats' | 'version'>): boolean {
  const map = PRINTED_MAPS[resolveVariant(ref.group, ref.seats).id]
  return ref.version >= 2 && map !== undefined && offersPrinted(map)
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
  // One board, one link: As printed counts only where it changes the board.
  const options = { ...ref.options, printed: ref.options.printed && printedApplies(ref) }
  if (!sameOptions(options, DEFAULT_OPTIONS)) params.set('o', encodeOptions(options))
  if (ref.version > 1) params.set('v', String(ref.version))
  return params.toString()
}

/** Reads a board from a hash (with or without `#`); null if it doesn't name a scenario and code. */
export function decodeHash(hash: string): BoardRef | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const group = params.get('s')
  const code = normalizeCode(params.get('c') ?? '')
  if (!isGroupId(group) || code === '' || code.length > MAX_LINK_CODE_LENGTH) return null
  const version = readVersion(params.get('v'))
  const options = decodeOptions(params.get('o'))
  return {
    group,
    seats: params.get('p') === '3' ? 3 : 4,
    code,
    // Only version 2 boards can be as printed.
    options: { ...options, printed: options.printed && version >= 2 },
    version,
  }
}

/**
 * A board version from a link or storage: none is v1's. One newer than this build knows (a link
 * from a later app in an old installed one) reads as the newest it knows, the closest board it
 * can deal; the update toast offers the rest.
 */
export function readVersion(value: unknown): BoardVersion {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isInteger(n) && n >= 2 ? BOARD_VERSION : 1
}
