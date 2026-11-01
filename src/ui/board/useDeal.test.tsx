import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DealTiming } from './timing.ts'
import { useDealProgress } from './useDeal.ts'

const TIMING: DealTiming = {
  tilesStart: 120,
  tilesEnd: 790,
  tokensStart: 630,
  tokenStagger: 15,
  tokensEnd: 1045,
  harborsStart: 985,
  total: 1305,
}
const COUNTS = { tiles: 19, tokens: 18, stagger: 25, tokenStagger: 15 }

/** An element whose clock animation stands still at `currentTime` until `finish()` is called. */
function fakeClock(currentTime: number) {
  let finish = () => {}
  const finished = new Promise<void>((resolve) => {
    finish = resolve
  })
  const element = { getAnimations: () => [{ currentTime, finished }] } as unknown as HTMLElement
  return { ref: { current: element }, finish }
}

describe('deal progress (design 09)', () => {
  it('counts the hexes dealt so far, from the clock animation', async () => {
    const clock = fakeClock(450)
    const { result } = renderHook(() =>
      useDealProgress(clock.ref, 'a', true, TIMING, COUNTS, () => {}),
    )
    await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))))
    expect(result.current).toEqual({ phase: 'tiles', done: 14, of: 19 })
  })

  it('ends when the clock finishes, and shows nothing once the deal is over', async () => {
    const clock = fakeClock(700)
    const onEnd = vi.fn()
    const { result, rerender } = renderHook(
      ({ running }: { running: boolean }) =>
        useDealProgress(clock.ref, 'a', running, TIMING, COUNTS, onEnd),
      { initialProps: { running: true } },
    )
    await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))))
    expect(result.current?.phase).toBe('tokens')
    await act(async () => clock.finish())
    expect(onEnd).toHaveBeenCalledOnce()
    rerender({ running: false })
    expect(result.current).toBeNull()
  })

  it('ends at once without Web Animations', () => {
    const onEnd = vi.fn()
    const ref = { current: {} as HTMLElement }
    renderHook(() => useDealProgress(ref, 'a', true, TIMING, COUNTS, onEnd))
    expect(onEnd).toHaveBeenCalledOnce()
  })
})
