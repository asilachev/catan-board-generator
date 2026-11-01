import { ChevronLeft, Info } from 'lucide-react'
import { useState } from 'react'
import { Card, RadioDot } from '../components/Kit.tsx'
import { LANGS, useI18n, type Lang } from '../i18n/index.ts'
import styles from './screens.module.css'

/**
 * 06 · Language, opened from Setup. The app starts in the browser's language; a pick here applies
 * at once and is remembered (board codes stay valid in every language).
 */
export function LanguageScreen({
  initial,
  onPick,
  onBack,
}: {
  initial: Lang
  onPick: (lang: Lang) => void
  onBack: () => void
}) {
  const { t } = useI18n()
  const [picked, setPicked] = useState<Lang>(initial)
  const choose = (lang: Lang) => {
    setPicked(lang)
    onPick(lang)
  }
  return (
    <main className={`${styles.screen} ${styles.paper} ${styles.pushed}`}>
      <div className={styles.backRow}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ChevronLeft size={22} aria-hidden="true" />
          {t('common.back')}
        </button>
      </div>
      <h1 className={styles.screenTitle}>{t('language.title')}</h1>
      <p className={styles.lead}>{t('language.subtitle')}</p>
      <Card>
        <div role="radiogroup" aria-label={t('language.title')}>
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={picked === l.code}
              className={styles.row}
              onClick={() => choose(l.code)}
              lang={l.tag}
            >
              <span className={styles.langBadge}>{l.code.toUpperCase()}</span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{l.name}</span>
                <span className={styles.rowMeta}>{l.sample}</span>
              </span>
              <RadioDot on={picked === l.code} />
            </button>
          ))}
        </div>
      </Card>
      <p className={styles.note}>
        <Info size={18} aria-hidden="true" />
        {t('language.note')}
      </p>
    </main>
  )
}
