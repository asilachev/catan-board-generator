import { ChevronDown, Copy, Dices, Hash, Hexagon, Share2, SlidersHorizontal } from 'lucide-react'
import { useMemo, useRef, type CSSProperties, type ReactNode, type Ref } from 'react'
import type { Board } from '../../engine/index.ts'
import { BoardViewport } from '../board/BoardViewport.tsx'
import { LanguageMenu } from '../components/LanguageMenu.tsx'
import { boardGeometry } from '../board/geometry.ts'
import { Legend } from '../board/Legend.tsx'
import { dealtTokens, dealTiming, tileStagger } from '../board/timing.ts'
import { useDealProgress } from '../board/useDeal.ts'
import boardStyles from '../board/board.module.css'
import { Button, IconButton } from '../components/Kit.tsx'
import { LogoMark } from '../components/Logo.tsx'
import { boardTitle } from '../format.ts'
import { useT } from '../i18n/index.ts'
import styles from './screens.module.css'

/** 01 · Board and 04 · Seafarers board: the dealt board, its code and the next deal. */
export function BoardScreen({
  board,
  dealKey,
  animate,
  fogRevealed,
  install,
  svgRef,
  onDealEnd,
  onNewBoard,
  onNewGame,
  onShare,
  onCopy,
  onPickScenario,
}: {
  board: Board
  dealKey: string
  animate: boolean
  fogRevealed: boolean
  install: ReactNode
  svgRef: Ref<SVGSVGElement>
  onDealEnd: () => void
  onNewBoard: () => void
  /** Ends this game: a fresh code, and Setup for the next one. */
  onNewGame: () => void
  onShare: () => void
  onCopy: () => void
  onPickScenario: () => void
}) {
  const t = useT()
  const clock = useRef<HTMLSpanElement>(null)
  const geometry = useMemo(() => boardGeometry(board), [board])
  const timing = useMemo(() => dealTiming(geometry, fogRevealed), [geometry, fogRevealed])
  const counts = useMemo(
    () => ({
      tiles: geometry.cells.length,
      tokens: dealtTokens(geometry, fogRevealed),
      stagger: tileStagger(geometry.cells.length),
      tokenStagger: timing.tokenStagger,
    }),
    [geometry, fogRevealed, timing],
  )
  const progress = useDealProgress(clock, dealKey, animate, timing, counts, onDealEnd)
  const dealing = animate
  const title = boardTitle(t, board.variant)
  const sea = board.variant.game === 'seafarers'

  const pill =
    progress === null
      ? null
      : progress.phase === 'tiles'
        ? t('board.dealingHexes', { n: progress.done, total: progress.of })
        : progress.phase === 'tokens'
          ? t('board.dealingTokens', { n: progress.done, total: progress.of })
          : t('board.dealingHarbors')

  return (
    <main className={`${styles.screen} ${styles.sea} sea`}>
      <header className={styles.boardHeader}>
        <LogoMark size={48} />
        <div className={styles.titles}>
          <h1 className={styles.appTitle}>{t('app.name')}</h1>
          <button
            type="button"
            className={styles.scenarioPicker}
            onClick={onPickScenario}
            aria-label={t('board.changeScenario', { scenario: title })}
          >
            <span>{title}</span>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.headerActions}>
          <LanguageMenu tone="sea" />
          <IconButton
            label={t('board.share')}
            tone="sea"
            onClick={onShare}
            className={styles.shareButton}
          >
            <Share2 size={22} />
          </IconButton>
        </div>
      </header>

      {install}

      <section className={styles.boardArea} data-sea={sea}>
        {pill ? (
          <p className={styles.pill} role="status" data-deal-pill="">
            <Hexagon size={16} aria-hidden="true" />
            {pill}
          </p>
        ) : null}
        {animate ? (
          <span
            key={dealKey}
            ref={clock}
            className={boardStyles.clock}
            style={{ '--deal-total': `${timing.total}ms` } as CSSProperties}
            aria-hidden="true"
          />
        ) : null}
        <BoardViewport
          board={board}
          t={t}
          fogRevealed={fogRevealed}
          animate={animate}
          dealKey={dealKey}
          label={t('board.label', { scenario: title, code: board.code })}
          svgRef={svgRef}
          framed={sea}
        />
      </section>

      <div className={styles.codeCard}>
        <Hash size={28} className={styles.codeHash} aria-hidden="true" />
        <div className={styles.codeText}>
          <span className={styles.codeLabel}>{t('board.codeLabel')}</span>
          <span className={styles.codeValue}>{board.code}</span>
        </div>
        <IconButton label={t('board.copyLink')} tone="sea" onClick={onCopy}>
          <Copy size={22} />
        </IconButton>
      </div>

      <Legend board={board} t={t} fogRevealed={fogRevealed} />

      <div className={styles.actions}>
        <Button variant="sea" icon={<SlidersHorizontal size={22} />} onClick={onNewGame}>
          {t('board.newGame')}
        </Button>
        <Button icon={<Dices size={24} />} loading={dealing} onClick={onNewBoard}>
          {dealing ? t('board.dealing') : t('board.newBoard')}
        </Button>
      </div>
    </main>
  )
}
