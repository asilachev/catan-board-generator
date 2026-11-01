// Captures the app in each language for the landing page, from real states of the real app.
//
//   npm run screenshots                  English into .screenshots/en/
//   npm run site:shots                   all five languages into .screenshots/<lang>/
//
// Every phone shot is a 390×844 viewport at 2×, so every PNG is exactly 780×1688; the script
// fails if any differs. The deal frames (deal-0 … deal-900) are crops of the board while it
// deals, frozen at that moment. It drives the installed Google Chrome through playwright-core
// (set CHROME_PATH to use another Chromium) against `vite preview` of dist/.
//
// Options, e.g. `npm run screenshots -- --lang ru,de --only board,setup`:
//   --lang en,es,de,ru,sr   languages (default en)
//   --only board,setup      shots whose names start with these
//   --out <dir>             where to write; a folder per language inside (default .screenshots)
//   --width 360             viewport width, e.g. to check a narrow phone (default 390)
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

const { values: opt } = parseArgs({
  options: {
    lang: { type: 'string', default: 'en' },
    only: { type: 'string' },
    out: { type: 'string', default: '.screenshots' },
    width: { type: 'string' },
  },
})
const TAGS = { en: 'en-GB', es: 'es-ES', de: 'de-DE', ru: 'ru-RU', sr: 'sr-Cyrl-RS' }
/** Each language's own name, as the language menu shows it. */
const NAMES = { en: 'English', es: 'Español', de: 'Deutsch', ru: 'Русский', sr: 'Српски' }
const LANGS = opt.lang.split(',').map((l) => l.trim())
for (const lang of LANGS) if (!(lang in TAGS)) throw new Error(`Unknown language ${lang}`)
const VIEWPORT = { width: Number(opt.width ?? 390), height: 844 }
const SCALE = 2
const PREFS_KEY = 'catan-boards:v1:prefs'
const SETTINGS_KEY = 'catan-boards:v1:settings'

/** Example codes in each language's own words (design: Languages). */
const WORDS = {
  en: ['anchor', 'surf'],
  es: ['ancla', 'oleaje'],
  de: ['anker', 'brandung'],
  ru: ['якорь', 'прибой'],
  sr: ['сидро', 'талас'],
}
// Version 2 boards (a link without `v=` is dealt as v1 dealt it, docs/design.md → Share links).
const board = (lang, s = 'base34', p = 4) =>
  `#s=${s}&p=${p}&c=${encodeURIComponent(`${WORDS[lang][0]}-4821`)}&v=2`
const seaBoard = (lang) => `#s=s1&p=4&c=${encodeURIComponent(`${WORDS[lang][1]}-3170`)}&v=2`

async function translator(lang) {
  const catalog = JSON.parse(
    await readFile(new URL(`../src/ui/i18n/locales/${lang}.json`, import.meta.url), 'utf8'),
  )
  return (key) => {
    const value = key.split('.').reduce((node, part) => node?.[part], catalog)
    if (typeof value !== 'string') throw new Error(`No text for ${key} in ${lang}`)
    return value.replace(/\s+/g, ' ').trim()
  }
}

const pattern = (text) =>
  new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s'))

/** Freezes every running animation at `ms` from the start of the deal. */
const freezeAt = (page, ms) =>
  page.evaluate((t) => {
    for (const a of document.getAnimations()) {
      a.pause()
      a.currentTime = t
    }
  }, ms)

/** Deals the board again (same code) from Setup's Build board, and waits until it runs. */
async function startDeal(page, T) {
  await page.getByRole('button', { name: T('tabs.setup'), exact: true }).click()
  await page.getByRole('button', { name: T('setup.build') }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .some((a) => String(a.animationName ?? '').includes('clock') && a.playState === 'running'),
  )
}

/** The states to capture: [hash, prefs, settings, actions, context options, crop selector]. */
function shotsFor(lang, T) {
  const prefs = { language: lang, launches: 1, installHiddenUntil: 0 }
  const tab = (key) => (page) =>
    page.getByRole('button', { name: T(`tabs.${key}`), exact: true }).click()
  const sea = {
    game: 'seafarers',
    base: 'base34',
    sea: 's1',
    seats: 4,
    code: `${WORDS[lang][1]}-3170`,
    options: { red: true, same: true, spread: true, letters: false, printed: false },
    fog: false,
    version: 2,
  }
  // The board alone, without the progress pill (the storyboard frames).
  const deal = (ms, crop = 'main section > div') => [
    board(lang),
    prefs,
    null,
    async (page) => {
      await startDeal(page, T)
      await freezeAt(page, ms)
      // The storyboard frames show the board alone; the generating screen keeps its pill.
      if (crop) await page.addStyleTag({ content: '[data-deal-pill] { visibility: hidden }' })
    },
    { reducedMotion: 'no-preference' },
    crop,
  ]
  return {
    board: [board(lang), prefs],
    setup: [board(lang), prefs, null, tab('setup')],
    scenario: [board(lang), prefs, null, tab('scenario')],
    share: [
      board(lang),
      prefs,
      null,
      (page) => page.getByRole('button', { name: T('board.share') }).click(),
    ],
    // The language menu open at the top of Setup (#21).
    language: [
      board(lang),
      prefs,
      null,
      async (page) => {
        await tab('setup')(page)
        await page
          .getByRole('button', { name: T('language.button').replace('{name}', NAMES[lang]) })
          .click()
      },
    ],
    generating: deal(410, null),
    splash: [
      board(lang),
      prefs,
      null,
      null,
      {},
      null,
      // Launched from the home screen, with time stopped so the splash stays.
      async (context) => {
        await context.addInitScript(() => {
          const real = window.matchMedia.bind(window)
          window.matchMedia = (q) =>
            q.includes('display-mode: standalone')
              ? { ...real(q), matches: true, media: q }
              : real(q)
        })
      },
      true,
    ],
    seaBoard: [seaBoard(lang), prefs],
    seaSetup: [seaBoard(lang), prefs, sea, tab('setup')],
    sheet: [
      seaBoard(lang),
      prefs,
      sea,
      async (page) => {
        await tab('setup')(page)
        await page
          .getByRole('button', { name: pattern(T('scenarios.s1.name')) })
          .first()
          .click()
      },
    ],
    install: [
      board(lang),
      { ...prefs, launches: 3 },
      null,
      (page) =>
        page.evaluate(() => {
          const event = new Event('beforeinstallprompt', { cancelable: true })
          Object.assign(event, {
            prompt: () => Promise.resolve(),
            userChoice: Promise.resolve({ outcome: 'dismissed' }),
          })
          window.dispatchEvent(event)
        }),
    ],
    'deal-0': deal(80),
    'deal-300': deal(380),
    'deal-700': deal(760),
    'deal-900': deal(1000),
  }
}

async function pngSize(file) {
  const png = await readFile(file)
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}

const only = opt.only?.split(',').map((s) => s.trim())
const pick = (shots) =>
  Object.entries(shots).filter(([name]) => !only || only.some((o) => name.startsWith(o)))

const server = await preview({ logLevel: 'error', preview: { port: 4181, open: false } })
const url = server.resolvedUrls?.local[0]
if (!url) throw new Error('vite preview did not start')
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : { channel: 'chrome' }),
  // Software rendering and a fixed colour profile, so reruns produce the same pixels.
  args: ['--disable-gpu', '--force-color-profile=srgb', '--font-render-hinting=none'],
})

const failures = []
try {
  for (const lang of LANGS) {
    const T = await translator(lang)
    const out = `${resolve(opt.out)}/${lang}/`
    await mkdir(out, { recursive: true })
    const selected = pick(shotsFor(lang, T))
    if (selected.length === 0) throw new Error(`No shots match --only ${opt.only}`)
    for (const [
      name,
      [hash, prefs, settings, act, options = {}, crop = null, setup = null, frozen = false],
    ] of selected) {
      const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: SCALE,
        reducedMotion: 'reduce',
        locale: TAGS[lang],
        // No service worker: its "Works offline" toast would cover the screens.
        serviceWorkers: 'block',
        ...options,
      })
      await context.addInitScript(
        ([pk, pv, sk, sv]) => {
          try {
            localStorage.clear()
            if (pv) localStorage.setItem(pk, pv)
            if (sv) localStorage.setItem(sk, sv)
          } catch {
            // about:blank has no storage.
          }
        },
        [
          PREFS_KEY,
          prefs ? JSON.stringify(prefs) : null,
          SETTINGS_KEY,
          settings ? JSON.stringify(settings) : null,
        ],
      )
      if (setup) await setup(context)
      const page = await context.newPage()
      if (frozen) await page.clock.install()
      await page.goto(`${url}${hash}`, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      if (act) await act(page)
      if (!frozen)
        await page.evaluate(
          () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
        )
      const file = `${out}${name}.png`
      if (crop) await page.locator(crop).first().screenshot({ path: file, animations: 'allow' })
      else
        await page.screenshot({
          path: file,
          animations: frozen || name === 'generating' ? 'allow' : 'disabled',
          caret: 'hide',
        })
      await context.close()
      if (!crop) {
        const { width, height } = await pngSize(file)
        if (width !== VIEWPORT.width * SCALE || height !== VIEWPORT.height * SCALE)
          failures.push(`${lang}/${name}: ${width}×${height}`)
      }
      console.log(`✓ ${lang} ${name}`)
    }
  }
} finally {
  await browser.close()
  await server.close()
}
if (failures.length > 0) {
  console.error(`Screenshots must be ${VIEWPORT.width * SCALE}×${VIEWPORT.height * SCALE}:`)
  for (const line of failures) console.error(`  ✗ ${line}`)
  process.exit(1)
}
