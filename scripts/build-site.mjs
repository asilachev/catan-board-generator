// Assembles the landing page into _site/, once per language:
//
//   _site/index.html          English, from the template site/index.html and site/locales/en.json
//   _site/{es,de,ru,sr}/      the other languages
//   _site/screenshots/<lang>/ the app in that language, from .screenshots/<lang> (npm run site:shots)
//
//   npm run site:shots && npm run site     then preview with: npx vite preview --outDir _site
//
// Scenario names, victory targets, button labels and sample codes come from the app's own
// translations and engine, so the page always says what the app says. Fails if a language misses a
// text, the page references a file that isn't there, or a placeholder is left over. Russian texts
// get the app's typography (src/ui/i18n/typography.ts).
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gameOf, GROUP_IDS, resolveVariant, variantsOf } from '../src/engine/index.ts'
import { groupPlayersLabel, playersLabel, scenarioName, victoryLabel } from '../src/ui/format.ts'
import { formatMessage, parseMessage } from '../src/ui/i18n/icu.ts'
import { typeset } from '../src/ui/i18n/typography.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = `${root}_site/`
const SITE_URL = 'https://catan.silachev.com/'
const APP_URL = 'https://app.catan.silachev.com/'
const STORAGE_KEY = 'catan-site:lang'

/** The app's languages, in the app's order; English lives at the root. */
const LANGS = [
  { code: 'en', name: 'English', tag: 'en', locale: 'en_GB' },
  { code: 'es', name: 'Español', tag: 'es', locale: 'es_ES' },
  { code: 'de', name: 'Deutsch', tag: 'de', locale: 'de_DE' },
  { code: 'ru', name: 'Русский', tag: 'ru', locale: 'ru_RU' },
  { code: 'sr', name: 'Српски', tag: 'sr-Cyrl', locale: 'sr_RS' },
]
const dirOf = (code) => (code === 'en' ? '' : `${code}/`)

const links = (code) => ({
  // The owner's copy of the app, on Vercel. It opens in this page's language and keeps it.
  app: `${APP_URL}?lang=${code}`,
  github: 'https://github.com/asilachev/catan-board-generator',
  rules: 'https://www.catan.com/understand-catan/game-rules',
})

/**
 * A board link opens the board, wherever it lands. v1 lived at this address and shared links like
 * `catan.silachev.com/#s=s4&p=4&c=anchor-4821`; the app reads that format, so every page hands
 * such a link to the app with its hash unchanged before anything renders (#12).
 */
const FORWARD = `<script>
      ;(() => {
        const board = new URLSearchParams(location.hash.slice(1))
        if (board.get('s') && board.get('c')) location.replace(\`${APP_URL}\${location.hash}\`)
      })()
    </script>`

/** First visit to the English page: go to the browser's language, unless one was picked here. */
const REDIRECT = `<script>
      ;(() => {
        const others = ${JSON.stringify(LANGS.map((l) => l.code).filter((c) => c !== 'en'))}
        const go = (code) => location.replace(\`\${code}/\${location.hash}\`)
        try {
          const picked = localStorage.getItem('${STORAGE_KEY}')
          if (picked) {
            if (others.includes(picked)) go(picked)
            return
          }
        } catch {
          // No storage: fall back to the browser's languages.
        }
        for (const tag of navigator.languages ?? [navigator.language]) {
          const code = String(tag).toLowerCase().split('-')[0]
          if (code === 'en') return
          if (others.includes(code)) return go(code)
        }
      })()
    </script>`

// ---- Texts ---------------------------------------------------------------------------------------

/** Every text in a locale file, by dotted path. */
function flatten(value, path = '', into = new Map()) {
  if (typeof value === 'string') into.set(path, value)
  else if (Array.isArray(value)) value.forEach((v, i) => flatten(v, `${path}.${i}`, into))
  else for (const [k, v] of Object.entries(value)) flatten(v, path ? `${path}.${k}` : k, into)
  return into
}
const readJson = async (path) => JSON.parse(await readFile(`${root}${path}`, 'utf8'))
const site = {}
const app = {}
for (const { code } of LANGS) {
  site[code] = flatten(await readJson(`site/locales/${code}.json`))
  app[code] = await readJson(`src/ui/i18n/locales/${code}.json`)
}
const problems = []
for (const { code } of LANGS) {
  const missing = [...site.en.keys()].filter((k) => !site[code].has(k))
  const extra = [...site[code].keys()].filter((k) => !site.en.has(k))
  if (missing.length) problems.push(`site/locales/${code}.json misses ${missing.join(', ')}`)
  if (extra.length) problems.push(`site/locales/${code}.json has unknown ${extra.join(', ')}`)
}

/** The app's translate function for a language, as src/ui/i18n/index.ts builds it. */
function appTranslator(lang) {
  const catalog = app[lang]
  const { tag } = LANGS.find((l) => l.code === lang)
  const rules = new Intl.PluralRules(tag)
  const lookup = (key) => key.split('.').reduce((node, part) => node?.[part], catalog)
  const format = (key, vars = {}) => {
    const message = lookup(key)
    if (typeof message !== 'string') throw new Error(`No app text ${key} in ${lang}`)
    return typeset(
      lang,
      formatMessage(parseMessage(message), vars, (n) => rules.select(n)),
    )
  }
  const t = (key, vars) => format(key, vars)
  t.dynamic = format
  t.list = (key) => lookup(key).map((s) => typeset(lang, s))
  t.lang = lang
  return t
}

const escapeHtml = (text) =>
  String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const escapeAttribute = (text) => escapeHtml(text).replaceAll('"', '&quot;')

// ---- Icons: lucide's own drawings, plus our cactus -------------------------------------------------

const ICONS = [
  'globe',
  'chevron-down',
  'gift',
  'wifi-off',
  'languages',
  'dices',
  'smartphone',
  'package',
  'scale',
  'sailboat',
  'link',
  'eye',
  'package-open',
  'arrow-right',
  'tablet-smartphone',
  'users',
  'trophy',
  'check',
  'sliders-horizontal',
  'house',
  'trees',
  'fence',
  'wheat',
  'brick-wall',
  'mountain-snow',
  'gem',
  'waves',
  'cloud-fog',
]
const CACTUS = [
  ['path', { d: 'M10 21V6a2 2 0 0 1 4 0v15' }],
  ['path', { d: 'M14 13h2.5a2 2 0 0 0 2-2V8.5' }],
  ['path', { d: 'M10 15.5H7.5a2 2 0 0 1-2-2V11' }],
  ['path', { d: 'M5 21h14' }],
]
async function sprite() {
  const symbol = (id, nodes) =>
    `<symbol id="i-${id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    nodes
      .map(([tagName, attrs]) => {
        const list = Object.entries(attrs)
          .filter(([k]) => k !== 'key')
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ')
        return `<${tagName} ${list}/>`
      })
      .join('') +
    '</symbol>'
  // Some icons are aliases (waves → waves-horizontal) that re-export another file.
  const iconData = async (name) => {
    const path = `${root}node_modules/lucide-react/dist/esm/icons/${name}.mjs`
    const module = await import(pathToFileURL(path).href)
    if (module.__iconData) return module.__iconData
    const alias = /from '\.\/([\w-]+)\.mjs'/.exec(await readFile(path, 'utf8'))
    if (!alias) throw new Error(`No icon data for ${name}`)
    return iconData(alias[1])
  }
  const symbols = []
  for (const name of ICONS) symbols.push(symbol(name, (await iconData(name)).node))
  symbols.push(symbol('cactus', CACTUS))
  return `<svg width="0" height="0" class="sprite" aria-hidden="true"><defs>${symbols.join('')}</defs></svg>`
}

// ---- Generated blocks ------------------------------------------------------------------------------

const FILL = {
  forest: '#2f6b3c',
  pasture: '#8dbe4d',
  fields: '#e5b93d',
  hills: '#b5542d',
  mountains: '#7b8992',
}
const GLYPH = {
  forest: '#dcebd5',
  pasture: '#2a3d14',
  fields: '#6e4f0c',
  hills: '#fbe5d6',
  mountains: '#f3f8fb',
}
const ICON_OF = {
  forest: 'trees',
  pasture: 'fence',
  fields: 'wheat',
  hills: 'brick-wall',
  mountains: 'mountain-snow',
}

const hexSvg = (terrain) =>
  `<svg viewBox="0 0 87 100" aria-hidden="true"><polygon points="43.5,4 83,27 83,73 43.5,96 4,73 4,27" fill="${FILL[terrain]}" transform="translate(0 4)" opacity=".35"/>` +
  `<polygon points="43.5,4 83,27 83,73 43.5,96 4,73 4,27" fill="${FILL[terrain]}" stroke="rgb(0 0 0 / 20%)"/>` +
  `<use href="#i-${ICON_OF[terrain]}" x="27.5" y="34" width="32" height="32" color="${GLYPH[terrain]}"/></svg>`

const pips = (n) => 6 - Math.abs(7 - n)
const tokenSvg = (n) => {
  const ink = n === 6 || n === 8 ? '#b8332a' : '#2f2718'
  const dots = Array.from(
    { length: pips(n) },
    (_, k) => `<circle cx="${28 + (k - (pips(n) - 1) / 2) * 7}" cy="41" r="2.1" fill="${ink}"/>`,
  ).join('')
  return (
    `<svg viewBox="0 0 56 58" aria-hidden="true"><circle cx="28" cy="30" r="26" fill="rgb(0 0 0 / 25%)"/>` +
    `<circle cx="28" cy="28" r="26" fill="#f8efd8" stroke="#b9a175" stroke-width="1.8"/>` +
    `<text x="28" y="33" text-anchor="middle" font-family="Spectral, Georgia, serif" font-weight="800" font-size="24" fill="${ink}">${n}</text>${dots}</svg>`
  )
}

function heroDecor() {
  const floats = [
    ['hex', 'forest', 'f1'],
    ['hex', 'fields', 'f2'],
    ['hex', 'mountains', 'f3'],
    ['hex', 'hills', 'f4'],
    ['hex', 'pasture', 'f5'],
    ['token', 6, 't1'],
    ['token', 8, 't2'],
    ['token', 4, 't3'],
    ['token', 11, 't4'],
  ]
  return floats
    .map(
      ([kind, what, cls]) =>
        `<span class="float ${kind} ${cls}">${kind === 'hex' ? hexSvg(what) : tokenSvg(what)}</span>`,
    )
    .join('\n            ')
}

function chart() {
  const bars = []
  for (let n = 2; n <= 12; n++) {
    const ways = pips(n)
    const kind = n === 7 ? 'seven' : n === 6 || n === 8 ? 'red' : ''
    bars.push(
      `<li class="${kind}" style="--h:${ways}"><span class="ways">${ways}</span><span class="bar"></span>` +
        `<span class="roll">${n === 7 ? '<span class="dark">7</span>' : tokenSvg(n)}</span></li>`,
    )
  }
  return `<ol class="bars">${bars.join('')}</ol>`
}

function howTiles(t) {
  const tile = (game, selected) => {
    const groups = GROUP_IDS.filter((g) => gameOf(g) === game)
    const meta =
      game === 'base'
        ? t('setup.baseMeta', { n: groups.length })
        : t('setup.seafarersMeta', { n: groups.length })
    return (
      `<div class="mini-tile${selected ? ' selected' : ''}"><span class="mini-hex ${game}"><svg class="icon" aria-hidden="true"><use href="#i-${game === 'base' ? 'house' : 'sailboat'}"/></svg></span>` +
      `<span class="mini-check" aria-hidden="true">${selected ? '<svg class="icon"><use href="#i-check"/></svg>' : ''}</span>` +
      `<strong>${escapeHtml(t(`game.${game}`))}</strong><small>${escapeHtml(meta)}<br>${escapeHtml(groupPlayersLabel(t, groups.flatMap(variantsOf)))}</small></div>`
    )
  }
  return `<div class="mini-tiles">${tile('base', true)}${tile('seafarers', false)}</div>`
}

const howButtons = (t) =>
  `<div class="mini-buttons"><span class="mini-button secondary"><svg class="icon" aria-hidden="true"><use href="#i-sliders-horizontal"/></svg>${escapeHtml(t('board.newGame'))}</span>` +
  `<span class="mini-button"><svg class="icon" aria-hidden="true"><use href="#i-dices"/></svg>${escapeHtml(t('board.newBoard'))}</span></div>`

const sampleCode = (t) => `${t.list('codeWords')[0]}-4821`

function scenarioCards(t, texts) {
  return GROUP_IDS.map((group, i) => {
    const variants = variantsOf(group)
    const variant = resolveVariant(group, 4)
    const base = variant.game === 'base'
    const name = base ? `${t('game.base')} · ${playersLabel(t, variant)}` : scenarioName(t, group)
    return (
      `<li class="scenario${base ? ' base' : ''}">` +
      `<div class="scenario-top"><span class="hex-num small">${base ? i + 1 : variant.number}</span>` +
      `<span class="tag">${escapeHtml(base ? texts('scenarios.base') : texts('scenarios.seafarers'))}</span></div>` +
      `<h3>${escapeHtml(name)}</h3><p>${escapeHtml(texts(`scenarios.texts.${group}`))}</p>` +
      `<p class="meta"><span><svg class="icon" aria-hidden="true"><use href="#i-users"/></svg>${escapeHtml(groupPlayersLabel(t, variants))}</span>` +
      `<span><svg class="icon" aria-hidden="true"><use href="#i-trophy"/></svg>${escapeHtml(victoryLabel(t, variant.victory, true))}</span></p></li>`
    )
  }).join('\n            ')
}

function languageCards(texts) {
  return LANGS.map(({ code, name, tag }) => {
    const own = appTranslator(code)
    return (
      `<li lang="${tag}"><div class="lang-head"><strong>${escapeHtml(name)}</strong><span class="code-badge">${code.toUpperCase()}</span></div>` +
      `<small lang="">${escapeHtml(texts(`langs.names.${code}`))}</small>` +
      `<span class="mini-button wide">${escapeHtml(own('board.newBoard'))}</span>` +
      `<code>${escapeHtml(own('board.codeLabel'))} · ${escapeHtml(sampleCode(own))}</code></li>`
    )
  }).join('\n            ')
}

// ---- Pages ---------------------------------------------------------------------------------------

/** Fills {{key}}: inside a tag the value is attribute text; elsewhere it's (trusted) HTML. */
function render(template, value) {
  let html = template.replace(/<!--[\s\S]*?-->\n?/g, '')
  const fill = (escape) => (_, key) => (escape ? escapeAttribute(value(key)) : value(key))
  for (let pass = 0; pass < 3 && html.includes('{{'); pass++) {
    html = html.replace(/<[^<>]*>/g, (tag) => tag.replace(/\{\{([\w.]+)\}\}/g, fill(true)))
    html = html.replace(/\{\{([\w.]+)\}\}/g, fill(false))
  }
  const left = html.match(/\{\{[^}]*\}\}/)
  if (left) throw new Error(`Unknown placeholder ${left[0]}`)
  return html
}

function page(template, lang, icons) {
  const { code, tag, name, locale } = lang
  const base = code === 'en' ? '' : '../'
  const t = appTranslator(code)
  const texts = (key) => {
    const text = site[code].get(key)
    if (text === undefined) throw new Error(`site/locales/${code}.json has no text for ${key}`)
    return typeset(code, text)
  }
  // The same links serve the menu and the chips; CSS styles each by where it sits.
  const link = (other) =>
    `<li><a href="${base}${dirOf(other.code)}" hreflang="${other.tag}" lang="${other.tag}" ` +
    `data-lang="${other.code}"${other.code === code ? ' aria-current="page"' : ''}>` +
    `<span class="full">${other.name}</span><span class="short">${other.code.toUpperCase()}</span></a></li>`
  const languageLinks = LANGS.map(link).join('\n            ')
  const generated = {
    lang: tag,
    code,
    langName: name,
    langCode: code.toUpperCase(),
    base,
    shots: `${base}screenshots/${code}/`,
    siteUrl: SITE_URL,
    pageUrl: SITE_URL + dirOf(code),
    ogLocale: locale,
    alternates: [
      ...LANGS.map(
        (l) => `<link rel="alternate" hreflang="${l.code}" href="${SITE_URL}${dirOf(l.code)}" />`,
      ),
      `<link rel="alternate" hreflang="x-default" href="${SITE_URL}" />`,
    ].join('\n    '),
    langMenu: languageLinks,
    langChips: languageLinks,
    redirect: code === 'en' ? `${FORWARD}\n    ${REDIRECT}` : FORWARD,
    cssVersion,
    'gen.sprite': icons,
    'gen.heroDecor': heroDecor(),
    'gen.chart': chart(),
    'gen.howTiles': howTiles(t),
    'gen.howButtons': howButtons(t),
    'gen.code': escapeHtml(sampleCode(t)),
    'gen.scenarioCards': scenarioCards(t, texts),
    'gen.languageCards': languageCards(texts),
    ...Object.fromEntries(Object.entries(links(code)).map(([k, v]) => [`links.${k}`, v])),
  }
  return render(template, (key) => (key in generated ? generated[key] : texts(key)))
}

// ---- Files ---------------------------------------------------------------------------------------

const template = await readFile(`${root}site/index.html`, 'utf8')
/** The screenshots the template shows. */
const shots = [...new Set([...template.matchAll(/\{\{shots\}\}([\w-]+\.png)/g)].map((m) => m[1]))]

// Pages may serve a cached stylesheet for 10 minutes; a URL that changes with its content makes a
// deploy load the matching CSS at once.
const cssVersion = createHash('sha256')
  .update(await readFile(`${root}site/styles.css`))
  .digest('hex')
  .slice(0, 10)

await rm(out, { recursive: true, force: true })
await mkdir(`${out}fonts`, { recursive: true })
await cp(`${root}site/styles.css`, `${out}styles.css`)
const FONTS = [
  'alegreya-sc/files/alegreya-sc-latin-800-normal.woff2',
  'alegreya-sc/files/alegreya-sc-cyrillic-800-normal.woff2',
  'pt-sans/files/pt-sans-latin-400-normal.woff2',
  'pt-sans/files/pt-sans-cyrillic-400-normal.woff2',
  'pt-sans/files/pt-sans-latin-700-normal.woff2',
  'pt-sans/files/pt-sans-cyrillic-700-normal.woff2',
  'spectral/files/spectral-latin-800-normal.woff2',
  'pt-mono/files/pt-mono-latin-400-normal.woff2',
  'pt-mono/files/pt-mono-cyrillic-400-normal.woff2',
]
for (const font of FONTS)
  await cp(`${root}node_modules/@fontsource/${font}`, `${out}fonts/${font.split('/').pop()}`)
await cp(`${root}public/favicon.svg`, `${out}favicon.svg`)
await cp(`${root}public/pwa-512x512.png`, `${out}icon-512.png`)

const icons = await sprite()
for (const lang of LANGS) {
  await mkdir(`${out}screenshots/${lang.code}`, { recursive: true })
  for (const shot of shots) {
    try {
      await cp(`${root}.screenshots/${lang.code}/${shot}`, `${out}screenshots/${lang.code}/${shot}`)
    } catch {
      problems.push(`No ${lang.code} screenshot ${shot}: run npm run site:shots`)
    }
  }
  await mkdir(`${out}${dirOf(lang.code)}`, { recursive: true })
  await writeFile(`${out}${dirOf(lang.code)}index.html`, page(template, lang, icons))
}

// Every local file a page or the stylesheet points at must exist.
let checked = 0
const check = async (file, ref) => {
  const target = new URL(ref.split('?')[0], `file://${file}`)
  checked++
  try {
    await stat(fileURLToPath(target))
  } catch {
    problems.push(`${file.slice(out.length)} points at missing ${ref}`)
  }
}
for (const lang of LANGS) {
  const file = `${out}${dirOf(lang.code)}index.html`
  const html = await readFile(file, 'utf8')
  for (const [, ref] of html.matchAll(/(?:src|href)="([^"#:]+)"/g)) await check(file, ref)
}
const css = await readFile(`${out}styles.css`, 'utf8')
for (const [, ref] of css.matchAll(/url\('([^')]+)'\)/g)) await check(`${out}styles.css`, ref)

if (problems.length) {
  for (const problem of problems) console.error(`✗ ${problem}`)
  process.exit(1)
}
console.log(`_site/ ready: ${LANGS.length} languages, ${checked} local references, all present`)
