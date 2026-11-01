import {
  BrickWall,
  CloudFog,
  Fence,
  Gem,
  MountainSnow,
  Trees,
  Waves,
  Wheat,
  type LucideIcon,
} from 'lucide-react'
import type { Terrain } from '../../engine/index.ts'
import { Cactus } from './Cactus.tsx'

/** Terrain colours and glyphs (design: Hex / Лес … Hex / Туман). */
export type Look = Terrain | 'fog'

export const FILL: Readonly<Record<Look, string>> = {
  forest: '#2f6b3c',
  pasture: '#8dbe4d',
  fields: '#e5b93d',
  hills: '#b5542d',
  mountains: '#7b8992',
  desert: '#e2d1a6',
  gold: '#f2c81e',
  sea: '#20699a',
  fog: '#93a9b6',
}

/** Glyph colour on each tile. */
export const GLYPH: Readonly<Record<Look, string>> = {
  forest: '#dcebd5',
  pasture: '#2a3d14',
  fields: '#6e4f0c',
  hills: '#fbe5d6',
  mountains: '#f3f8fb',
  desert: '#7b6535',
  gold: '#6a4f00',
  sea: '#bfe0f2',
  fog: '#f4f9fc',
}

export const ICON: Readonly<Record<Look, LucideIcon | typeof Cactus>> = {
  forest: Trees,
  pasture: Fence,
  fields: Wheat,
  hills: BrickWall,
  mountains: MountainSnow,
  desert: Cactus,
  gold: Gem,
  sea: Waves,
  fog: CloudFog,
}

/** The order the legend and the scenario tables list terrains in. */
export const LEGEND_ORDER: readonly Look[] = [
  'sea',
  'fog',
  'gold',
  'forest',
  'pasture',
  'fields',
  'hills',
  'mountains',
  'desert',
]

/** The order of "What's on the board": producing terrain first, then the rest. */
export const TABLE_ORDER: readonly Terrain[] = [
  'forest',
  'pasture',
  'fields',
  'hills',
  'mountains',
  'gold',
  'desert',
  'sea',
]
