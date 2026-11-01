import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { LANGS, langInfo, useI18n } from '../i18n/index.ts'
import styles from './languageMenu.module.css'

/**
 * The language, at the top of Board and Setup (#21): a compact button with the current code, and
 * a dropdown of the five languages in their own names. A pick applies at once and is remembered;
 * board codes stay valid in every language.
 */
export function LanguageMenu({ tone }: { tone: 'sea' | 'paper' }) {
  const { lang, t, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const menuId = useId()

  const close = (focusButton: boolean) => {
    setOpen(false)
    if (focusButton) button.current?.focus()
  }

  // A tap outside closes it; the current language takes the focus when it opens.
  useEffect(() => {
    if (!open) return
    items.current[LANGS.findIndex((l) => l.code === lang)]?.focus()
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open, lang])

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = items.current.findIndex((el) => el === document.activeElement)
    const move = (to: number) => {
      event.preventDefault()
      items.current[(to + LANGS.length) % LANGS.length]?.focus()
    }
    if (event.key === 'ArrowDown') move(at + 1)
    else if (event.key === 'ArrowUp') move(at - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(LANGS.length - 1)
    else if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    } else if (event.key === 'Tab') setOpen(false)
  }

  return (
    <div className={styles.root} ref={root} data-tone={tone}>
      <button
        ref={button}
        type="button"
        className={styles.button}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t('language.button', { name: langInfo(lang).name })}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.code}>{lang.toUpperCase()}</span>
        <ChevronDown size={16} aria-hidden="true" className={styles.chevron} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t('language.title')}
          className={styles.menu}
          onKeyDown={onMenuKey}
        >
          {LANGS.map((l, i) => (
            <button
              key={l.code}
              ref={(el) => {
                items.current[i] = el
              }}
              type="button"
              role="menuitemradio"
              aria-checked={l.code === lang}
              lang={l.tag}
              className={styles.item}
              onClick={() => {
                setLang(l.code)
                close(true)
              }}
            >
              <span className={styles.badge}>{l.code.toUpperCase()}</span>
              <span className={styles.name}>{l.name}</span>
              {l.code === lang ? <Check size={18} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
