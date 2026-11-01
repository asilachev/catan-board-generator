import type { Board } from '../../engine/index.ts'
import type { Translate } from '../i18n/index.ts'
import { FILL, LEGEND_ORDER, type Look } from './terrain.ts'
import styles from './legend.module.css'

/** The terrains on this board with their resource, in three columns (design 01, 04). */
export function Legend({
  board,
  t,
  fogRevealed,
}: {
  board: Board
  t: Translate
  fogRevealed: boolean
}) {
  const present = new Set<Look>()
  for (const c of board.cells) present.add(c.kind === 'fog' && !fogRevealed ? 'fog' : c.terrain)
  // Seafarers boards always show their open sea.
  if (board.variant.game === 'seafarers') present.add('sea')
  const looks = LEGEND_ORDER.filter((l) => present.has(l))
  return (
    <ul className={styles.legend} aria-label={t('board.legend')}>
      {looks.map((look) => (
        <li key={look}>
          <svg width="18" height="20" viewBox="0 0 18 20" aria-hidden="true">
            <polygon
              points="9,0.5 17.2,5.25 17.2,14.75 9,19.5 0.8,14.75 0.8,5.25"
              fill={FILL[look]}
              stroke="rgb(0 0 0 / 25%)"
            />
          </svg>
          <span>
            <strong>{t(`terrain.${look}`)}</strong>
            <small>{t(`resource.${look}`)}</small>
          </span>
        </li>
      ))}
    </ul>
  )
}
