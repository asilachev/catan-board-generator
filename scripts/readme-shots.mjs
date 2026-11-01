// Frames the README's screenshots (#28): six English screens of the app, each in the landing
// page's phone (site/styles.css), every image exactly the same size.
//
//   npm run readme:shots    captures the screens, then writes docs/screenshots/<name>.png
//
// It reads .screenshots/en/<name>.png, which `npm run screenshots` writes, and draws each phone
// 270 px wide at 2×. The background is transparent and the page's drop shadow is off, so the
// phones sit on GitHub's light and dark themes alike.
import { mkdir, readFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const SHOTS = ['board', 'seaBoard', 'sheet', 'setup', 'scenario', 'share']
/** The phone's width in CSS pixels; the images are twice as wide, plus room for the buttons. */
const WIDTH = 270
const PAD = 4
const OUT = new URL('../docs/screenshots/', import.meta.url)

const css = await readFile(new URL('../site/styles.css', import.meta.url), 'utf8')
const page = (png) => `<!doctype html>
<style>${css}</style>
<style>
  html, body { margin: 0; background: transparent; }
  .frame { display: inline-block; padding: ${PAD}px; }
  .phone { width: ${WIDTH}px; --phone-shadow: 0 0 #0000; }
</style>
<div class="frame">
  <figure class="phone">
    <img src="data:image/png;base64,${png.toString('base64')}" width="780" height="1688" alt="" />
  </figure>
</div>`

async function pngSize(file) {
  const png = await readFile(file)
  return `${png.readUInt32BE(16)}×${png.readUInt32BE(20)}`
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : { channel: 'chrome' }),
  args: ['--disable-gpu', '--force-color-profile=srgb', '--font-render-hinting=none'],
})
const sizes = new Map()
try {
  const tab = await browser.newPage({
    viewport: { width: WIDTH + 2 * PAD, height: 1200 },
    deviceScaleFactor: 2,
  })
  for (const name of SHOTS) {
    const source = new URL(`../.screenshots/en/${name}.png`, import.meta.url)
    await tab.setContent(page(await readFile(source)))
    await tab.locator('img').evaluate((img) => img.decode())
    const file = new URL(`${name}.png`, OUT)
    await tab.locator('.frame').screenshot({ path: file.pathname, omitBackground: true })
    sizes.set(name, await pngSize(file))
    console.log(`✓ ${name} ${sizes.get(name)}`)
  }
} finally {
  await browser.close()
}
if (new Set(sizes.values()).size !== 1) {
  console.error('README screenshots must all be the same size:', Object.fromEntries(sizes))
  process.exit(1)
}
