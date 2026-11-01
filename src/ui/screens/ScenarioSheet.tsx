import { Check, Trophy } from 'lucide-react'
import {
  groupsOf,
  resolveVariant,
  type Game,
  type GroupId,
  type Seats,
} from '../../engine/index.ts'
import { HexNumber, Sheet } from '../components/Kit.tsx'
import { baseCounts, playersLabel, scenarioLine, scenarioName } from '../format.ts'
import { useT } from '../i18n/index.ts'
import styles from './screens.module.css'

/** 08 · Scenario sheet: pick one of the game's layouts or scenarios. */
export function ScenarioSheet({
  game,
  current,
  seats,
  onPick,
  onClose,
}: {
  game: Game
  current: GroupId
  seats: Seats
  onPick: (group: GroupId) => void
  onClose: () => void
}) {
  const t = useT()
  return (
    <Sheet
      eyebrow={game === 'base' ? t('sheet.baseEyebrow') : t('sheet.seaEyebrow')}
      title={t('sheet.title')}
      onClose={onClose}
    >
      <div className={styles.sheetList} role="listbox" aria-label={t('sheet.title')}>
        {groupsOf(game).map((group, i) => {
          const variant = resolveVariant(group, seats)
          const selected = group === current
          return (
            <button
              key={group}
              type="button"
              role="option"
              aria-selected={selected}
              className={styles.row}
              onClick={() => onPick(group)}
            >
              <HexNumber n={variant.number ?? i + 1} selected={selected} />
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>
                  {game === 'base'
                    ? `${t('game.base')} · ${playersLabel(t, variant)}`
                    : scenarioName(t, group)}
                </span>
                <span className={styles.rowMeta}>
                  {game === 'base' ? baseCounts(t, variant) : scenarioLine(t, variant)}
                </span>
              </span>
              {selected ? (
                <Check size={22} className={styles.sheetCheck} aria-hidden="true" />
              ) : game === 'base' ? (
                <span className={styles.vpChip}>
                  <Trophy size={16} aria-hidden="true" />
                  {variant.victory.points}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
