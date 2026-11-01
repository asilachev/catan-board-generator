import {
  Check,
  ChevronDown,
  ChevronRight,
  Dices,
  Hash,
  House,
  Languages,
  Sailboat,
  Trophy,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import {
  groupsOf,
  hasSeats,
  normalizeCode,
  resolveVariant,
  variantsOf,
  type DealOptions,
  type Game,
  type GroupId,
  type Seats,
} from '../../engine/index.ts'
import {
  Button,
  Card,
  CheckDot,
  HexNumber,
  IconButton,
  RadioDot,
  SectionTitle,
  Segmented,
  ToggleRow,
} from '../components/Kit.tsx'
import {
  baseCounts,
  groupPlayersLabel,
  playersLabel,
  scenarioLine,
  scenarioName,
  victoryLabel,
} from '../format.ts'
import { LANGS, langInfo, useI18n } from '../i18n/index.ts'
import { groupOf, type Settings } from '../state/storage.ts'
import styles from './screens.module.css'

/** 02 · Setup and 07 · Setup (Seafarers). */
export function SetupScreen({
  settings,
  onChange,
  onNewCode,
  onPickScenario,
  onLanguage,
  onBuild,
}: {
  settings: Settings
  onChange: (change: Partial<Settings>) => void
  onNewCode: () => void
  onPickScenario: () => void
  onLanguage: () => void
  onBuild: () => void
}) {
  const { t, lang } = useI18n()
  const group = groupOf(settings)
  const variant = resolveVariant(group, settings.seats)
  // What's typed, until it's committed; a new code from elsewhere (the dice) replaces it.
  const [draft, setDraft] = useState({ base: settings.code, text: settings.code })
  const code = draft.base === settings.code ? draft.text : settings.code
  const setCode = (text: string) => setDraft({ base: settings.code, text })

  const commitCode = () => {
    const next = normalizeCode(code)
    if (next && next !== settings.code) onChange({ code: next })
    else setCode(settings.code)
  }
  const setOption = (key: keyof DealOptions, on: boolean) =>
    onChange({ options: { ...settings.options, [key]: on } })

  const gameTile = (game: Game) => {
    const groups = groupsOf(game)
    const selected = settings.game === game
    const players = groupPlayersLabel(t, groups.flatMap(variantsOf))
    return (
      <button
        key={game}
        type="button"
        role="radio"
        aria-checked={selected}
        className={styles.tile}
        onClick={() => onChange({ game })}
      >
        <span className={styles.tileIcon} data-game={game}>
          {game === 'base' ? <House size={20} /> : <Sailboat size={20} />}
        </span>
        <span className={styles.tileCheck}>
          <CheckDot on={selected} />
        </span>
        <span className={styles.tileName}>{t(`game.${game}`)}</span>
        <span className={styles.tileMeta}>
          {game === 'base'
            ? t('setup.baseMeta', { n: groups.length })
            : t('setup.seafarersMeta', { n: groups.length })}
          <br />
          {players}
        </span>
      </button>
    )
  }

  return (
    <main className={`${styles.screen} ${styles.paper}`}>
      <h1 className={styles.screenTitle}>{t('setup.title')}</h1>
      <p className={styles.lead}>{t('setup.subtitle')}</p>

      <section className={styles.section} aria-labelledby="setup-game">
        <SectionTitle id="setup-game">{t('setup.game')}</SectionTitle>
        <div className={styles.tiles} role="radiogroup" aria-labelledby="setup-game">
          {gameTile('base')}
          {gameTile('seafarers')}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="setup-scenario">
        <SectionTitle id="setup-scenario">{t('setup.scenario')}</SectionTitle>
        {settings.game === 'base' ? (
          <Card>
            <div role="radiogroup" aria-labelledby="setup-scenario">
              {groupsOf('base').map((g: GroupId) => {
                const v = resolveVariant(g, settings.seats)
                return (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={g === settings.base}
                    className={styles.row}
                    onClick={() => onChange({ base: g })}
                  >
                    <RadioDot on={g === settings.base} />
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>
                        {t('game.base')} · {playersLabel(t, v)}
                      </span>
                      <span className={styles.rowMeta}>{baseCounts(t, v)}</span>
                    </span>
                    <span className={styles.vpChip} aria-label={victoryLabel(t, v.victory)}>
                      <Trophy size={16} aria-hidden="true" />
                      {v.victory.points}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>
        ) : (
          <>
            <Card>
              <button
                type="button"
                className={styles.row}
                onClick={onPickScenario}
                aria-haspopup="dialog"
              >
                <HexNumber n={variant.number ?? 1} selected />
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{scenarioName(t, group)}</span>
                  <span className={styles.rowMeta}>{scenarioLine(t, variant)}</span>
                </span>
                <ChevronDown size={22} className={styles.rowChevron} aria-hidden="true" />
              </button>
            </Card>
            {hasSeats(group) ? (
              <>
                <p className={styles.label} id="setup-seats">
                  {t('setup.players')}
                </p>
                <Segmented<Seats>
                  label={t('setup.players')}
                  value={settings.seats}
                  onChange={(seats) => onChange({ seats })}
                  options={[3, 4].map((n) => ({
                    value: n as Seats,
                    label: t('common.players', { n }),
                    icon: <Users size={20} aria-hidden="true" />,
                  }))}
                />
              </>
            ) : null}
          </>
        )}
      </section>

      <section className={styles.section} aria-labelledby="setup-code">
        <SectionTitle id="setup-code">{t('setup.code')}</SectionTitle>
        <form
          className={styles.codeInput}
          onSubmit={(e) => {
            e.preventDefault()
            commitCode()
            ;(document.activeElement as HTMLElement | null)?.blur()
          }}
        >
          <Hash size={24} aria-hidden="true" />
          <input
            aria-labelledby="setup-code"
            value={code}
            placeholder={t('setup.codePlaceholder')}
            onChange={(e) => setCode(e.target.value)}
            onBlur={commitCode}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            maxLength={40}
          />
          <IconButton label={t('setup.newCode')} tone="tint" onClick={onNewCode}>
            <Dices size={22} />
          </IconButton>
        </form>
        <p className={styles.help}>{t('setup.codeHelp')}</p>
      </section>

      <section className={styles.section} aria-labelledby="setup-tokens">
        <SectionTitle id="setup-tokens">{t('setup.tokens')}</SectionTitle>
        <Card>
          <ToggleRow
            title={t('setup.red')}
            hint={t('setup.redHint')}
            checked={settings.options.red}
            onChange={(on) => setOption('red', on)}
          />
          <ToggleRow
            title={t('setup.same')}
            hint={t('setup.sameHint')}
            checked={settings.options.same}
            onChange={(on) => setOption('same', on)}
          />
          <ToggleRow
            title={t('setup.spread')}
            hint={t('setup.spreadHint')}
            checked={settings.options.spread}
            onChange={(on) => setOption('spread', on)}
          />
          {variant.letters ? (
            <ToggleRow
              title={t('setup.letters')}
              hint={t('setup.lettersHint')}
              checked={settings.options.letters}
              onChange={(on) => setOption('letters', on)}
            />
          ) : null}
          {variant.pools?.fog ? (
            <ToggleRow
              title={t('setup.fog')}
              hint={t('setup.fogHint')}
              checked={settings.fog}
              onChange={(fog) => onChange({ fog })}
            />
          ) : null}
        </Card>
      </section>

      <section className={styles.section} aria-labelledby="setup-language">
        <SectionTitle id="setup-language">{t('setup.language')}</SectionTitle>
        <Card>
          <button type="button" className={styles.row} onClick={onLanguage}>
            <span className={styles.rowIcon}>
              <Languages size={24} aria-hidden="true" />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle} lang={langInfo(lang).tag}>
                {langInfo(lang).name}
              </span>
              <span className={styles.rowMeta}>{LANGS.map((l) => l.name).join(' · ')}</span>
            </span>
            <ChevronRight size={22} className={styles.rowChevron} aria-hidden="true" />
          </button>
        </Card>
      </section>

      <div className={styles.cta}>
        <Button icon={<Check size={24} strokeWidth={2.6} />} onClick={onBuild}>
          {t('setup.build')}
        </Button>
      </div>
    </main>
  )
}
