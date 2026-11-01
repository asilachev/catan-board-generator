import { Minus, MoveHorizontal, Plus } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react'
import type { Board } from '../../engine/index.ts'
import { IconButton } from '../components/Kit.tsx'
import type { Translate } from '../i18n/index.ts'
import { BoardSvg } from './BoardSvg.tsx'
import { boardGeometry, HEX_W } from './geometry.ts'
import styles from './viewport.module.css'

/** A hex is never drawn narrower than this at the start, so numbers stay readable (design 04). */
const READABLE_HEX = 50
const ZOOM_MIN = 0.6
const ZOOM_MAX = 2
const ZOOM_STEP = 1.25

/**
 * The board, fitted to the screen. A board wider than the screen keeps readable tiles and
 * scrolls sideways instead, with ± buttons, pinch zoom from 0.6× to 2× and a double tap that
 * fits it to the width (design: Wide board).
 */
export function BoardViewport({
  board,
  t,
  fogRevealed,
  animate,
  dealKey,
  label,
  svgRef,
  framed,
}: {
  board: Board
  t: Translate
  fogRevealed: boolean
  animate: boolean
  dealKey: string
  label: string
  svgRef?: Ref<SVGSVGElement>
  /** Seafarers: the board sits in a rounded sea panel. */
  framed: boolean
}) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  // Each board starts at its natural size.
  const [zoomed, setZoomed] = useState({ id: board.variant.id, zoom: 1 })
  const zoom = zoomed.id === board.variant.id ? zoomed.zoom : 1
  const setZoom = useCallback(
    (z: number) => setZoomed({ id: board.variant.id, zoom: z }),
    [board.variant.id],
  )
  const [scroll, setScroll] = useState({ left: 0, max: 0, client: 1, total: 1 })
  const vb = useMemo(() => boardGeometry(board).viewBox, [board])
  // Where zooming is heading. Touch events can come faster than renders, so each pinch step
  // starts from the zoom and scroll the last step asked for, not from the last render.
  const live = useRef<{
    zoom: number
    target: { left: number; top: number } | null
    frame: number
  }>({ zoom, target: null, frame: 0 })
  useLayoutEffect(() => {
    live.current.zoom = zoom
  }, [zoom])

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Before the first measurement (and in tests) the board is drawn at its natural size.
  const fit = width > 0 ? width / vb.width : 1
  const readable = READABLE_HEX / HEX_W
  const base = framed ? Math.max(fit, readable) : fit
  const wide = base * vb.width > width + 1
  const minZoom = Math.min(ZOOM_MIN, fit / base)
  const scale = base * zoom
  const w = Math.round(vb.width * scale)
  const h = Math.round(vb.height * scale)

  const updateScroll = useCallback(() => {
    const el = box.current
    if (!el) return
    setScroll({
      left: el.scrollLeft,
      max: el.scrollWidth - el.clientWidth,
      client: el.clientWidth,
      total: el.scrollWidth,
    })
  }, [])

  useLayoutEffect(updateScroll, [w, h, updateScroll])

  /** Zooms around a point of the viewport (its centre by default), keeping that point still. */
  const zoomTo = useCallback(
    (next: number, at?: { x: number; y: number }) => {
      const el = box.current
      const clamped = Math.min(ZOOM_MAX, Math.max(minZoom, next))
      const state = live.current
      const ratio = clamped / state.zoom
      state.zoom = clamped
      setZoom(clamped)
      if (!el) return
      const px = at?.x ?? el.clientWidth / 2
      const py = at?.y ?? el.clientHeight / 2
      const from = state.target ?? { left: el.scrollLeft, top: el.scrollTop }
      state.target = { left: (from.left + px) * ratio - px, top: (from.top + py) * ratio - py }
      cancelAnimationFrame(state.frame)
      state.frame = requestAnimationFrame(() => {
        if (state.target) {
          el.scrollLeft = state.target.left
          el.scrollTop = state.target.top
        }
        state.target = null
      })
    },
    [minZoom, setZoom],
  )

  // Pinch with two fingers; one finger scrolls natively.
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null)
  useEffect(() => {
    const el = box.current
    if (!el || !framed) return
    const distance = (e: TouchEvent) => {
      const [a, b] = [e.touches[0], e.touches[1]]
      return a && b ? Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) : 0
    }
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) pinch.current = { distance: distance(e), zoom: live.current.zoom }
    }
    const onMove = (e: TouchEvent) => {
      if (!pinch.current || e.touches.length !== 2) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const [a, b] = [e.touches[0], e.touches[1]]
      const at =
        a && b
          ? {
              x: (a.clientX + b.clientX) / 2 - rect.left,
              y: (a.clientY + b.clientY) / 2 - rect.top,
            }
          : undefined
      zoomTo((pinch.current.zoom * distance(e)) / Math.max(1, pinch.current.distance), at)
    }
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch.current = null
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [framed, zoomTo])

  const onPointerUp = (e: React.PointerEvent) => {
    if (!framed || e.pointerType === 'mouse') return
    const now = performance.now()
    const prev = lastTap.current
    lastTap.current = { time: now, x: e.clientX, y: e.clientY }
    if (prev && now - prev.time < 300 && Math.hypot(prev.x - e.clientX, prev.y - e.clientY) < 30) {
      lastTap.current = null
      // Double tap: fit to the width, or back to readable tiles.
      zoomTo(Math.abs(zoom - fit / base) < 0.01 ? 1 : fit / base)
    }
  }

  const thumb = scroll.total > 0 ? scroll.client / scroll.total : 1
  const thumbLeft = scroll.max > 0 ? (scroll.left / scroll.max) * (1 - thumb) : 0

  return (
    <div>
      <div className={styles.wrap} data-framed={framed}>
        <div
          ref={box}
          className={styles.viewport}
          data-framed={framed}
          data-wide={wide || zoom > 1}
          onScroll={updateScroll}
          onPointerUp={onPointerUp}
        >
          <div className={styles.canvas} style={{ width: w || undefined, height: h || undefined }}>
            <BoardSvg
              key={dealKey}
              ref={svgRef}
              board={board}
              t={t}
              fogRevealed={fogRevealed}
              animate={animate}
              width={w}
              height={h}
              label={label}
            />
          </div>
        </div>
        {framed && (wide || zoom !== 1) ? (
          <>
            <div className={styles.zoom}>
              <IconButton
                label={t('board.zoomIn')}
                tone="sea"
                onClick={() => zoomTo(zoom * ZOOM_STEP)}
                disabled={zoom >= ZOOM_MAX}
              >
                <Plus size={22} />
              </IconButton>
              <IconButton
                label={t('board.zoomOut')}
                tone="sea"
                onClick={() => zoomTo(zoom / ZOOM_STEP)}
                disabled={zoom <= minZoom + 0.001}
              >
                <Minus size={22} />
              </IconButton>
            </div>
            {scroll.max > 1 ? (
              <div className={styles.track} aria-hidden="true">
                <span style={{ width: `${thumb * 100}%`, left: `${thumbLeft * 100}%` }} />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      {framed && scroll.max > 1 ? (
        <p className={styles.hint}>
          <MoveHorizontal size={18} aria-hidden="true" />
          {t('board.wide')}
        </p>
      ) : null}
    </div>
  )
}
