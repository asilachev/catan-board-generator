import { createContext, useContext } from 'react'

export interface ToastInput {
  readonly title: string
  readonly sub?: string
  /** success (green check), info (blue), warn (gold triangle) or plain. */
  readonly tone?: 'success' | 'info' | 'warn' | 'plain'
  readonly action?: { readonly label: string; readonly run: () => void }
  /** Milliseconds; 0 keeps it, with a dismiss button, until dismissed or replaced. Default 2400. */
  readonly duration?: number
  /** Toasts with the same key replace each other. */
  readonly key?: string
}

export interface ToastApi {
  push(toast: ToastInput): void
  dismiss(key: string): void
}

export const ToastContext = createContext<ToastApi>({ push: () => {}, dismiss: () => {} })

export const useToasts = (): ToastApi => useContext(ToastContext)
