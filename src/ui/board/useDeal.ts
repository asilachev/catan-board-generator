import { useEffect, useEffectEvent, useState, type RefObject } from 'react'
import type { DealTiming } from './timing.ts'

export type DealPhase = 'tiles' | 'tokens' | 'harbors'

export interface DealProgress {
  readonly phase: DealPhase
  /** Pieces placed so far in this phase. */
  readonly done: number
  readonly of: number
}

/**
 * Follows a running deal by reading its clock animation (board.module.css → .clock), so the
 * progress pill always matches what is drawn, even when the animation is paused for a screenshot.
 * Returns null when no deal is running.
 */
export function useDealProgress(
  clock: RefObject<HTMLElement | null>,
  /** Changes with every deal, so a new deal re-reads the new clock. */
  dealKey: string,
  running: boolean,
  timing: DealTiming,
  counts: {
    readonly tiles: number
    readonly tokens: number
    readonly stagger: number
    readonly tokenStagger: number
  },
  onEnd: () => void,
): DealProgress | null {
  const [progress, setProgress] = useState<DealProgress | null>(null)
  const ended = useEffectEvent(onEnd)

  useEffect(() => {
    if (!running) return
    const el = clock.current
    const animation = el?.getAnimations?.()[0]
    // No Web Animations (tests, very old browsers) or reduced motion: done at once.
    if (!animation) {
      ended()
      return
    }
    let frame = 0
    const tick = () => {
      const now = Number(animation.currentTime ?? 0)
      if (now < timing.tokensStart) {
        setProgress({
          phase: 'tiles',
          done: Math.min(
            counts.tiles,
            Math.max(1, Math.floor((now - timing.tilesStart) / counts.stagger) + 1),
          ),
          of: counts.tiles,
        })
      } else if (now < timing.harborsStart || timing.harborsStart >= timing.total) {
        const placed = Math.floor((now - timing.tokensStart) / Math.max(1, counts.tokenStagger)) + 1
        setProgress({
          phase: 'tokens',
          done: Math.min(counts.tokens, Math.max(1, placed)),
          of: counts.tokens,
        })
      } else {
        setProgress({ phase: 'harbors', done: 1, of: 1 })
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    // `finished` settles even when the deal ended before this effect ran (very short animations
    // under reduced motion); a cancelled animation (a new deal) rejects it.
    let current = true
    animation.finished.then(
      () => {
        if (current) ended()
      },
      () => {},
    )
    return () => {
      current = false
      cancelAnimationFrame(frame)
    }
  }, [
    clock,
    dealKey,
    running,
    timing,
    counts.tiles,
    counts.tokens,
    counts.stagger,
    counts.tokenStagger,
  ])

  return running ? progress : null
}
