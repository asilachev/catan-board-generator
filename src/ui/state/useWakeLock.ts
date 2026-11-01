import { useEffect } from 'react'

/**
 * Keeps the screen awake while `active` (a game is on screen), so the phone doesn't lock at the
 * table. The browser drops the lock when the page is hidden, so it is re-requested when the page
 * becomes visible again. Silently does nothing where the Screen Wake Lock API is unsupported or
 * refused (e.g. battery saver).
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let pending = false
    let cancelled = false

    const request = async () => {
      // One request at a time: a second one would overwrite the first lock, which then leaks.
      if (sentinel || pending || document.visibilityState !== 'visible') return
      pending = true
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void lock.release()
          return
        }
        sentinel = lock
        lock.addEventListener('release', () => {
          if (sentinel === lock) sentinel = null
        })
      } catch {
        // Refused or unavailable: the app works fine without it.
      } finally {
        pending = false
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release()
      sentinel = null
    }
  }, [active])
}
