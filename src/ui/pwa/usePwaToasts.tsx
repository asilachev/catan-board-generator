import { useEffect, useEffectEvent } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToasts } from '../components/toast.ts'
import { useT } from '../i18n/index.ts'
import { watchForUpdates } from './watchForUpdates.ts'

/**
 * Service-worker toasts (design: Feedback): "Works offline" after the first full cache, "A new
 * version is ready · Reload" in prompt mode (the board lives in the address and in storage, so
 * reloading loses nothing), and a note when the network drops. New versions are looked for on
 * load, when the app comes back to the foreground and hourly (watchForUpdates).
 */
export function usePwaToasts(): void {
  const toasts = useToasts()
  const t = useT()
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) watchForUpdates(registration)
    },
  })

  // Each toast is pushed when its event happens, in the language of that moment; switching the
  // language later doesn't push it again.
  const showUpdate = useEffectEvent(() =>
    toasts.push({
      key: 'update',
      tone: 'info',
      title: t('toasts.update'),
      duration: 0,
      action: { label: t('toasts.reload'), run: () => void updateServiceWorker(true) },
    }),
  )
  const showOfflineReady = useEffectEvent(() =>
    toasts.push({
      key: 'offline-ready',
      tone: 'info',
      title: t('toasts.offlineReady'),
      sub: t('toasts.offlineReadySub'),
      duration: 4000,
    }),
  )
  const showOffline = useEffectEvent(() =>
    toasts.push({ key: 'network', tone: 'plain', title: t('toasts.offline'), duration: 4000 }),
  )
  const hideOffline = useEffectEvent(() => toasts.dismiss('network'))

  useEffect(() => {
    if (needRefresh) showUpdate()
  }, [needRefresh])

  useEffect(() => {
    if (offlineReady) showOfflineReady()
  }, [offlineReady])

  useEffect(() => {
    const offline = () => showOffline()
    const online = () => hideOffline()
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    return () => {
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', online)
    }
  }, [])
}
