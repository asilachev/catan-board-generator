import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToasts } from '../components/toast.ts'
import { useT } from '../i18n/index.ts'

/**
 * Service-worker toasts (design: Feedback): "Works offline" after the first full cache, "A new
 * version is ready · Reload" in prompt mode (the board lives in the address and in storage, so
 * reloading loses nothing), and a note when the network drops.
 */
export function usePwaToasts(): void {
  const toasts = useToasts()
  const t = useT()
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!needRefresh) return
    toasts.push({
      key: 'update',
      tone: 'info',
      title: t('toasts.update'),
      duration: 0,
      action: { label: t('toasts.reload'), run: () => void updateServiceWorker(true) },
    })
  }, [needRefresh, toasts, updateServiceWorker, t])

  useEffect(() => {
    if (!offlineReady) return
    toasts.push({
      key: 'offline-ready',
      tone: 'info',
      title: t('toasts.offlineReady'),
      sub: t('toasts.offlineReadySub'),
      duration: 4000,
    })
  }, [offlineReady, toasts, t])

  useEffect(() => {
    const offline = () =>
      toasts.push({ key: 'network', tone: 'plain', title: t('toasts.offline'), duration: 4000 })
    const online = () => toasts.dismiss('network')
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    return () => {
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', online)
    }
  }, [toasts, t])
}
