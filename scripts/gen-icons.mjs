// Generates the app's icons from one original drawing: a gold-field hex with a red 8 token on the
// sea (docs/design.md → Visual language). No CATAN art or marks.
//
//   npm run icons      writes public/favicon.svg, docs/assets/logo.svg and the PNGs:
//                      public/pwa-192x192.png, pwa-512x512.png, maskable-512x512.png,
//                      apple-touch-icon.png (rendered with Google Chrome via playwright-core;
//                      set CHROME_PATH to use another Chromium)
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('..', import.meta.url))

/** The mark on a 128 × 128 sea tile. `rounded` for the favicon, `scale` for maskable icons. */
function icon({ rounded = false, scale = 1 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Board Generator logo">
  <defs>
    <radialGradient id="sea" cx="50%" cy="0%" r="115%">
      <stop offset="0" stop-color="#2a7db5"/>
      <stop offset="0.5" stop-color="#1a5f8c"/>
      <stop offset="1" stop-color="#0d3f5e"/>
    </radialGradient>
  </defs>
  <rect width="128" height="128" rx="${rounded ? 28 : 0}" fill="url(#sea)"/>
  <g transform="translate(64 64) scale(${scale}) translate(-64 -64)">
    <polygon points="64,17 104.7,40.5 104.7,87.5 64,111 23.3,87.5 23.3,40.5" fill="#8a6a1a" transform="translate(0 3)" opacity="0.45"/>
    <polygon points="64,17 104.7,40.5 104.7,87.5 64,111 23.3,87.5 23.3,40.5" fill="#e8bb3f" stroke="#8a6a1a" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="64" cy="64" r="24" fill="#f8efd8" stroke="#8a6a1a" stroke-width="3"/>
    <ellipse cx="64" cy="55.6" rx="6.4" ry="6" fill="none" stroke="#b8332a" stroke-width="5"/>
    <ellipse cx="64" cy="71" rx="8.2" ry="8.4" fill="none" stroke="#b8332a" stroke-width="5.4"/>
  </g>
</svg>
`
}

const favicon = icon({ rounded: true })
await mkdir(`${root}public`, { recursive: true })
await mkdir(`${root}docs/assets`, { recursive: true })
await writeFile(`${root}public/favicon.svg`, favicon)
await writeFile(`${root}docs/assets/logo.svg`, favicon)

const PNGS = [
  ['pwa-192x192.png', 192, icon()],
  ['pwa-512x512.png', 512, icon()],
  ['maskable-512x512.png', 512, icon({ scale: 0.74 })],
  ['apple-touch-icon.png', 180, icon()],
]

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' },
)
try {
  for (const [name, size, svg] of PNGS) {
    const page = await browser.newPage({ viewport: { width: size, height: size } })
    const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    await page.setContent(
      `<body style="margin:0"><img src="${src}" width="${size}" height="${size}" style="display:block"></body>`,
    )
    await page.waitForFunction(() => document.images[0]?.complete)
    await page.screenshot({
      path: `${root}public/${name}`,
      clip: { x: 0, y: 0, width: size, height: size },
    })
    await page.close()
    console.log(`✓ public/${name}`)
  }
} finally {
  await browser.close()
}
console.log('✓ public/favicon.svg, docs/assets/logo.svg')
