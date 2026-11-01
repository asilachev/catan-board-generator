import ptSans from '../../../node_modules/@fontsource/pt-sans/files/pt-sans-latin-700-normal.woff2?url'
import spectral from '../../../node_modules/@fontsource/spectral/files/spectral-latin-800-normal.woff2?url'

/**
 * "Save PNG" (design 10): the board on a sea background at 2×, with its code underneath. An SVG
 * drawn into a canvas can't see the page's fonts, so the numerals' fonts are embedded.
 */

async function dataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(blob)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image failed'))
    img.src = src
  })
}

export async function boardPng(svg: SVGSVGElement, caption: string, scale = 2): Promise<Blob> {
  const [box] = [svg.viewBox.baseVal]
  const width = Math.round((box?.width ?? 400) * scale)
  const height = Math.round((box?.height ?? 400) * scale)
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.removeAttribute('class')
  const [spectralData, sansData] = await Promise.all([dataUrl(spectral), dataUrl(ptSans)])
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent =
    `@font-face{font-family:'Spectral';font-weight:800;src:url(${spectralData}) format('woff2')}` +
    `@font-face{font-family:'PT Sans';font-weight:700;src:url(${sansData}) format('woff2')}`
  clone.insertBefore(style, clone.firstChild)
  const svgUrl = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }),
  )
  try {
    const image = await loadImage(svgUrl)
    const pad = 24 * scale
    const footer = 44 * scale
    const canvas = document.createElement('canvas')
    canvas.width = width + pad * 2
    canvas.height = height + pad * 2 + footer
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    const sea = ctx.createRadialGradient(canvas.width / 2, 0, 0, canvas.width / 2, 0, canvas.height)
    sea.addColorStop(0, '#2a7db5')
    sea.addColorStop(0.5, '#1a5f8c')
    sea.addColorStop(1, '#0d3f5e')
    ctx.fillStyle = sea
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, pad, pad, width, height)
    await document.fonts?.load(`${16 * scale}px "PT Mono"`).catch(() => [])
    ctx.fillStyle = '#f6ecd6'
    ctx.font = `${16 * scale}px "PT Mono", ui-monospace, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(caption, canvas.width / 2, canvas.height - pad / 2 - footer / 2)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no blob'))), 'image/png'),
    )
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

/** Offers a file to save. */
export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}
