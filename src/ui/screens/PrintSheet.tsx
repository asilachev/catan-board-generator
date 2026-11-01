import type { Board } from '../../engine/index.ts'
import { BoardSvg } from '../board/BoardSvg.tsx'
import { boardTitle, victoryLabel } from '../format.ts'
import { useT } from '../i18n/index.ts'
import { ScenarioDetails } from './ScenarioScreen.tsx'
import styles from './screens.module.css'

/** What "Print" puts on paper: the board, its code and link, and what to take from the box. */
export function PrintSheet({
  board,
  url,
  fogRevealed,
}: {
  board: Board
  url: string
  fogRevealed: boolean
}) {
  const t = useT()
  const title = boardTitle(t, board.variant)
  return (
    <div className={`print-only ${styles.print}`} aria-hidden="true">
      <h1>{t('share.printTitle', { scenario: title, code: board.code })}</h1>
      <p className={styles.printMeta}>
        {victoryLabel(t, board.variant.victory)} · {url}
      </p>
      <BoardSvg
        board={board}
        t={t}
        fogRevealed={fogRevealed}
        animate={false}
        label={t('board.label', { scenario: title, code: board.code })}
        className={styles.printBoard}
      />
      <ScenarioDetails variant={board.variant} board={board} t={t} compact />
    </div>
  )
}
