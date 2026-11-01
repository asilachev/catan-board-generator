import { describe, expect, it } from 'vitest'
import { GROUP_IDS, VARIANT_IDS, VARIANTS } from '../../engine/index.ts'
import {
  baseCounts,
  boardTitle,
  playersLabel,
  scenarioLine,
  scenarioRules,
  victoryLabel,
} from '../format.ts'
import { parseMessage, variablesOf } from './icu.ts'
import {
  createTranslator,
  detectLang,
  LANGS,
  loadCatalog,
  type Catalog,
  type Lang,
} from './index.ts'
import de from './locales/de.json'
import en from './locales/en.json'
import es from './locales/es.json'
import ru from './locales/ru.json'
import sr from './locales/sr.json'

/** The language files, typed as English: a missing key fails the typecheck here too. */
const FILES: Record<Lang, Catalog> = { en, es, de, ru, sr }
const CODES = Object.keys(FILES) as Lang[]
const T = Object.fromEntries(CODES.map((l) => [l, createTranslator(l, FILES[l])])) as Record<
  Lang,
  ReturnType<typeof createTranslator>
>

/** Every string in a file, by dotted path. */
function strings(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]]
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}.${i}`))
  if (typeof value === 'object' && value !== null)
    return Object.entries(value).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k))
  return []
}
const english = new Map(strings(en))

describe('language files', () => {
  it('lists the five languages in the design’s order, Serbian in Cyrillic', () => {
    expect(LANGS.map((l) => l.code)).toEqual(['en', 'es', 'de', 'ru', 'sr'])
    expect(LANGS.map((l) => l.name)).toEqual(['English', 'Español', 'Deutsch', 'Русский', 'Српски'])
    expect(LANGS.find((l) => l.code === 'sr')?.tag).toBe('sr-Cyrl')
  })

  it('detects the first supported browser language, English otherwise', () => {
    expect(detectLang(['ru-RU', 'en'])).toBe('ru')
    expect(detectLang(['sr-Latn-RS'])).toBe('sr')
    expect(detectLang(['fr-FR', 'es-419'])).toBe('es')
    expect(detectLang(['de-AT'])).toBe('de')
    expect(detectLang(['fr', 'it'])).toBe('en')
  })

  it('has exactly English’s keys in every file', () => {
    const keys = [...english.keys()].sort()
    for (const lang of CODES) {
      expect(
        strings(FILES[lang])
          .map(([k]) => k)
          .sort(),
        lang,
      ).toEqual(keys)
    }
  })

  it('parses every message and uses only English’s placeholders', () => {
    for (const lang of CODES) {
      for (const [key, message] of strings(FILES[lang])) {
        const used = variablesOf(parseMessage(message))
        const allowed = variablesOf(parseMessage(english.get(key) ?? ''))
        expect(
          [...used].filter((v) => !allowed.has(v)),
          `${lang} ${key}`,
        ).toEqual([])
      }
    }
  })

  it('has no empty texts except the scenarios without a tagline', () => {
    for (const lang of CODES) {
      const empty = strings(FILES[lang]).filter(([k, s]) => !s.trim() && !k.endsWith('.tagline'))
      expect(
        empty.map(([k]) => k),
        lang,
      ).toEqual([])
    }
  })

  it('names and describes every scenario, with the rules each layout needs', () => {
    for (const lang of CODES) {
      const t = T[lang]
      for (const group of GROUP_IDS) {
        expect(t.dynamic(`scenarios.${group}.name`), `${lang} ${group}`).not.toContain('scenarios.')
        expect(t.dynamic(`scenarios.${group}.story`), `${lang} ${group}`).not.toContain(
          'scenarios.',
        )
      }
      for (const id of VARIANT_IDS) {
        const variant = VARIANTS[id]
        expect(scenarioRules(t, variant), `${lang} ${id}`).toHaveLength(variant.ruleCount)
      }
    }
  })

  it('gives every language twenty one-word code words', () => {
    for (const lang of CODES) {
      const words = T[lang].list('codeWords')
      expect(words, lang).toHaveLength(20)
      expect(new Set(words).size, lang).toBe(20)
      for (const w of words) expect(w, lang).toMatch(/^\p{Ll}+$/u)
    }
  })

  it('connects a language’s file on demand', async () => {
    expect((await loadCatalog('de')).board.newBoard).toBe('Neu mischen')
  })
})

describe('scenario labels in every language', () => {
  it('counts with each language’s plural rules', () => {
    const base34 = VARIANTS.base34
    expect(baseCounts(T.en, base34)).toBe('19 hexes · 18 tokens · 9 harbors')
    expect(baseCounts(T.ru, base34)).toBe('19 гексов · 18 жетонов · 9 гаваней')
    expect(baseCounts(T.sr, base34)).toBe('19 хексова · 18 жетона · 9 лука')
    expect(baseCounts(T.de, VARIANTS.base56)).toBe('30 Felder · 28 Chips · 11 Häfen')
    expect(playersLabel(T.ru, base34)).toBe('3–4 игрока')
    expect(playersLabel(T.ru, VARIANTS.base56)).toBe('5–6 игроков')
    expect(playersLabel(T.sr, VARIANTS.s1_3)).toBe('3 играча')
    expect(playersLabel(T.es, VARIANTS.s5)).toBe('3–4 jugadores')
  })

  it('names the victory target', () => {
    expect(victoryLabel(T.en, VARIANTS.s1_4.victory)).toBe('14 victory points')
    expect(victoryLabel(T.ru, VARIANTS.s1_4.victory, true)).toBe('14 ПО')
    expect(victoryLabel(T.de, VARIANTS.s7.victory, true)).toBe('Festung + 10 SP')
    expect(scenarioLine(T.en, VARIANTS.s1_4)).toBe('Main island and archipelago · 14 VP')
    expect(scenarioLine(T.en, VARIANTS.s8)).toBe('Wonder or 10 VP')
  })

  it('titles the board as the design does', () => {
    expect(boardTitle(T.en, VARIANTS.base34)).toBe('Base game · 3–4 players')
    expect(boardTitle(T.es, VARIANTS.s1_4)).toBe('Navegantes · Nuevas costas')
    expect(boardTitle(T.sr, VARIANTS.s1_4)).toBe('Поморци · Нове обале')
  })
})
