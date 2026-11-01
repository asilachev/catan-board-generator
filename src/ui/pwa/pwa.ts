import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

/** The app icon (also the manifest icon), precached by the service worker. */
export const APP_ICON = '/pwa-512x512.png'

/** Running from the home screen (installed), not in a browser tab. */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iPhone or iPad Safari, where installing means Share → Add to Home Screen. */
export function isIosSafari(nav: Navigator = navigator): boolean {
  const ua = nav.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1)
  // Other iOS browsers and in-app web views put Share elsewhere, or can't install at all.
  return ios && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua)
}

/** Asks the browser not to evict saved settings under storage pressure (PWA checklist). */
export function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.().catch(() => {})
  } catch {
    // Unsupported: settings are still saved, just without the guarantee.
  }
}

/** Chrome's deferred install prompt; not in the DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<unknown>
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let listening = false
const subscribers = new Set<() => void>()
const notify = () => {
  for (const subscriber of subscribers) subscriber()
}
const subscribe = (onChange: () => void) => {
  subscribers.add(onChange)
  return () => {
    subscribers.delete(onChange)
  }
}

/**
 * Keeps Chrome's `beforeinstallprompt` so the board can offer its own install banner (design 12).
 * Call once at startup: the event can fire before React mounts.
 */
export function listenForInstallPrompt(target: Window = window): void {
  if (listening) return
  listening = true
  target.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })
  target.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

/** Whether the browser offered to install the app, and a way to show its prompt. */
export function useInstallPrompt(): { readonly available: boolean; install(): Promise<void> } {
  const available = useSyncExternalStore(
    subscribe,
    () => deferredPrompt !== null,
    () => false,
  )
  const install = useCallback(async () => {
    const event = deferredPrompt
    if (!event) return
    // A prompt can be shown only once; Chrome fires a new event if it may ask again.
    deferredPrompt = null
    notify()
    try {
      await event.prompt()
      await event.userChoice
    } catch {
      // Already used or refused: nothing to do.
    }
  }, [])
  return { available, install }
}

export type SplashPhase = 'on' | 'leaving' | 'off'

const SPLASH_MS = 900
const SPLASH_FADE_MS = 300

/** 05 · Splash: on each launch from the home screen the logo shows briefly, then fades out. */
export function useSplash(): SplashPhase {
  const [phase, setPhase] = useState<SplashPhase>(() => (isStandalone() ? 'on' : 'off'))
  useEffect(() => {
    if (phase === 'off') return
    const timer = setTimeout(
      () => setPhase(phase === 'on' ? 'leaving' : 'off'),
      phase === 'on' ? SPLASH_MS : SPLASH_FADE_MS,
    )
    return () => clearTimeout(timer)
  }, [phase])
  return phase
}
