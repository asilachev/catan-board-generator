import { describe, expect, it } from 'vitest'
import { typeset, typesetAll } from './typography.ts'
import ru from './locales/ru.json'

/** Shows non-breaking spaces as `_`, so expectations stay readable. */
const ruShown = (text: string) => typeset('ru', text).replaceAll(' ', '_')

/** Every string in a file, by dotted path. */
function strings(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]]
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}.${i}`))
  if (typeof value === 'object' && value !== null)
    return Object.entries(value).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k))
  return []
}

describe('Russian typography', () => {
  it('keeps a one- or two-letter word with the next word', () => {
    expect(ruShown('Игра на вашем столе')).toBe('Игра на_вашем столе')
    expect(ruShown('В PDF этого нет')).toBe('В_PDF этого нет')
    expect(ruShown('НЕТ В ЗАПАСЕ')).toBe('НЕТ В_ЗАПАСЕ')
  })

  it('keeps a run of short words together with the word after them', () => {
    expect(ruShown('и в раунде')).toBe('и_в_раунде')
    expect(ruShown('«в запасе»')).toBe('«в_запасе»')
  })

  it('keeps the particles же, ли and бы with the word before them', () => {
    expect(ruShown('если же нет')).toBe('если_же_нет')
    expect(ruShown('так ли это')).toBe('так_ли_это')
  })

  it('keeps a number with the word after it', () => {
    expect(ruShown('16 очков')).toBe('16_очков')
    expect(ruShown('+3 очка')).toBe('+3_очка')
    expect(ruShown('30 РАУНДОВ')).toBe('30_РАУНДОВ')
  })

  it('never starts a line with a dash', () => {
    expect(ruShown('Он ходит первым — потом ваш ход.')).toBe('Он_ходит первым_— потом ваш ход.')
  })

  it('keeps an abbreviation with its number, and © with its year', () => {
    expect(ruShown('Правила, с. 12')).toBe('Правила, с._12')
    expect(ruShown('© 2026 Board Generator')).toBe('©_2026 Board Generator')
  })

  it('leaves words inside other words, hyphens and ranges alone', () => {
    expect(ruShown('по-прежнему действует')).toBe('по-прежнему действует')
    expect(ruShown('раунды 1–10')).toBe('раунды 1–10')
    expect(ruShown('CATAN Seafarers')).toBe('CATAN Seafarers')
  })

  it('changes nothing in other languages', () => {
    expect(typeset('en', 'He goes first — then you, in round 7')).toBe(
      'He goes first — then you, in round 7',
    )
    const rules = [{ title: 'a b', text: 'c d' }]
    expect(typesetAll('de', rules)).toBe(rules)
  })

  it('typesets every string in a list', () => {
    expect(typesetAll('ru', [{ title: 'Ход', text: 'в запас' }, 'и всё'])).toEqual([
      { title: 'Ход', text: 'в запас' },
      'и всё',
    ])
  })
})

describe('Russian texts', () => {
  const texts = strings(ru)

  it('use «ёлочки» and „лапки“ quotes, never straight or English ones', () => {
    const bad = texts.filter(([, s]) => /["“”']/.test(s.replace(/„[^“]*“/g, '')))
    expect(bad.map(([k]) => k)).toEqual([])
  })

  it('use a real dash and ellipsis, and no double spaces', () => {
    const bad = texts.filter(([, s]) => / - |\.\.\.| {2}/.test(s))
    expect(bad.map(([k]) => k)).toEqual([])
  })
})
