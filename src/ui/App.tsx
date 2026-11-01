import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  buildBoard,
  encodeOptions,
  gameOf,
  makeCode,
  resolveVariant,
  type GroupId,
} from '../engine/index.ts'
import { useToasts } from './components/toast.ts'
import { Toaster } from './components/Toaster.tsx'
import { TabBar, type Tab } from './components/TabBar.tsx'
import { boardPng, download } from './board/exportPng.ts'
import { boardTitle } from './format.ts'
import {
  browserLanguages,
  detectLang,
  I18nContext,
  langInfo,
  loadCatalog,
  loadedCatalog,
  translatorFor,
  useT,
  type I18n,
  type Lang,
} from './i18n/index.ts'
import {
  isIosSafari,
  isStandalone,
  requestPersistentStorage,
  useInstallPrompt,
  useSplash,
} from './pwa/pwa.ts'
import { InstallBanner, IosInstallSheet, Splash } from './pwa/Pwa.tsx'
import { usePwaToasts } from './pwa/usePwaToasts.tsx'
import { BoardScreen } from './screens/BoardScreen.tsx'
import { LanguageScreen } from './screens/LanguageScreen.tsx'
import { PrintSheet } from './screens/PrintSheet.tsx'
import { ScenarioScreen } from './screens/ScenarioScreen.tsx'
import { ScenarioSheet } from './screens/ScenarioSheet.tsx'
import { SetupScreen } from './screens/SetupScreen.tsx'
import { ShareSheet } from './screens/ShareSheet.tsx'
import {
  applyRef,
  groupOf,
  loadPrefs,
  loadSettings,
  refFromLocation,
  savePrefs,
  saveSettings,
  shareUrl,
  withChange,
  writeLocation,
  type Prefs,
  type Settings,
} from './state/storage.ts'
import { useWakeLock } from './state/useWakeLock.ts'

/** Randomness for new codes only; the board itself never uses it (docs/design.md → Determinism). */
const cryptoRandom = (): number => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] ?? 0) / 4294967296
}

const INSTALL_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000

type UpdatePrefs = (change: Partial<Prefs>) => void

/**
 * Device preferences live here, above everything else, because the language is one of them: the
 * browser's language until someone picks one in Setup (or the landing page's `?lang=` sets it).
 */
export function App() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const updatePrefs = useCallback<UpdatePrefs>(
    (change) =>
      setPrefs((prev) => {
        const next = { ...prev, ...change }
        savePrefs(next)
        return next
      }),
    [],
  )
  const preferred = prefs.language ?? detectLang(browserLanguages())
  // A language's file is loaded before it goes on screen, so text never flashes in English.
  const [lang, setLang] = useState<Lang>(() => (loadedCatalog(preferred) ? preferred : 'en'))
  useEffect(() => {
    if (lang === preferred) return
    let cancelled = false
    loadCatalog(preferred)
      .then(() => {
        if (!cancelled) setLang(preferred)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [lang, preferred])
  const i18n = useMemo<I18n>(
    () => ({ lang, t: translatorFor(lang), setLang: (language) => updatePrefs({ language }) }),
    [lang, updatePrefs],
  )
  useEffect(() => {
    document.documentElement.lang = langInfo(lang).tag
  }, [lang])

  return (
    <I18nContext.Provider value={i18n}>
      <Toaster>
        <Shell prefs={prefs} updatePrefs={updatePrefs} />
      </Toaster>
    </I18nContext.Provider>
  )
}

function Shell({ prefs, updatePrefs }: { prefs: Prefs; updatePrefs: UpdatePrefs }) {
  const t = useT()
  const toasts = useToasts()
  const [settings, setSettings] = useState<Settings>(() => {
    const fresh = makeCode(t.list('codeWords'), cryptoRandom)
    const ref = refFromLocation(location.hash)
    const saved = loadSettings(fresh)
    return ref ? applyRef(saved, ref) : saved
  })
  // Every launch opens on the board: the saved one, a shared link's, or on the first launch the
  // base game with a fresh code. Setup opens only when asked for.
  const [tab, setTab] = useState<Tab>('board')
  const [languageOpen, setLanguageOpen] = useState(false)
  const [overlay, setOverlay] = useState<'sheet' | 'share' | 'ios' | null>(null)
  const [nonce, setNonce] = useState(0)
  const [dealing, setDealing] = useState<string | null>(null)
  const [shown, setShown] = useState('')
  const [printing, setPrinting] = useState(false)
  const svg = useRef<SVGSVGElement>(null)
  const splash = useSplash()
  const installPrompt = useInstallPrompt()
  const [ios] = useState(() => isIosSafari() && !isStandalone())
  const [launchedAt] = useState(() => Date.now())
  usePwaToasts()

  const group = groupOf(settings)
  const variant = resolveVariant(group, settings.seats)
  const board = useMemo(
    () => buildBoard(variant.id, settings.code, settings.options, settings.version),
    [variant.id, settings.code, settings.options, settings.version],
  )
  const url = shareUrl(settings)
  const surface = !languageOpen && tab === 'board' ? 'sea' : 'paper'

  const change = useCallback(
    (next: Partial<Settings>) => setSettings((s) => withChange(s, next)),
    [],
  )

  // Remember the board and keep it in the address bar.
  useEffect(() => {
    saveSettings(settings)
    writeLocation(settings)
  }, [settings])

  // A link pasted into the address bar while the app is open.
  useEffect(() => {
    const onHash = () => {
      const ref = refFromLocation(location.hash)
      if (ref) setSettings((s) => applyRef(s, ref))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.game = variant.game
    root.dataset.surface = surface
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', surface === 'sea' ? '#1f6a9b' : '#f5ead0')
  }, [variant.game, surface])

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [tab, languageOpen])

  useWakeLock(surface === 'sea')

  // A deal plays whenever a board is shown that hasn't been dealt on screen yet. Derived during
  // render, so the board mounts already dealing.
  const dealKey = `${variant.id}|${board.code}|${encodeOptions(settings.options)}|v${board.version}#${nonce}`
  if (surface === 'sea' && dealKey !== shown) {
    setShown(dealKey)
    setDealing(dealKey)
  }
  const animate = dealing === dealKey

  // The print sheet exists only while printing (our button, Ctrl+P or the browser's menu).
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true))
    const after = () => setPrinting(false)
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  const newBoard = useCallback(
    () => change({ code: makeCode(t.list('codeWords'), cryptoRandom) }),
    [change, t],
  )

  const onDealEnd = useCallback(() => {
    setDealing(null)
    const { violations, options, variant: dealt } = board
    // Letters place the tokens in the rulebook's fixed order, so no rule can be relaxed. Only
    // boards that have a letter layout use it (buildBoard ignores the option elsewhere).
    if (options.letters && dealt.letters) return
    const relaxed =
      options.red && violations.red > 0
        ? t('toasts.relaxedRed')
        : options.same && violations.same > 0
          ? t('toasts.relaxedSame')
          : null
    if (relaxed)
      toasts.push({
        key: 'relaxed',
        tone: 'warn',
        title: t('toasts.relaxed'),
        sub: relaxed,
        duration: 4000,
        action: { label: t('toasts.again'), run: newBoard },
      })
  }, [board, t, toasts, newBoard])

  const canSend = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const send = useCallback(() => {
    if (!canSend) return setOverlay('share')
    void navigator
      .share({ title: t('app.name'), text: t('share.sendText', { code: board.code }), url })
      .catch(() => {})
  }, [canSend, t, board.code, url])

  const copy = useCallback(async () => {
    let ok = false
    try {
      await navigator.clipboard.writeText(url)
      ok = true
    } catch {
      const area = document.createElement('textarea')
      area.value = url
      document.body.append(area)
      area.select()
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
      area.remove()
    }
    toasts.push(
      ok
        ? {
            key: 'copy',
            tone: 'success',
            title: t('toasts.copied'),
            sub: t('toasts.copiedSub', { code: board.code }),
            ...(canSend ? { action: { label: t('toasts.send'), run: send } } : {}),
          }
        : { key: 'copy', tone: 'warn', title: t('toasts.copyFailed') },
    )
  }, [url, toasts, t, board.code, canSend, send])

  const savePng = useCallback(async () => {
    try {
      if (!svg.current) throw new Error('no board')
      const blob = await boardPng(svg.current, `${boardTitle(t, variant)} · ${board.code}`)
      download(blob, `catan-board-${board.code}.png`)
    } catch {
      toasts.push({ key: 'png', tone: 'warn', title: t('toasts.pngFailed') })
    }
  }, [t, variant, board.code, toasts])

  const pickScenario = (picked: GroupId) => {
    setOverlay(null)
    change(
      gameOf(picked) === 'base'
        ? { game: 'base', base: picked }
        : { game: 'seafarers', sea: picked },
    )
  }

  const showInstall =
    surface === 'sea' &&
    (installPrompt.available || ios) &&
    prefs.launches >= 2 &&
    launchedAt > prefs.installHiddenUntil

  let view
  if (languageOpen) {
    view = (
      <LanguageScreen
        initial={prefs.language ?? detectLang(browserLanguages())}
        onPick={(lang) => updatePrefs({ language: lang })}
        onBack={() => setLanguageOpen(false)}
      />
    )
  } else if (tab === 'setup') {
    view = (
      <SetupScreen
        settings={settings}
        onChange={change}
        onNewCode={newBoard}
        onPickScenario={() => setOverlay('sheet')}
        onLanguage={() => setLanguageOpen(true)}
        onBuild={() => {
          requestPersistentStorage()
          setNonce((n) => n + 1)
          setTab('board')
        }}
      />
    )
  } else if (tab === 'scenario') {
    view = <ScenarioScreen variant={variant} board={board} />
  } else {
    view = (
      <BoardScreen
        board={board}
        dealKey={dealKey}
        animate={animate}
        fogRevealed={settings.fog}
        svgRef={svg}
        install={
          showInstall ? (
            <InstallBanner
              ios={ios && !installPrompt.available}
              onInstall={() =>
                installPrompt.available ? void installPrompt.install() : setOverlay('ios')
              }
              onDismiss={() => updatePrefs({ installHiddenUntil: Date.now() + INSTALL_SNOOZE_MS })}
            />
          ) : null
        }
        onDealEnd={onDealEnd}
        onNewBoard={newBoard}
        onNewGame={() => {
          newBoard()
          setTab('setup')
        }}
        onRebuild={() => setNonce((n) => n + 1)}
        onShare={() => setOverlay('share')}
        onCopy={() => void copy()}
        onPickScenario={() => setOverlay('sheet')}
      />
    )
  }

  return (
    <>
      <div className="screen-only">{view}</div>
      {languageOpen ? null : <TabBar active={tab} onChange={setTab} />}
      {overlay === 'sheet' ? (
        <ScenarioSheet
          game={settings.game}
          current={group}
          seats={settings.seats}
          // From the board, the sheet switches the game too; Setup has its own game tiles.
          switchGame={tab === 'board'}
          onPick={pickScenario}
          onClose={() => setOverlay(null)}
        />
      ) : null}
      {overlay === 'share' ? (
        <ShareSheet
          code={board.code}
          url={url}
          canSend={canSend}
          onCopy={() => void copy()}
          onSend={send}
          onPrint={() => {
            setOverlay(null)
            window.setTimeout(() => {
              flushSync(() => setPrinting(true))
              window.print()
            }, 250)
          }}
          onPng={() => void savePng()}
          onClose={() => setOverlay(null)}
        />
      ) : null}
      {overlay === 'ios' ? <IosInstallSheet onClose={() => setOverlay(null)} /> : null}
      {printing ? <PrintSheet board={board} url={url} fogRevealed={settings.fog} /> : null}
      {splash === 'off' ? null : <Splash leaving={splash === 'leaving'} />}
    </>
  )
}
