import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildBoard, DEFAULT_OPTIONS } from '../engine/index.ts'
import { App } from './App.tsx'
import { loadCatalog } from './i18n/index.ts'

const PREFS = 'catan-boards:v1:prefs'
const SETTINGS = 'catan-boards:v1:settings'

const savedLanguage = (language: string) =>
  localStorage.setItem(PREFS, JSON.stringify({ language, launches: 1, installHiddenUntil: 0 }))

/** Renders the app with a board in the address bar, as a shared link opens it. */
async function openLink(hash: string, language = 'en') {
  savedLanguage(language)
  history.replaceState(null, '', `/${hash}`)
  await act(async () => {
    await loadCatalog(language as 'en')
  })
  return render(<App />)
}

const tokensOn = (svg: Element) => svg.querySelectorAll('text[font-family^="Spectral"]').length

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('first launch (design 01, 06)', () => {
  it("opens on a dealt base-game board in the browser's language", async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['de-AT', 'en'])
    history.replaceState(null, '', '/')
    await act(async () => {
      await loadCatalog('de')
    })
    render(<App />)
    // No language screen and no Setup: the board, with a fresh code in the address bar.
    expect(screen.queryByRole('heading', { name: 'Sprache' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Basisspiel · 3–4 Spieler/ })).toBeInTheDocument()
    expect(location.hash).toMatch(/^#s=base34&p=4&c=\S+-\d{4}$/)
    // Nothing is picked yet, so the app keeps following the browser.
    expect(JSON.parse(localStorage.getItem(PREFS) ?? '{}').language ?? null).toBeNull()
  })

  it('switches the language from Setup and remembers it', async () => {
    const user = userEvent.setup()
    await openLink('#s=base34&p=4&c=anchor-4821')
    await act(async () => {
      await loadCatalog('ru')
    })
    await user.click(screen.getByRole('button', { name: 'Setup' }))
    await user.click(screen.getByRole('button', { name: /^English/ }))
    await user.click(screen.getByRole('radio', { name: /Русский/ }))
    expect(await screen.findByRole('heading', { name: 'Язык' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(PREFS) ?? '{}').language).toBe('ru')
    await user.click(screen.getByRole('button', { name: 'Назад' }))
    expect(screen.getByRole('heading', { name: 'Настройка поля' })).toBeInTheDocument()
  })
})

describe('board (design 01, 04)', () => {
  it('opens a shared v1 link on exactly that board', async () => {
    await openLink('#s=base34&p=4&c=anchor-4821')
    const svg = screen.getByRole('img', { name: /anchor-4821/ })
    const expected = buildBoard('base34', 'anchor-4821', DEFAULT_OPTIONS)
    expect(tokensOn(svg)).toBe(expected.cells.filter((c) => c.num !== null).length)
    expect(screen.getByText('Base game · 3–4 players')).toBeInTheDocument()
  })

  it('deals a new board with a new code from the current language’s words', async () => {
    const user = userEvent.setup()
    await openLink('#s=base34&p=4&c=anchor-4821')
    await user.click(screen.getByRole('button', { name: /New board/ }))
    const code = JSON.parse(localStorage.getItem(SETTINGS) ?? '{}').code as string
    expect(code).not.toBe('anchor-4821')
    expect(code).toMatch(/^[a-z]+-\d{4}$/)
    expect(location.hash).toContain(`c=${code}`)
  })

  it('shows Seafarers in the sea panel with its own title', async () => {
    await openLink('#s=s1&p=3&c=surf-3170')
    expect(screen.getByText('Seafarers · New Shores')).toBeInTheDocument()
    expect(document.documentElement.dataset.game).toBe('seafarers')
  })

  it('copies the link and says so', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    await openLink('#s=base34&p=4&c=anchor-4821')
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await user.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('#s=base34&p=4&c=anchor-4821'))
    expect(await screen.findByText('Link copied')).toBeInTheDocument()
  })

  it('opens the share sheet with the code and four actions', async () => {
    const user = userEvent.setup()
    await openLink('#s=base34&p=4&c=anchor-4821')
    await user.click(screen.getByRole('button', { name: 'Share board' }))
    const sheet = screen.getByRole('dialog', { name: 'Share board' })
    expect(within(sheet).getByText('anchor-4821')).toBeInTheDocument()
    for (const name of ['Copy link', 'Send…', 'Print', 'Save PNG']) {
      expect(within(sheet).getByRole('button', { name })).toBeInTheDocument()
    }
  })
})

describe('setup (design 02, 07, 08)', () => {
  it('switches to Seafarers, picks a scenario in the sheet and a player count', async () => {
    const user = userEvent.setup()
    await openLink('#s=base34&p=4&c=anchor-4821')
    await user.click(screen.getByRole('button', { name: 'Setup' }))
    await user.click(screen.getByRole('radio', { name: /Seafarers/ }))
    await user.click(screen.getByRole('button', { name: /Heading for New Shores/ }))
    const sheet = screen.getByRole('dialog', { name: 'Scenario' })
    await user.click(within(sheet).getByRole('option', { name: /The Fog Islands/ }))
    await user.click(screen.getByRole('radio', { name: '3 players' }))
    expect(location.hash).toBe('#s=s3&p=3&c=anchor-4821')
    // The fog scenario offers to reveal the fog.
    expect(screen.getByRole('switch', { name: /Reveal fog/ })).toBeInTheDocument()
  })

  it('puts changed token rules into the link, because they change the board', async () => {
    const user = userEvent.setup()
    await openLink('#s=base34&p=4&c=anchor-4821')
    await user.click(screen.getByRole('button', { name: 'Setup' }))
    await user.click(screen.getByRole('switch', { name: /No equal numbers/ }))
    expect(location.hash).toBe('#s=base34&p=4&c=anchor-4821&o=r1s0t1l0')
  })

  it('takes a typed code as v1 did: trimmed, with its case and spaces', async () => {
    const user = userEvent.setup()
    await openLink('#s=base34&p=4&c=anchor-4821')
    await user.click(screen.getByRole('button', { name: 'Setup' }))
    const input = screen.getByRole('textbox', { name: 'Board code' })
    await user.clear(input)
    await user.type(input, '  Storm 1234 {enter}')
    expect(location.hash).toContain('c=Storm+1234')
  })
})

describe('scenario (design 03)', () => {
  it('lists what to take from the box and the scenario’s rules', async () => {
    const user = userEvent.setup()
    await openLink('#s=s6&p=4&c=anchor-4821')
    await user.click(screen.getByRole('button', { name: 'Scenario' }))
    expect(screen.getByRole('heading', { name: 'Cloth for Catan' })).toBeInTheDocument()
    expect(screen.getByText('14 victory points')).toBeInTheDocument()
    expect(screen.getByText('50 cloth tokens')).toBeInTheDocument()
    const rules = screen.getByRole('heading', { name: 'Scenario rules' }).parentElement
    expect(rules?.querySelectorAll('li')).toHaveLength(4)
  })

  it('reads in the saved language', async () => {
    await openLink('#s=s1&p=4&c=якорь-4821', 'ru')
    expect(screen.getByText('Мореходы · К новым берегам')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('ru')
  })
})
