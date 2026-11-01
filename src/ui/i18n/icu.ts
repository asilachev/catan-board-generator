/**
 * The small ICU MessageFormat subset the translation files use:
 *
 *   {name}                                    a value
 *   {name, select, a {…} b {…} other {…}}     pick by value (true/false, 1/2/3, A/B/C, …)
 *   {n, plural, =0 {…} one {# pt} other {# pts}}  pick by the language's plural rules; # is n
 *
 * Branches nest. Apostrophes are ordinary text (use the typographic ’ anyway).
 */
export type Node =
  | string
  | { readonly kind: 'arg'; readonly name: string }
  | { readonly kind: 'hash' }
  | {
      readonly kind: 'select' | 'plural'
      readonly name: string
      readonly options: Readonly<Record<string, readonly Node[]>>
    }

export function parseMessage(message: string): readonly Node[] {
  let i = 0
  const fail = (reason: string): never => {
    throw new Error(`${reason} at ${i} in "${message}"`)
  }
  const space = () => {
    while (/\s/.test(message[i] ?? '')) i++
  }
  const word = () => {
    space()
    const start = i
    while (i < message.length && /[^\s,{}]/.test(message[i] ?? '')) i++
    return message.slice(start, i)
  }

  function nodes(inPlural: boolean, nested: boolean): Node[] {
    const out: Node[] = []
    let text = ''
    const flush = () => {
      if (text) out.push(text)
      text = ''
    }
    while (i < message.length) {
      const ch = message[i]
      if (ch === '{') {
        flush()
        out.push(argument(inPlural))
      } else if (ch === '}') {
        if (!nested) fail('Unexpected }')
        break
      } else if (ch === '#' && inPlural) {
        flush()
        out.push({ kind: 'hash' })
        i++
      } else {
        text += ch
        i++
      }
    }
    if (nested && message[i] !== '}') fail('Missing }')
    flush()
    return out
  }

  function argument(inPlural: boolean): Node {
    i++ // {
    const name = word()
    space()
    if (message[i] === '}') {
      i++
      return { kind: 'arg', name }
    }
    if (message[i] !== ',') fail('Expected ,')
    i++
    const kind = word()
    if (kind !== 'select' && kind !== 'plural') return fail(`Unknown kind "${kind}"`)
    space()
    if (message[i] !== ',') fail('Expected ,')
    i++
    const options: Record<string, readonly Node[]> = {}
    for (;;) {
      space()
      if (message[i] === '}') {
        i++
        break
      }
      const key = word()
      space()
      if (!key || message[i] !== '{') fail('Expected an option')
      i++
      options[key] = nodes(inPlural || kind === 'plural', true)
      i++ // }
    }
    if (!('other' in options)) fail(`"${name}" needs an "other" option`)
    return { kind, name, options }
  }

  return nodes(false, false)
}

export type Vars = Readonly<Record<string, string | number | boolean | null | undefined>>

export function formatMessage(
  ast: readonly Node[],
  vars: Vars,
  plural: (n: number) => Intl.LDMLPluralRule,
): string {
  const run = (list: readonly Node[], hash: number | undefined): string =>
    list
      .map((node) => {
        if (typeof node === 'string') return node
        if (node.kind === 'hash') return String(hash ?? '#')
        const value = vars[node.name]
        if (node.kind === 'arg') return String(value ?? `{${node.name}}`)
        if (node.kind === 'plural') {
          const n = Number(value)
          return run(
            node.options[`=${n}`] ?? node.options[plural(n)] ?? node.options.other ?? [],
            n,
          )
        }
        return run(node.options[String(value)] ?? node.options.other ?? [], hash)
      })
      .join('')
  return run(ast, undefined)
}

/** Every variable name a message uses, for checking translations against English. */
export function variablesOf(ast: readonly Node[]): Set<string> {
  const names = new Set<string>()
  const walk = (list: readonly Node[]) => {
    for (const node of list) {
      if (typeof node === 'string' || node.kind === 'hash') continue
      names.add(node.name)
      if (node.kind !== 'arg') for (const branch of Object.values(node.options)) walk(branch)
    }
  }
  walk(ast)
  return names
}
