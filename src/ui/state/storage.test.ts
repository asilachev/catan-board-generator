import { describe, expect, it } from 'vitest'
import { BOARD_VERSION, DEFAULT_OPTIONS } from '../../engine/index.ts'
import { loadSettings } from './storage.ts'

/** A storage holding one saved value under the settings key. */
const saved = (value: unknown) =>
  ({
    getItem: (key: string) => (key === 'catan-boards:v1:settings' ? JSON.stringify(value) : null),
  }) as Storage

describe('saved settings (docs/design.md → Share links)', () => {
  const before = {
    game: 'seafarers',
    base: 'base34',
    sea: 's2',
    seats: 4,
    code: 'anchor-4821',
    options: { ...DEFAULT_OPTIONS, printed: true },
    fog: false,
  }

  it('keeps a board saved before boards had versions as v1 dealt it', () => {
    const settings = loadSettings('fallback-1000', saved(before))
    expect(settings.version).toBe(1)
    expect(settings.code).toBe('anchor-4821')
    // A v1 board can't be as printed.
    expect(settings.options.printed).toBe(false)
  })

  it('reads the version a board was saved with', () => {
    expect(loadSettings('f', saved({ ...before, version: 2 })).version).toBe(2)
    expect(loadSettings('f', saved({ ...before, version: 2 })).options.printed).toBe(true)
    expect(loadSettings('f', saved({ ...before, version: 1 })).version).toBe(1)
  })

  it('deals new boards with the current version when nothing is saved', () => {
    expect(loadSettings('fallback-1000', saved(null)).version).toBe(BOARD_VERSION)
  })
})
