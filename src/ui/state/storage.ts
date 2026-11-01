import {
  BOARD_VERSION,
  DEFAULT_OPTIONS,
  decodeHash,
  encodeHash,
  gameOf,
  isGroupId,
  normalizeCode,
  readVersion,
  type BoardRef,
  type BoardVersion,
  type DealOptions,
  type Game,
  type GroupId,
  type Seats,
} from '../../engine/index.ts'
import { isLang, type Lang } from '../i18n/index.ts'

/**
 * Everything the app remembers on a device, in localStorage under versioned keys. Every read and
 * write is wrapped: private mode or blocked storage only means nothing is remembered.
 */
const PREFS_KEY = 'catan-boards:v1:prefs'
const SETTINGS_KEY = 'catan-boards:v1:settings'

/** localStorage, or null where it is unavailable (private mode, blocked storage). */
export function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function read(key: string, storage: Storage | null): unknown {
  try {
    const raw = storage?.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown, storage: Storage | null): void {
  try {
    storage?.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the app works, it just won't remember.
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

// ---- Device preferences ------------------------------------------------------------------------

export interface Prefs {
  /** Picked in Setup → Language or by the landing page's `?lang=`; null follows the browser. */
  readonly language: Lang | null
  /** App starts so far; the install banner waits for the second. */
  readonly launches: number
  /** The install banner stays hidden until this time (ms since epoch) after a dismissal. */
  readonly installHiddenUntil: number
}

export const DEFAULT_PREFS: Prefs = { language: null, launches: 0, installHiddenUntil: 0 }

export function loadPrefs(storage = browserStorage()): Prefs {
  const v = read(PREFS_KEY, storage)
  if (!isRecord(v)) return DEFAULT_PREFS
  return {
    language: isLang(v.language) ? v.language : null,
    launches: typeof v.launches === 'number' && v.launches >= 0 ? Math.floor(v.launches) : 0,
    installHiddenUntil: typeof v.installHiddenUntil === 'number' ? v.installHiddenUntil : 0,
  }
}

export const savePrefs = (prefs: Prefs, storage = browserStorage()): void =>
  write(PREFS_KEY, prefs, storage)

/**
 * A link can carry a language, `?lang=ru`: the landing page's "Open the app" does. A supported
 * one becomes the saved choice, as if picked in the app. Returns the address without the
 * parameter, to show instead, or null if there was none.
 */
export function takeLanguageFromUrl(href: string, storage = browserStorage()): string | null {
  const url = new URL(href)
  const lang = url.searchParams.get('lang')
  if (lang === null) return null
  if (isLang(lang)) savePrefs({ ...loadPrefs(storage), language: lang }, storage)
  url.searchParams.delete('lang')
  return `${url.pathname}${url.search}${url.hash}`
}

// ---- The board being shown ---------------------------------------------------------------------

/** What Setup controls. The board on screen is a pure function of these (minus `fog`). */
export interface Settings {
  readonly game: Game
  /** The last base-game layout and Seafarers scenario, so switching games keeps each. */
  readonly base: GroupId
  readonly sea: GroupId
  readonly seats: Seats
  readonly code: string
  readonly options: DealOptions
  /** Show what is under Scenario 3's fog (display only; doesn't change the board). */
  readonly fog: boolean
  /** How this board is dealt: a v1 link's board stays v1 until something makes a new board. */
  readonly version: BoardVersion
}

export const groupOf = (s: Settings): GroupId => (s.game === 'base' ? s.base : s.sea)

export const refOf = (s: Settings): BoardRef => ({
  group: groupOf(s),
  seats: s.seats,
  code: s.code,
  options: s.options,
  version: s.version,
})

export function defaultSettings(code: string): Settings {
  return {
    game: 'base',
    base: 'base34',
    sea: 's1',
    seats: 4,
    code,
    options: DEFAULT_OPTIONS,
    fog: false,
    version: BOARD_VERSION,
  }
}

function parseOptions(v: unknown): DealOptions {
  if (!isRecord(v)) return DEFAULT_OPTIONS
  const flag = (k: keyof DealOptions) =>
    typeof v[k] === 'boolean' ? (v[k] as boolean) : DEFAULT_OPTIONS[k]
  return {
    red: flag('red'),
    same: flag('same'),
    spread: flag('spread'),
    letters: flag('letters'),
    printed: flag('printed'),
  }
}

export function loadSettings(fallbackCode: string, storage = browserStorage()): Settings {
  const v = read(SETTINGS_KEY, storage)
  const base = defaultSettings(fallbackCode)
  if (!isRecord(v)) return base
  const code = typeof v.code === 'string' ? normalizeCode(v.code) : ''
  // Settings saved before boards had versions were dealt by v1: they stay v1 boards.
  const version = readVersion(v.version)
  const options = parseOptions(v.options)
  return {
    game: v.game === 'seafarers' ? 'seafarers' : 'base',
    base: isGroupId(v.base) && gameOf(v.base) === 'base' ? v.base : base.base,
    sea: isGroupId(v.sea) && gameOf(v.sea) === 'seafarers' ? v.sea : base.sea,
    seats: v.seats === 3 ? 3 : 4,
    code: code || fallbackCode,
    options: { ...options, printed: options.printed && version >= 2 },
    fog: v.fog === true,
    version,
  }
}

export const saveSettings = (settings: Settings, storage = browserStorage()): void =>
  write(SETTINGS_KEY, settings, storage)

/** Settings with a shared link's board applied. */
export function applyRef(settings: Settings, ref: BoardRef): Settings {
  const game = gameOf(ref.group)
  return {
    ...settings,
    game,
    ...(game === 'base' ? { base: ref.group } : { sea: ref.group }),
    seats: ref.seats,
    code: ref.code,
    options: ref.options,
    version: ref.version,
  }
}

/**
 * Settings after a change. A board keeps the version it was dealt with (a v1 link stays v1), until
 * the change makes a new board: a code, scenario or player count, or the printed map.
 */
export function withChange(settings: Settings, next: Partial<Settings>): Settings {
  const merged = { ...settings, ...next }
  const keys = ['game', 'base', 'sea', 'seats', 'code'] as const
  const newBoard =
    keys.some((k) => next[k] !== undefined && next[k] !== settings[k]) ||
    (next.options !== undefined && next.options.printed !== settings.options.printed)
  return newBoard ? { ...merged, version: BOARD_VERSION } : merged
}

/** The board in the address bar, if any. */
export const refFromLocation = (hash: string): BoardRef | null => decodeHash(hash)

/** Keeps the address bar on the board shown, so copying it from the browser shares it too. */
export function writeLocation(settings: Settings): void {
  try {
    history.replaceState(history.state, '', `#${encodeHash(refOf(settings))}`)
  } catch {
    // Sandboxed frames may block history; the share sheet still builds the link.
  }
}

/** The full link to a board on this deployment. */
export function shareUrl(
  settings: Settings,
  origin = location.origin,
  path = location.pathname,
): string {
  return `${origin}${path}#${encodeHash(refOf(settings))}`
}
