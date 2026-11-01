import { createContext, useContext } from 'react'
import { formatMessage, parseMessage, type Node, type Vars } from './icu.ts'
import en from './locales/en.json'
import { typeset, typesetAll } from './typography.ts'

/**
 * Translations. Every text lives in one JSON file per language under `locales/`; English is
 * bundled (the fallback and the source of the key types), the others load when chosen. See
 * `locales/README.md` for the message format.
 */

/** The app's languages, in the design's order. Serbian is written in Cyrillic only. */
export type Lang = 'en' | 'es' | 'de' | 'ru' | 'sr'

export interface LangInfo {
  readonly code: Lang
  /** The language's own name, for the picker. */
  readonly name: string
  /** BCP 47 tag for `<html lang>` and plural rules. */
  readonly tag: string
  /** Two words of the app in that language, shown under its name in the picker. */
  readonly sample: string
}

export const LANGS: readonly LangInfo[] = [
  { code: 'en', name: 'English', tag: 'en', sample: 'New board · Board code' },
  { code: 'es', name: 'Español', tag: 'es', sample: 'Nuevo tablero · Código del tablero' },
  { code: 'de', name: 'Deutsch', tag: 'de', sample: 'Neu mischen · Plan-Code' },
  { code: 'ru', name: 'Русский', tag: 'ru', sample: 'Новое поле · Код поля' },
  { code: 'sr', name: 'Српски', tag: 'sr-Cyrl', sample: 'ћирилица · Нова табла' },
]

export type Catalog = typeof en

/** One file per language, connected on demand. Each must have every key English has. */
const LOADERS: Readonly<Record<Exclude<Lang, 'en'>, () => Promise<{ default: Catalog }>>> = {
  es: () => import('./locales/es.json'),
  de: () => import('./locales/de.json'),
  ru: () => import('./locales/ru.json'),
  sr: () => import('./locales/sr.json'),
}

const loaded = new Map<Lang, Catalog>([['en', en]])

/** Loads a language's file (cached), e.g. before switching to it. */
export async function loadCatalog(lang: Lang): Promise<Catalog> {
  const ready = loaded.get(lang)
  if (ready) return ready
  if (lang === 'en') return en
  const catalog = (await LOADERS[lang]()).default
  loaded.set(lang, catalog)
  return catalog
}

/** A language's file if it is already loaded. */
export const loadedCatalog = (lang: Lang): Catalog | undefined => loaded.get(lang)

export const isLang = (value: unknown): value is Lang =>
  typeof value === 'string' && LANGS.some((l) => l.code === value)

export const langInfo = (lang: Lang): LangInfo =>
  LANGS.find((l) => l.code === lang) ?? (LANGS[0] as LangInfo)

/** The first of the browser's preferred languages that the app speaks; English otherwise. */
export function detectLang(preferred: readonly string[]): Lang {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLang(base)) return base
  }
  return 'en'
}

export const browserLanguages = (): readonly string[] =>
  typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language])

// Dotted keys of the English file: plain messages, and lists (arrays) separately.
type MessageKeys<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends readonly unknown[]
      ? never
      : MessageKeys<T[K], `${P}${K}.`>
}[keyof T & string]
type ListKeys<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends readonly unknown[]
    ? `${P}${K}`
    : T[K] extends string
      ? never
      : ListKeys<T[K], `${P}${K}.`>
}[keyof T & string]

export type MessageKey = MessageKeys<Catalog>
export type ListKey = ListKeys<Catalog>
export type { Vars } from './icu.ts'

/**
 * Formats a message: `t('board.dealingHexes', { n: 13, total: 19 })`. `t.list('codeWords')` returns
 * a list; `t.dynamic('scenarios.s1.name')` takes a key built at run time and falls back to the key.
 */
export interface Translate {
  (key: MessageKey, vars?: Vars): string
  list(key: ListKey | `${string}.rules`): readonly string[]
  dynamic(key: string, vars?: Vars): string
  readonly lang: Lang
}

const lookup = (catalog: unknown, key: string): unknown =>
  key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        typeof node === 'object' && node !== null
          ? (node as Record<string, unknown>)[part]
          : undefined,
      catalog,
    )

export function createTranslator(lang: Lang, catalog: Catalog): Translate {
  const rules = new Intl.PluralRules(langInfo(lang).tag)
  const plural = (n: number) => rules.select(n)
  const parsed = new Map<string, readonly Node[]>()
  const lists = new Map<string, readonly string[]>()
  // Texts come out typeset for the language, e.g. with Russian non-breaking spaces.
  const format = (key: string, vars: Vars = {}) => {
    let ast = parsed.get(key)
    if (!ast) {
      const message = lookup(catalog, key) ?? lookup(en, key)
      ast = typeof message === 'string' ? parseMessage(message) : [key]
      parsed.set(key, ast)
    }
    return typeset(lang, formatMessage(ast, vars, plural))
  }
  const t = ((key: MessageKey, vars?: Vars) => format(key, vars)) as Translate
  t.dynamic = format
  t.list = (key) => {
    let list = lists.get(key)
    if (!list) {
      const value = lookup(catalog, key) ?? lookup(en, key)
      list = Array.isArray(value) ? typesetAll(lang, value.map(String)) : []
      lists.set(key, list)
    }
    return list
  }
  Object.defineProperty(t, 'lang', { value: lang })
  return t
}

const translators = new Map<Lang, Translate>()

/** The translate function for a loaded language (English until its file is in). */
export function translatorFor(lang: Lang): Translate {
  const catalog = loaded.get(lang)
  if (!catalog) return translatorFor('en')
  let t = translators.get(lang)
  if (!t) {
    t = createTranslator(lang, catalog)
    translators.set(lang, t)
  }
  return t
}

export interface I18n {
  readonly lang: Lang
  readonly t: Translate
  setLang(lang: Lang): void
}

export const I18nContext = createContext<I18n>({
  lang: 'en',
  t: createTranslator('en', en),
  setLang: () => {},
})

export const useI18n = (): I18n => useContext(I18nContext)

/** The current language's translate function. */
export const useT = (): Translate => useContext(I18nContext).t
