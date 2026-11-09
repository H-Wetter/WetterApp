import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LexikonContext } from './components/lexikonContext'
import { LexikonPage } from './pages/LexikonPage'
import { LocalPage } from './pages/LocalPage'
import { MountainPage } from './pages/MountainPage'
import { SynopticPage } from './pages/SynopticPage'
import { RadarPage } from './pages/RadarPage'
import { WebcamsPage } from './pages/WebcamsPage'
import type { WeatherLocation } from './types/location'

type Page = 'local' | 'mountain' | 'webcams' | 'radar' | 'synoptic' | 'lexikon'

const PAGES: { id: Page; label: string; short?: string }[] = [
  { id: 'local', label: 'Lokal' },
  { id: 'mountain', label: 'Berg & Tal' },
  { id: 'webcams', label: 'Webcams', short: 'Cams' },
  { id: 'radar', label: 'Radar' },
  { id: 'synoptic', label: 'Großwetterlage', short: 'Wetterlage' },
  { id: 'lexikon', label: 'Wetterlexikon', short: 'Lexikon' },
]

/**
 * Diese Seiten bleiben nach dem ersten Öffnen im Hintergrund erhalten (nur ausgeblendet).
 * So lädt z. B. „Berg & Tal“ nach einem Abstecher ins Lexikon nicht alles neu – das spart Abrufe –
 * und man steht wieder an derselben Stelle. Nur das Radar wird jedes Mal neu aufgebaut,
 * weil es im Hintergrund sonst weiter Radarbilder nachladen würde.
 */
const KEEP_ALIVE: Page[] = ['local', 'mountain', 'webcams', 'synoptic', 'lexikon']

function App() {
  const [page, setPage] = useState<Page>('local')
  const [visited, setVisited] = useState<Set<Page>>(() => new Set(['local']))
  // Gewählter Ort (Tal) – gilt für alle Seiten
  const [location, setLocation] = useState<WeatherLocation | null>(null)
  // Sprungziel im Lexikon und Seite, von der man kam
  const [lexTarget, setLexTarget] = useState<{ id: string; nonce: number } | null>(null)
  const [cameFrom, setCameFrom] = useState<Page | null>(null)

  // Scroll-Position je Seite, damit man nach „Zurück“ wieder an derselben Stelle steht
  const scrollPos = useRef<Partial<Record<Page, number>>>({})

  const go = useCallback(
    (next: Page) => {
      scrollPos.current[page] = window.scrollY
      setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)))
      setPage(next)
    },
    [page],
  )

  // Nach dem Seitenwechsel – noch bevor gezeichnet wird – die gemerkte Scroll-Position wiederherstellen.
  // (Ein Sprung im Lexikon passiert danach in LexikonPage und gewinnt.)
  useLayoutEffect(() => {
    window.scrollTo(0, scrollPos.current[page] ?? 0)
  }, [page])

  // Wird von antippbaren Begriffen überall in der App aufgerufen
  const openLexikon = useCallback(
    (id: string) => {
      setCameFrom((prev) => (page === 'lexikon' ? prev : page))
      setLexTarget({ id, nonce: Date.now() })
      go('lexikon')
    },
    [page, go],
  )

  const locationKey = location ? `${location.latitude},${location.longitude}` : ''
  const shows = (p: Page) => page === p || (KEEP_ALIVE.includes(p) && visited.has(p))

  return (
    <LexikonContext.Provider value={openLexikon}>
      <header className="app-header">
        <span className="brand">⛅ Wetter-App</span>
        <nav className="nav">
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              className={page === p.id ? 'nav-item active' : 'nav-item'}
              aria-current={page === p.id ? 'page' : undefined}
              onClick={() => {
                if (p.id === 'lexikon') setCameFrom(null)
                go(p.id)
              }}
            >
              {p.short ? (
                <>
                  <span className="nav-long">{p.label}</span>
                  <span className="nav-short">{p.short}</span>
                </>
              ) : (
                p.label
              )}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {/* Äußerste Fehlergrenze je Seite: Selbst wenn eine Seite scheitert, bleiben Kopfzeile und andere Seite nutzbar. */}
        {shows('local') && (
          <div hidden={page !== 'local'}>
            <ErrorBoundary label="Die Seite „Lokal“" resetKey={locationKey}>
              <LocalPage location={location} setLocation={setLocation} />
            </ErrorBoundary>
          </div>
        )}
        {shows('mountain') && (
          <div hidden={page !== 'mountain'}>
            <ErrorBoundary label="Die Seite „Berg & Tal“" resetKey={locationKey}>
              <MountainPage valley={location} onChooseValley={() => go('local')} />
            </ErrorBoundary>
          </div>
        )}
        {shows('webcams') && (
          <div hidden={page !== 'webcams'}>
            <ErrorBoundary label="Die Seite „Webcams“" resetKey={locationKey}>
              <WebcamsPage location={location} active={page === 'webcams'} onChooseLocation={() => go('local')} />
            </ErrorBoundary>
          </div>
        )}
        {page === 'radar' && (
          <ErrorBoundary label="Die Seite „Radar“">
            <RadarPage location={location} />
          </ErrorBoundary>
        )}
        {shows('synoptic') && (
          <div hidden={page !== 'synoptic'}>
            <ErrorBoundary label="Die Seite „Großwetterlage“">
              <SynopticPage location={location} />
            </ErrorBoundary>
          </div>
        )}
        {shows('lexikon') && (
          <div hidden={page !== 'lexikon'}>
            <ErrorBoundary label="Das Wetterlexikon">
              <LexikonPage
                target={lexTarget}
                backLabel={cameFrom ? (PAGES.find((p) => p.id === cameFrom)?.label ?? null) : null}
                onBack={() => {
                  if (cameFrom) go(cameFrom)
                  setCameFrom(null)
                }}
              />
            </ErrorBoundary>
          </div>
        )}
      </main>
    </LexikonContext.Provider>
  )
}

export default App
