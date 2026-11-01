import { total, type GroupId, type Variant, type Victory } from '../engine/index.ts'
import type { Translate } from './i18n/index.ts'

/** Words for scenarios, built from the translation files (`scenarios.<id>`). */

export const scenarioName = (t: Translate, group: GroupId): string =>
  t.dynamic(`scenarios.${group}.name`)
export const scenarioShort = (t: Translate, group: GroupId): string =>
  t.dynamic(`scenarios.${group}.short`)
export const scenarioStory = (t: Translate, group: GroupId): string =>
  t.dynamic(`scenarios.${group}.story`)

/** The rule lines for a variant: per player count where the rules print two layouts. */
export const scenarioRules = (t: Translate, variant: Variant): readonly string[] =>
  t.list(`scenarios.${variant.seats === null ? variant.group : variant.id}.rules`)

export function playersLabel(t: Translate, variant: Variant): string {
  const { min, max } = variant.players
  return min === max ? t('common.players', { n: max }) : t('common.playersRange', { min, max })
}

/** "3–4 players" for a whole group (both layouts), as the game tiles and cards show it. */
export function groupPlayersLabel(t: Translate, variants: readonly Variant[]): string {
  const min = Math.min(...variants.map((v) => v.players.min))
  const max = Math.max(...variants.map((v) => v.players.max))
  return min === max ? t('common.players', { n: max }) : t('common.playersRange', { min, max })
}

export function victoryLabel(t: Translate, victory: Victory, short = false): string {
  const n = victory.points
  if (victory.kind === 'fortress')
    return short ? t('victory.fortressShort', { n }) : t('victory.fortress', { n })
  if (victory.kind === 'wonder')
    return short ? t('victory.wonderShort', { n }) : t('victory.wonder', { n })
  return short ? t('victory.pointsShort', { n }) : t('victory.points', { n })
}

/** One line under a scenario's name: what it is and how to win. */
export function scenarioLine(t: Translate, variant: Variant): string {
  const tagline = t.dynamic(`scenarios.${variant.group}.tagline`)
  const vp = victoryLabel(t, variant.victory, true)
  return tagline ? `${tagline} · ${vp}` : vp
}

/** "Base game · 3–4 players" or "Seafarers · New Shores", for the board's header. */
export function boardTitle(t: Translate, variant: Variant): string {
  return variant.game === 'base'
    ? `${t('game.base')} · ${playersLabel(t, variant)}`
    : `${t('game.seafarers')} · ${scenarioShort(t, variant.group)}`
}

/** "19 hexes · 18 tokens · 9 harbors" for a base-game layout. */
export function baseCounts(t: Translate, variant: Variant): string {
  return t('setup.baseCounts', {
    hexes: total(variant.hexes),
    tokens: total(variant.tokens),
    harbors: variant.harbors.special + variant.harbors.generic,
  })
}
