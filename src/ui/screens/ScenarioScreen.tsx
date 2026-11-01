import { BookOpen, ExternalLink, FileText, Info, Package, Trophy, Users } from 'lucide-react'
import {
  pips,
  RESOURCES,
  total,
  type Board,
  type Terrain,
  type Variant,
} from '../../engine/index.ts'
import { FILL, GLYPH, ICON, TABLE_ORDER } from '../board/terrain.ts'
import { Card, Eyebrow, SectionTitle } from '../components/Kit.tsx'
import {
  playersLabel,
  scenarioName,
  scenarioRules,
  scenarioStory,
  victoryLabel,
} from '../format.ts'
import { useT, type Translate } from '../i18n/index.ts'
import styles from './screens.module.css'

/** CATAN GmbH's page with the official rulebooks to download (base game, Seafarers, 5–6). */
export const OFFICIAL_RULES_URL = 'https://www.catan.com/understand-catan/game-rules'

function HexIcon({ terrain, size = 34 }: { terrain: Terrain; size?: number }) {
  const Icon = ICON[terrain]
  return (
    <svg width={size} height={(size * 40) / 36} viewBox="0 0 36 40" aria-hidden="true">
      <polygon
        points="18,1 34.5,10.5 34.5,29.5 18,39 1.5,29.5 1.5,10.5"
        fill={FILL[terrain]}
        stroke="rgb(0 0 0 / 22%)"
      />
      <Icon x={9} y={11} width={18} height={18} size={18} color={GLYPH[terrain]} strokeWidth={2} />
    </svg>
  )
}

export function TokenBadge({ n, size = 52 }: { n: number; size?: number }) {
  const red = n === 6 || n === 8
  const ink = red ? '#b8332a' : '#2f2718'
  const dots = pips(n)
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-label={String(n)} role="img">
      <circle cx="28" cy="29" r="26" fill="rgb(0 0 0 / 14%)" />
      <circle cx="28" cy="28" r="26" fill="#f8efd8" stroke="#b9a175" strokeWidth="1.8" />
      <text
        x="28"
        y="25"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Spectral, Georgia, serif"
        fontWeight={800}
        fontSize={24}
        fill={ink}
      >
        {n}
      </text>
      {Array.from({ length: dots }, (_, k) => (
        <circle key={k} cx={28 + (k - (dots - 1) / 2) * 7} cy="41" r="2.1" fill={ink} />
      ))}
    </svg>
  )
}

function HarborBadge({ type, t }: { type: 'any' | Terrain; t: Translate }) {
  const any = type === 'any'
  const fill = any ? '#2c4a5c' : FILL[type]
  const ink = any ? '#fff' : GLYPH[type]
  const Icon = any ? null : ICON[type]
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      aria-label={any ? '3:1' : `2:1 ${t(`resource.${type}`)}`}
      role="img"
    >
      <circle cx="20" cy="21.5" r="17" fill="rgb(0 0 0 / 22%)" />
      <circle cx="20" cy="20" r="17" fill={fill} stroke="#eadcb6" strokeWidth="2.4" />
      {Icon ? (
        <Icon x={14.5} y={7.5} width={11} height={11} size={11} color={ink} strokeWidth={2.2} />
      ) : null}
      <text
        x="20"
        y={any ? 24 : 29}
        textAnchor="middle"
        fontFamily="'PT Sans', system-ui, sans-serif"
        fontWeight={700}
        fontSize={any ? 11.5 : 10}
        fill={ink}
      >
        {any ? '3:1' : '2:1'}
      </text>
    </svg>
  )
}

/** Everything about a scenario: what to take from the box and its own rules. Also printed. */
export function ScenarioDetails({
  variant,
  board,
  t,
  compact = false,
}: {
  variant: Variant
  board: Board | null
  t: Translate
  compact?: boolean
}) {
  const terrains = TABLE_ORDER.filter((k) => (variant.hexes[k] ?? 0) > 0)
  const tokens = Object.keys(variant.tokens)
    .map(Number)
    .sort((a, b) => a - b)
  const rules = scenarioRules(t, variant)
  const harborTypes: ('any' | Terrain)[] = ['any', ...RESOURCES]
  const harborCount = (type: 'any' | Terrain) =>
    type === 'any'
      ? variant.harbors.generic
      : variant.harborTypes
        ? variant.harborTypes.filter((h) => h === type).length
        : 1

  return (
    <>
      <section className={styles.section} aria-labelledby="scenario-board">
        <SectionTitle id="scenario-board">{t('scenario.onBoard')}</SectionTitle>
        <Card>
          {terrains.map((k) => (
            <div key={k} className={styles.countRow}>
              <HexIcon terrain={k} />
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{t(`terrain.${k}`)}</span>
                <span className={styles.rowMeta}>
                  {t(`resource.${k}`)}
                  {k === 'desert' ? ` · ${t('scenario.robber')}` : ''}
                </span>
              </span>
              <span className={styles.count}>
                <small>×</small>
                {variant.hexes[k]}
              </span>
            </div>
          ))}
          <div className={styles.totalRow}>
            {t('scenario.totalHexes')}
            <span className={styles.count}>{total(variant.hexes)}</span>
          </div>
        </Card>
        {/* Boards from v1 links draw only the land; printed maps draw their sea too. */}
        {variant.game === 'seafarers' &&
        !variant.pools?.random &&
        !board?.cells.some((c) => c.kind === 'sea') ? (
          <p className={styles.note}>
            <Info size={18} aria-hidden="true" />
            {t('scenario.seaNote')}
          </p>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="scenario-tokens">
        <SectionTitle id="scenario-tokens">{t('scenario.tokens')}</SectionTitle>
        <Card>
          <div className={styles.tokenGrid}>
            {tokens.map((n) => (
              <div key={n} className={styles.tokenCell}>
                <TokenBadge n={n} size={compact ? 40 : 52} />
                <span>{t('common.times', { n: variant.tokens[n] ?? 0 })}</span>
              </div>
            ))}
          </div>
        </Card>
        <p className={styles.note}>
          <Info size={18} aria-hidden="true" />
          <span>
            {t('scenario.tokensNote', { n: total(variant.tokens) })}
            {board && board.leftover.length > 0
              ? ` ${t('scenario.spare', { list: board.leftover.join(', ') })}`
              : ''}
            {variant.villages ? ` ${t('scenario.villageTokens')}` : ''}
          </span>
        </p>
      </section>

      <section className={styles.section} aria-labelledby="scenario-harbors">
        <SectionTitle id="scenario-harbors">{t('scenario.harbors')}</SectionTitle>
        <Card>
          <div className={styles.harborGrid}>
            {harborTypes.map((type) => (
              <div key={type} className={styles.harborCell}>
                <HarborBadge type={type} t={t} />
                <strong>{t('common.times', { n: harborCount(type) })}</strong>
                <span>{type === 'any' ? t('scenario.any') : t(`resource.${type}`)}</span>
              </div>
            ))}
          </div>
        </Card>
        <p className={styles.note}>
          <Info size={18} aria-hidden="true" />
          {variant.harborTypes
            ? t('scenario.harborsBase', {
                n: variant.harbors.special + variant.harbors.generic,
                generic: variant.harbors.generic,
              })
            : t(
                // Printed maps draw the harbors on their spots; Scenario 9's players place
                // their own; boards from v1 links don't draw them.
                variant.group === 's9'
                  ? 'scenario.harborsNewWorld'
                  : board !== null && board.harbors.length === 0
                    ? 'scenario.harborsSeaHidden'
                    : 'scenario.harborsSea',
                { special: variant.harbors.special, generic: variant.harbors.generic },
              )}
        </p>
      </section>

      {variant.extras.length > 0 ? (
        <section className={styles.section} aria-labelledby="scenario-extras">
          <SectionTitle id="scenario-extras">{t('scenario.extras')}</SectionTitle>
          <Card>
            <ul className={styles.extras}>
              {variant.extras.map((e) => (
                <li key={e.kind}>{t(`extras.${e.kind}`, { n: e.n })}</li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="scenario-rules">
        <SectionTitle id="scenario-rules">{t('scenario.rules')}</SectionTitle>
        <ol className={styles.rules}>
          {rules.map((rule, i) => (
            <li key={i}>
              <span aria-hidden="true">{i + 1}</span>
              <span>{rule}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

/** 03 · Scenario: the current scenario, with pointers into the rulebooks. */
export function ScenarioScreen({ variant, board }: { variant: Variant; board: Board }) {
  const t = useT()
  return (
    <main className={`${styles.screen} ${styles.paper}`}>
      <Eyebrow>{t('scenario.eyebrow')}</Eyebrow>
      <h1 className={styles.screenTitle}>{scenarioName(t, variant.group)}</h1>
      <div className={styles.chips}>
        <span className={styles.chip} data-tone="accent">
          <Trophy size={17} aria-hidden="true" />
          {victoryLabel(t, variant.victory)}
        </span>
        <span className={styles.chip}>
          <Users size={17} aria-hidden="true" />
          {playersLabel(t, variant)}
        </span>
      </div>
      <p className={styles.story}>{scenarioStory(t, variant.group)}</p>

      <ScenarioDetails variant={variant} board={board} t={t} />

      <section className={styles.section} aria-labelledby="scenario-books">
        <SectionTitle id="scenario-books">{t('scenario.rulebooks')}</SectionTitle>
        <Card>
          <div className={styles.bookRow}>
            <span className={styles.rowIcon}>
              <BookOpen size={22} aria-hidden="true" />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>
                {variant.game === 'base' ? t('scenario.inBase') : t('scenario.inSeafarers')}
              </span>
              <span className={styles.rowMeta}>
                {variant.game === 'base'
                  ? t('scenario.baseSection')
                  : t('scenario.seaSection', {
                      n: variant.number ?? 0,
                      name: scenarioName(t, variant.group),
                    })}
              </span>
            </span>
            <Package size={20} aria-hidden="true" />
          </div>
          <a
            className={styles.bookRow}
            href={OFFICIAL_RULES_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.rowIcon}>
              <FileText size={22} aria-hidden="true" />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>{t('scenario.official')}</span>
              <span className={styles.rowMeta}>{t('scenario.officialSub')}</span>
            </span>
            <ExternalLink size={20} aria-label={t('common.opensInNewTab')} />
          </a>
        </Card>
      </section>
    </main>
  )
}
