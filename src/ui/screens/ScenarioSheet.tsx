import { Check, House, Sailboat, Trophy } from 'lucide-react'
import { useState } from 'react'
import {
  groupsOf,
  resolveVariant,
  type Game,
  type GroupId,
  type Seats,
} from '../../engine/index.ts'
import { HexNumber, Segmented, Sheet } from '../components/Kit.tsx'
import { baseCounts, playersLabel, scenarioLine, scenarioName } from '../format.ts'
import { useT } from '../i18n/index.ts'
import styles from './screens.module.css'

/**
 * 08 · Scenario sheet: pick one of the game's layouts or scenarios. Opened from the board, it
 * switches the game too, so any board is two taps away.
 */
export function ScenarioSheet({
  game: currentGame,
  current,
  seats,
  switchGame,
  onPick,
  onClose,
}: {
  game: Game
  current: GroupId
  seats: Seats
  switchGame: boolean
  onPick: (group: GroupId) => void
  onClose: () => void
}) {
  const t = useT()
  const [game, setGame] = useState<Game>(currentGame)
  return (
    <Sheet
      eyebrow={game === 'base' ? t('sheet.baseEyebrow') : t('sheet.seaEyebrow')}
      title={t('sheet.title')}
      onClose={onClose}
    >
      {switchGame ? (
        <div className={styles.sheetGames}>
          <Segmented
            label={t('setup.game')}
            value={game}
            onChange={setGame}
            options={[
              {
                value: 'base',
                label: t('game.base'),
                icon: <House size={18} aria-hidden="true" />,
              },
              {
                value: 'seafarers',
                label: t('game.seafarers'),
                icon: <Sailboat size={18} aria-hidden="true" />,
              },
            ]}
          />
        </div>
      ) : null}
      <div className={styles.sheetList} role="listbox" aria-label={t('sheet.title')}>
        {groupsOf(game).map((group, i) => {
          const variant = resolveVariant(group, seats)
          const selected = group === current && game === currentGame
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
