import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HOURLY, MIN_GAP, watchForUpdates } from './watchForUpdates.ts'

describe('looking for a new version (docs/design.md → PWA)', () => {
  let clock = 0
  let visibility: DocumentVisibilityState = 'visible'
  const update = vi.fn(() => Promise.resolve())
  const setVisibility = (state: DocumentVisibilityState) => {
    visibility = state
    document.dispatchEvent(new Event('visibilitychange'))
  }

  beforeEach(() => {
    vi.useFakeTimers()
    clock = 0
    update.mockClear()
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('checks when the app comes back, at most once in a few minutes', () => {
    const stop = watchForUpdates({ update }, () => clock)
    setVisibility('hidden')
    clock = MIN_GAP - 1
    setVisibility('visible')
    expect(update).not.toHaveBeenCalled()
    setVisibility('hidden')
    clock = MIN_GAP + 1
    setVisibility('visible')
    expect(update).toHaveBeenCalledTimes(1)
    stop()
  })

  it('checks hourly while open, never while hidden, and stops when asked', () => {
    const stop = watchForUpdates({ update }, () => clock)
    clock = HOURLY
    vi.advanceTimersByTime(HOURLY)
    expect(update).toHaveBeenCalledTimes(1)
    visibility = 'hidden'
    clock = 2 * HOURLY
    vi.advanceTimersByTime(HOURLY)
    expect(update).toHaveBeenCalledTimes(1)
    stop()
    visibility = 'visible'
    clock = 3 * HOURLY
    vi.advanceTimersByTime(HOURLY)
    setVisibility('visible')
    expect(update).toHaveBeenCalledTimes(1)
  })
})
