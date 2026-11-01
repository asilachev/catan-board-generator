import { Check, LoaderCircle, X } from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { useT } from '../i18n/index.ts'
import { EXIT_MS, prefersReducedMotion } from '../motion.ts'
import styles from './kit.module.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** `sea` is the secondary button on the dark board screen. */
  variant?: 'primary' | 'secondary' | 'sea'
  icon?: ReactNode
  /** Shows a spinner instead of the icon and blocks presses. */
  loading?: boolean
}

/** Tactile button: a darker bottom edge that sinks when pressed (design: States → Buttons). */
export function Button({
  variant = 'primary',
  icon,
  loading = false,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.button} ${className ?? ''}`}
      data-variant={variant}
      data-loading={loading}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className={styles.spin} size={22} aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  )
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  tone?: 'paper' | 'sea' | 'tint'
  children: ReactNode
}

export function IconButton({
  label,
  tone = 'paper',
  children,
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.iconButton} ${className ?? ''}`}
      data-tone={tone}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className={styles.eyebrow}>{children}</p>
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 className={styles.sectionTitle} id={id}>
      {children}
    </h2>
  )
}

/** A rounded card with rows separated by hairlines. */
export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string | undefined
}) {
  return <div className={`${styles.card} ${className ?? ''}`}>{children}</div>
}

/** The Toggle Row: the whole row is the switch. */
export function ToggleRow({
  title,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  title: string
  hint: string
  checked: boolean
  onChange: (on: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={`${id}-hint`}
      className={styles.toggleRow}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.toggleText}>
        <span className={styles.toggleTitle}>{title}</span>
        <span className={styles.toggleHint} id={`${id}-hint`}>
          {hint}
        </span>
      </span>
      <span className={styles.switch} data-on={checked} aria-hidden="true">
        <span className={styles.knob} />
      </span>
    </button>
  )
}

export interface SegmentOption<T extends string | number> {
  readonly value: T
  readonly label: string
  readonly icon?: ReactNode
}

/** Two or three choices side by side (Players: 3 / 4). */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={styles.segment}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A scenario number in a hexagon (Scenario sheet, Setup, landing cards). */
export function HexNumber({ n, selected = false }: { n: number; selected?: boolean }) {
  return (
    <span className={styles.hexNumber} data-selected={selected} aria-hidden="true">
      {n}
    </span>
  )
}

/** A radio dot, drawn so it never changes size between states. */
export function RadioDot({ on }: { on: boolean }) {
  return <span className={styles.radio} data-on={on} aria-hidden="true" />
}

/** The check in the corner of a selected tile. */
export function CheckDot({ on }: { on: boolean }) {
  return (
    <span className={styles.checkDot} data-on={on} aria-hidden="true">
      {on ? <Check size={16} strokeWidth={3} /> : null}
    </span>
  )
}

/**
 * Bottom sheet over a 40% scrim (design 08 and 10): slides up, closes on the scrim, the close
 * button, Escape, or a drag down on its top.
 */
export function Sheet({
  eyebrow,
  title,
  onClose,
  children,
  tone = 'paper',
}: {
  eyebrow?: string | undefined
  title: string
  onClose: () => void
  children: ReactNode
  tone?: 'paper' | 'sea'
}) {
  const t = useT()
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const [leaving, setLeaving] = useState(false)
  const [drag, setDrag] = useState(0)
  const start = useRef<number | null>(null)

  const close = () => {
    if (leaving) return
    if (prefersReducedMotion()) return onClose()
    setLeaving(true)
    window.setTimeout(onClose, EXIT_MS)
  }

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus?.()
    }
    // Runs once per opening; `close` only reads refs and state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPointerDown = (e: ReactPointerEvent) => {
    start.current = e.clientY
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current))
  }
  const onPointerUp = () => {
    if (start.current === null) return
    start.current = null
    if (drag > 80) close()
    else setDrag(0)
  }

  return (
    <div className={styles.sheetRoot} data-leaving={leaving}>
      <div className={styles.scrim} onClick={close} aria-hidden="true" />
      <div
        ref={panel}
        className={styles.sheet}
        data-tone={tone}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
      >
        <div
          className={styles.sheetGrip}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className={styles.handle} aria-hidden="true" />
          <div className={styles.sheetHead}>
            <div>
              {eyebrow ? <p className={styles.sheetEyebrow}>{eyebrow}</p> : null}
              <h2 className={styles.sheetTitle} id={titleId}>
                {title}
              </h2>
            </div>
            <IconButton
              label={t('common.close')}
              onClick={close}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <X size={22} />
            </IconButton>
          </div>
        </div>
        <div className={styles.sheetBody}>{children}</div>
      </div>
    </div>
  )
}
