import { Check, Info, TriangleAlert, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n/index.ts'
import { EXIT_MS, prefersReducedMotion } from '../motion.ts'
import styles from './toaster.module.css'
import { ToastContext, type ToastApi, type ToastInput } from './toast.ts'

interface Live extends ToastInput {
  readonly id: number
  readonly leaving?: boolean
}

const ICONS = { success: Check, info: Info, warn: TriangleAlert } as const

/**
 * Toasts rise 16 px and fade in, hold 2.4 s, then fade out (design: Transitions → Copy link). A
 * toast pushed again with the same key updates in place instead of rising again.
 */
export function Toaster({ children }: { children: ReactNode }) {
  const t = useT()
  const [toasts, setToasts] = useState<Live[]>([])
  const next = useRef(1)
  const keyIds = useRef(new Map<string, number>())
  const timers = useRef(new Map<number, number>())

  const clearTimer = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])

  const remove = useCallback(
    (id: number) => {
      clearTimer(id)
      for (const [key, value] of keyIds.current) if (value === id) keyIds.current.delete(key)
      setToasts((ts) => ts.filter((x) => x.id !== id))
    },
    [clearTimer],
  )

  const leave = useCallback(
    (id: number) => {
      clearTimer(id)
      if (prefersReducedMotion()) return remove(id)
      setToasts((ts) => ts.map((x) => (x.id === id ? { ...x, leaving: true } : x)))
      timers.current.set(
        id,
        window.setTimeout(() => remove(id), EXIT_MS),
      )
    },
    [clearTimer, remove],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending.values()) window.clearTimeout(timer)
    }
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      push(toast) {
        const known = toast.key === undefined ? undefined : keyIds.current.get(toast.key)
        const id = known ?? next.current++
        if (toast.key !== undefined) keyIds.current.set(toast.key, id)
        setToasts((ts) =>
          ts.some((x) => x.id === id)
            ? ts.map((x) => (x.id === id ? { ...toast, id } : x))
            : [...ts, { ...toast, id }].slice(-2),
        )
        clearTimer(id)
        const duration = toast.duration ?? 2400
        if (duration > 0)
          timers.current.set(
            id,
            window.setTimeout(() => leave(id), duration),
          )
      },
      dismiss(key) {
        const id = keyIds.current.get(key)
        if (id !== undefined) leave(id)
      },
    }),
    [clearTimer, leave],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={`${styles.toasts} screen-only`} role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = toast.tone && toast.tone !== 'plain' ? ICONS[toast.tone] : null
          return (
            <div key={toast.id} className={styles.toast} data-leaving={toast.leaving === true}>
              {Icon ? (
                <span className={styles.icon} data-tone={toast.tone}>
                  <Icon size={18} strokeWidth={2.6} aria-hidden="true" />
                </span>
              ) : null}
              <span className={styles.text}>
                <strong>{toast.title}</strong>
                {toast.sub ? <span>{toast.sub}</span> : null}
              </span>
              {toast.action ? (
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => {
                    toast.action?.run()
                    leave(toast.id)
                  }}
                >
                  {toast.action.label}
                </button>
              ) : null}
              {toast.duration === 0 ? (
                <button
                  type="button"
                  className={styles.close}
                  aria-label={t('common.dismiss')}
                  onClick={() => leave(toast.id)}
                >
                  <X size={18} />
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
