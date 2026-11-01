/**
 * Typesetting a language needs beyond its words. Translators write ordinary spaces; this
 * puts in the non-breaking ones where the language's rules require them, so a line never ends in
 * the wrong place at any screen width.
 *
 * Russian, after Мильчин and Чельцова, «Справочник издателя и автора»:
 * - a one- or two-letter word stays with the next word: no line ends on «в», «и», «по»;
 * - the particles «же», «ли», «бы» stay with the word before them;
 * - a number stays with the word after it: «16 очков», «+3 очка»;
 * - a dash never starts a line: the space before it doesn't break;
 * - an abbreviation stays with its number («ур. 2»), and © with its year.
 */
const NBSP = ' '
const CYRILLIC = 'а-яёА-ЯЁ'

type Rule = readonly [pattern: RegExp, replacement: string]

const RUSSIAN: readonly Rule[] = [
  [new RegExp(`(^|[\\s«„(])([${CYRILLIC}]{1,2}) (?=\\S)`, 'g'), `$1$2${NBSP}`],
  [new RegExp(` (?=(?:же|ли|бы)(?![${CYRILLIC}]))`, 'g'), NBSP],
  [new RegExp(`(\\d) (?=[${CYRILLIC}])`, 'g'), `$1${NBSP}`],
  [/ (?=—)/g, NBSP],
  [new RegExp(`([${CYRILLIC}]\\.) (?=\\d)`, 'g'), `$1${NBSP}`],
  [/© (?=\d)/g, `©${NBSP}`],
]

const RULES: Partial<Record<string, readonly Rule[]>> = { ru: RUSSIAN }

/** The language's typesetting for one text; texts in other languages come back unchanged. */
export function typeset(lang: string, text: string): string {
  const rules = RULES[lang]
  if (!rules) return text
  let out = text
  for (const [pattern, replacement] of rules) {
    out = out.replace(pattern, replacement)
    // Matches can't overlap, so a run of short words («и в PDF») needs a second pass.
    out = out.replace(pattern, replacement)
  }
  return out
}

/** `typeset` for every string in a value: lists of texts and lists of { title, text }. */
export function typesetAll<T>(lang: string, value: T): T {
  if (!RULES[lang]) return value
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return typeset(lang, v)
    if (Array.isArray(v)) return v.map(walk)
    if (typeof v === 'object' && v !== null)
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
    return v
  }
  return walk(value) as T
}
