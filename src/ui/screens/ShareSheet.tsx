import { ImageDown, Link, Printer, Share2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Sheet } from '../components/Kit.tsx'
import { useT } from '../i18n/index.ts'
import styles from './share.module.css'

/** 10 · Share sheet: the code and four ways to pass the board on. */
export function ShareSheet({
  code,
  url,
  canSend,
  onCopy,
  onSend,
  onPrint,
  onPng,
  onClose,
}: {
  code: string
  url: string
  canSend: boolean
  onCopy: () => void
  onSend: () => void
  onPrint: () => void
  onPng: () => void
  onClose: () => void
}) {
  const t = useT()
  const hash = url.slice(url.indexOf('#'))
  const action = (icon: ReactNode, label: string, run: () => void, disabled = false) => (
    <button type="button" className={styles.action} onClick={run} disabled={disabled}>
      <span className={styles.actionIcon}>{icon}</span>
      <span>{label}</span>
    </button>
  )
  return (
    <Sheet title={t('share.title')} onClose={onClose}>
      <div className={styles.codeCard}>
        <span className={styles.label}>{t('share.codeLabel')}</span>
        <span className={styles.code}>{code}</span>
        <span className={styles.url}>…/{hash}</span>
        <span className={styles.note}>{t('share.note')}</span>
      </div>
      <div className={styles.actions}>
        {action(<Link size={24} />, t('share.copy'), onCopy)}
        {action(<Share2 size={24} />, t('share.send'), onSend, !canSend)}
        {action(<Printer size={24} />, t('share.print'), onPrint)}
        {action(<ImageDown size={24} />, t('share.png'), onPng)}
      </div>
    </Sheet>
  )
}
