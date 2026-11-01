import { Hexagon, ScrollText, SlidersHorizontal } from 'lucide-react'
import { useT } from '../i18n/index.ts'
import styles from './tabbar.module.css'

export type Tab = 'board' | 'setup' | 'scenario'

const TABS = [
  { id: 'board', icon: Hexagon },
  { id: 'setup', icon: SlidersHorizontal },
  { id: 'scenario', icon: ScrollText },
] as const

/** The floating wooden tab bar (design: Tab Bar). */
export function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const t = useT()
  return (
    <nav className={`${styles.wrap} screen-only`} aria-label={t('tabs.label')}>
      <div className={styles.bar}>
        {TABS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={styles.tab}
            aria-current={active === id ? 'page' : undefined}
            onClick={() => onChange(id)}
          >
            <Icon size={22} aria-hidden="true" />
            <span>{t(`tabs.${id}`)}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
