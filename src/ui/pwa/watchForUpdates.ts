/** At most one check per this long, however often the app comes back. */
export const MIN_GAP = 5 * 60_000
/** And one per hour while the app stays open in the foreground. */
export const HOURLY = 60 * 60_000

/**
 * Asks the service worker for a new version when the app comes back to the foreground, and hourly
 * while it stays open (docs/design.md → PWA). The browser itself looks only when the page loads,
 * and an installed app often resumes without loading (iOS does). A found version waits, and
 * "A new version is ready · Reload" says so. Returns a function that stops watching.
 */
export function watchForUpdates(
  registration: { update: () => Promise<unknown> },
  now: () => number = Date.now,
): () => void {
  let last = now()
  const check = () => {
    if (document.visibilityState !== 'visible' || !navigator.onLine) return
    if (now() - last < MIN_GAP) return
    last = now()
    registration.update().catch(() => {
      // Offline or the server is away: the next check tries again.
    })
  }
  const onVisible = () => check()
  document.addEventListener('visibilitychange', onVisible)
  const timer = window.setInterval(check, HOURLY)
  return () => {
    document.removeEventListener('visibilitychange', onVisible)
    window.clearInterval(timer)
  }
}
