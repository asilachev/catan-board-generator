import { Eye } from 'lucide-react'
import { forwardRef, type CSSProperties } from 'react'
import { pips, type Board, type Cell } from '../../engine/index.ts'
import type { Translate } from '../i18n/index.ts'
import { boardGeometry, HARBOR_R, hexPoints, R, SAND, TILE, TOKEN_R, TOKEN_Y } from './geometry.ts'
import { dealTiming, HARBOR_STAGGER, tileStagger } from './timing.ts'
import { EDGE, FILL, GLYPH, ICON, type Look } from './terrain.ts'
import styles from './board.module.css'

const isRed = (n: number) => n === 6 || n === 8

type Vars = CSSProperties & Record<`--${string}`, string | number>

function Token({
  num,
  letter,
  x,
  y,
  r = TOKEN_R,
  label,
}: {
  num: number
  letter?: string | null
  x: number
  y: number
  r?: number
  label?: string | undefined
}) {
  const ink = isRed(num) ? '#b8332a' : '#2f2718'
  const dots = pips(num)
  const scale = r / TOKEN_R
  const gap = 4 * scale
  return (
    <g aria-label={label}>
      <circle cx={x} cy={y + 1} r={r} fill="rgb(0 0 0 / 22%)" />
      <circle cx={x} cy={y} r={r} fill="#f8efd8" stroke="#b9a175" strokeWidth={1.2 * scale} />
      <text
        x={x}
        y={y - 2.2 * scale}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Spectral, Georgia, serif"
        fontWeight={800}
        fontSize={(num >= 10 ? 13.5 : 14.5) * scale}
        fill={ink}
      >
        {num}
      </text>
      {Array.from({ length: dots }, (_, k) => (
        <circle
          key={k}
          cx={x + (k - (dots - 1) / 2) * gap}
          cy={y + 7.4 * scale}
          r={1.25 * scale}
          fill={ink}
        />
      ))}
      {letter ? (
        <text
          x={x}
          y={y + r + 8}
          textAnchor="middle"
          fontFamily="'PT Sans', system-ui, sans-serif"
          fontWeight={700}
          fontSize={8}
          fill="#2f2415"
          opacity={0.6}
        >
          {letter}
        </text>
      ) : null}
    </g>
  )
}

function Glyph({ look, size, y }: { look: Look; size: number; y: number }) {
  const Icon = ICON[look]
  return (
    <Icon
      x={-size / 2}
      y={y}
      width={size}
      height={size}
      size={size}
      color={GLYPH[look]}
      strokeWidth={2}
      aria-hidden="true"
    />
  )
}

function Tile({
  look,
  cell,
  fogPeek,
  t,
}: {
  look: Look
  cell: Cell | null
  fogPeek: boolean
  t: Translate
}) {
  const glyphSize = 0.5625 * R
  const showsToken = cell?.num !== null && cell?.num !== undefined && look !== 'fog'
  return (
    <>
      <polygon points={hexPoints(0, 2.6, TILE)} fill={EDGE[look]} />
      <polygon
        points={hexPoints(0, 0, TILE)}
        fill={FILL[look]}
        stroke="rgb(0 0 0 / 20%)"
        strokeWidth={1}
      />
      {look === 'fog' ? (
        <Glyph look="fog" size={0.75 * R} y={-0.375 * R} />
      ) : (
        <Glyph
          look={look}
          size={glyphSize}
          y={showsToken || cell?.villages ? -0.72 * R : -glyphSize / 2}
        />
      )}
      {cell?.villages && look !== 'fog' ? (
        <g
          aria-label={t('board.villages', { a: cell.villages[0] ?? '', b: cell.villages[1] ?? '' })}
        >
          {cell.villages.map((v, k) => (
            <Token key={k} num={v} x={k === 0 ? -10.5 : 10.5} y={TOKEN_Y + 1} r={10} />
          ))}
        </g>
      ) : null}
      {fogPeek ? (
        <g>
          <circle
            cx={0.52 * R}
            cy={0.5 * R}
            r={7.5}
            fill="#2f2415"
            stroke="#f8efd8"
            strokeWidth={1.2}
          />
          <Eye
            x={0.52 * R - 5}
            y={0.5 * R - 5}
            width={10}
            height={10}
            size={10}
            color="#f8efd8"
            strokeWidth={2.4}
            aria-hidden="true"
          />
        </g>
      ) : null}
      {cell && look === 'fog' ? <title>{t('board.hiddenFog')}</title> : null}
      {fogPeek ? <title>{t('board.revealedFog', { terrain: t(`terrain.${look}`) })}</title> : null}
    </>
  )
}

export interface BoardSvgProps {
  readonly board: Board
  readonly t: Translate
  /** Show what's under the fog (Scenario 3). */
  readonly fogRevealed: boolean
  /** Play the deal; false draws the finished board at once. */
  readonly animate: boolean
  readonly width?: number | undefined
  readonly height?: number | undefined
  readonly label: string
  readonly className?: string | undefined
}

/**
 * The board as SVG: sand coast, tiles with their glyphs, number tokens, harbors and piers. With
 * `animate`, it deals itself like the storyboard: coast, tiles in a spiral, tokens, harbors.
 */
export const BoardSvg = forwardRef<SVGSVGElement, BoardSvgProps>(function BoardSvg(
  { board, t, fogRevealed, animate, width, height, label, className },
  ref,
) {
  const geometry = boardGeometry(board)
  const timing = dealTiming(geometry)
  const stagger = tileStagger(geometry.cells.length)
  const { viewBox: vb } = geometry
  let tokenIndex = 0
  const anim = animate ? styles.animate : ''

  const lookOf = (cell: Cell): Look => (cell.kind === 'fog' && !fogRevealed ? 'fog' : cell.terrain)

  return (
    <svg
      ref={ref}
      className={`${styles.board} ${anim} ${className ?? ''}`}
      viewBox={`${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.width.toFixed(1)} ${vb.height.toFixed(1)}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
      style={{ '--deal-total': `${timing.total}ms` } as Vars}
    >
      <g className={styles.sea}>
        {geometry.sea.map((s, k) => (
          <g key={k} transform={`translate(${s.x.toFixed(2)} ${s.y.toFixed(2)})`}>
            <polygon
              points={hexPoints(0, 0, TILE)}
              fill="#1a5a85"
              stroke="rgb(255 255 255 / 10%)"
              strokeWidth={1}
            />
            <Glyph look="sea" size={0.5 * R} y={-0.25 * R} />
          </g>
        ))}
      </g>
      <g className={styles.coast}>
        {geometry.cells.map(({ cell, x, y, index }) =>
          cell.terrain === 'sea' && cell.kind !== 'fog' ? null : lookOf(cell) === 'fog' ? null : (
            <polygon key={index} points={hexPoints(x, y, SAND)} fill="#eadcb6" />
          ),
        )}
      </g>
      <g>
        {geometry.cells.map(({ cell, x, y, index, order }) => {
          const look = lookOf(cell)
          return (
            <g key={index} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
              <g
                className={styles.tile}
                style={
                  { '--delay': `${(timing.tilesStart + order * stagger).toFixed(0)}ms` } as Vars
                }
              >
                <Tile look={look} cell={cell} fogPeek={cell.kind === 'fog' && fogRevealed} t={t} />
              </g>
            </g>
          )
        })}
      </g>
      <g>
        {[...geometry.cells]
          .sort((a, b) => a.order - b.order)
          .map(({ cell, x, y, index }) => {
            if (cell.num === null || lookOf(cell) === 'fog') return null
            const delay = timing.tokensStart + tokenIndex++ * timing.tokenStagger
            return (
              <g
                key={index}
                className={styles.token}
                style={{ '--delay': `${delay.toFixed(0)}ms` } as Vars}
              >
                <Token
                  num={cell.num}
                  letter={cell.letter}
                  x={x}
                  y={y + TOKEN_Y}
                  label={cell.letter ? t('board.letter', { letter: cell.letter }) : undefined}
                />
              </g>
            )
          })}
      </g>
      <g>
        {geometry.harbors.map(({ harbor, x, y, piers }, k) => {
          const any = harbor.type === 'any'
          const fill = any ? '#2c4a5c' : FILL[harbor.type]
          const ink = any ? '#ffffff' : GLYPH[harbor.type]
          return (
            <g
              key={k}
              className={styles.harbor}
              style={
                { '--delay': `${(timing.harborsStart + k * HARBOR_STAGGER).toFixed(0)}ms` } as Vars
              }
              aria-label={
                any
                  ? t('board.harbor', { ratio: '3:1' })
                  : t('board.harborFor', { resource: t(`resource.${harbor.type}`) })
              }
            >
              {piers.map((p, i) => (
                <line
                  key={i}
                  x1={x}
                  y1={y}
                  x2={p.x}
                  y2={p.y}
                  stroke="#eadcb6"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              ))}
              <circle cx={x} cy={y + 1.5} r={HARBOR_R} fill="rgb(0 0 0 / 28%)" />
              <circle cx={x} cy={y} r={HARBOR_R} fill={fill} stroke="#eadcb6" strokeWidth={2} />
              {any ? (
                <text
                  x={x}
                  y={y + 3.6}
                  textAnchor="middle"
                  fontFamily="'PT Sans', system-ui, sans-serif"
                  fontWeight={700}
                  fontSize={10}
                  fill={ink}
                >
                  3:1
                </text>
              ) : (
                <>
                  <g transform={`translate(${x.toFixed(2)} ${(y - 9.5).toFixed(2)})`}>
                    <Glyph look={harbor.type} size={9} y={0} />
                  </g>
                  <text
                    x={x}
                    y={y + 8.2}
                    textAnchor="middle"
                    fontFamily="'PT Sans', system-ui, sans-serif"
                    fontWeight={700}
                    fontSize={9}
                    fill={ink}
                  >
                    2:1
                  </text>
                </>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
})
