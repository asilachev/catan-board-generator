import { Check, Share, Smartphone, SquarePlus, X } from 'lucide-react'
import { Button, Sheet } from '../components/Kit.tsx'
import { LogoMark } from '../components/Logo.tsx'
import { useT } from '../i18n/index.ts'
import styles from './pwa.module.css'

/** 12 · Install prompt: a banner on the board while the browser offers to install the app. */
export function InstallBanner({
  ios,
  onInstall,
  onDismiss,
}: {
  ios: boolean
  onInstall: () => void
  onDismiss: () => void
}) {
  const t = useT()
  return (
    <section className={styles.banner} aria-label={t('pwa.installTitle')}>
      <LogoMark size={44} />
      <div className={styles.bannerText}>
        <strong>{t('pwa.installTitle')}</strong>
        <small>{t('pwa.installSub')}</small>
      </div>
      <button type="button" className={styles.install} onClick={onInstall}>
        {ios ? t('pwa.how') : t('pwa.install')}
      </button>
      <button
        type="button"
        className={styles.dismiss}
        aria-label={t('pwa.notNow')}
        onClick={onDismiss}
      >
        <X size={20} />
      </button>
    </section>
  )
}

const STEP_ICONS = [Share, SquarePlus, Smartphone] as const

/** iPhone and iPad Safari have no install prompt: the steps, from the banner's "How". */
export function IosInstallSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  const steps = t.list('pwa.iosSteps')
  return (
    <Sheet title={t('pwa.iosTitle')} onClose={onClose}>
      <ol className={styles.steps}>
        {STEP_ICONS.map((Icon, i) => (
          <li key={i}>
            <span className={styles.stepNumber} aria-hidden="true">
              {i + 1}
            </span>
            <span className={styles.stepText}>{steps[i]}</span>
            <Icon size={22} aria-hidden="true" />
          </li>
        ))}
      </ol>
      <Button icon={<Check size={22} />} onClick={onClose} className={styles.gotIt}>
        {t('pwa.gotIt')}
      </Button>
    </Sheet>
  )
}

/** 05 · Splash: logo, name and a three-hex loader, on launch from the home screen. */
export function Splash({ leaving }: { leaving: boolean }) {
  const t = useT()
  return (
    <div className={styles.splash} data-leaving={leaving} aria-hidden="true">
      <div className={styles.splashCenter}>
        <div className={styles.splashLogo}>
          <LogoMark size={128} pips />
        </div>
        <p className={styles.splashTitle}>{t('app.name')}</p>
        <p className={styles.splashSub}>{t('app.tagline')}</p>
      </div>
      <div className={styles.loader}>
        <span />
        <span />
        <span />
      </div>
      <p className={styles.splashStatus}>{t('app.loading')}</p>
    </div>
  )
}
