import { ChevronLeft, Info } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Eyebrow, RadioDot } from '../components/Kit.tsx'
import { LogoMark } from '../components/Logo.tsx'
import { LANGS, useI18n, type Lang } from '../i18n/index.ts'
import styles from './screens.module.css'

/**
 * 06 · Language. On first launch it starts on the browser's language and Continue saves the
 * choice; from Setup a pick applies at once (board codes stay valid in every language).
 */
export function LanguageScreen({
  firstLaunch,
  initial,
  onPick,
  onDone,
}: {
  firstLaunch: boolean
  initial: Lang
  onPick: (lang: Lang) => void
  onDone: (lang: Lang) => void
}) {
  const { t } = useI18n()
  const [picked, setPicked] = useState<Lang>(initial)
  const choose = (lang: Lang) => {
    setPicked(lang)
    onPick(lang)
  }
  return (
    <main className={`${styles.screen} ${styles.paper} ${firstLaunch ? '' : styles.pushed}`}>
      {firstLaunch ? (
        <LogoMark size={46} />
      ) : (
        <div className={styles.backRow}>
          <button type="button" className={styles.backButton} onClick={() => onDone(picked)}>
            <ChevronLeft size={22} aria-hidden="true" />
            {t('common.back')}
          </button>
        </div>
      )}
      {firstLaunch ? (
        <div style={{ marginTop: 26 }}>
          <Eyebrow>{t('language.eyebrow')}</Eyebrow>
        </div>
      ) : null}
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
      {firstLaunch ? (
        <div className={styles.cta} style={{ marginTop: 24 }}>
          <Button onClick={() => onDone(picked)}>{t('language.continue')}</Button>
        </div>
      ) : null}
    </main>
  )
}
