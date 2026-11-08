import { useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DEFAULT_MOUNTAIN } from './lib/defaults'
import { LocalPage } from './pages/LocalPage'
import { MountainPage } from './pages/MountainPage'
import { SynopticPage } from './pages/SynopticPage'
import { RadarPage } from './pages/RadarPage'
import type { WeatherLocation } from './types/location'

type Page = 'local' | 'mountain' | 'radar' | 'synoptic'

const PAGES: { id: Page; label: string }[] = [
  { id: 'local', label: 'Lokal' },
  { id: 'mountain', label: 'Berg & Tal' },
  { id: 'radar', label: 'Radar' },
  { id: 'synoptic', label: 'Großwetterlage' },
]

function App() {
  const [page, setPage] = useState<Page>('local')
  // Gewählter Ort (Tal) – gilt für alle Seiten
  const [location, setLocation] = useState<WeatherLocation | null>(null)
  // Bergpunkt – vorerst fest der Schöckl, später wählbar
  const [mountain] = useState<WeatherLocation>(DEFAULT_MOUNTAIN)

  return (
    <>
      <header className="app-header">
        <span className="brand">⛅ Wetter-App</span>
        <nav className="nav">
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              className={page === p.id ? 'nav-item active' : 'nav-item'}
              aria-current={page === p.id ? 'page' : undefined}
              onClick={() => setPage(p.id)}
            >
              {p.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {/* Äußerste Fehlergrenze je Seite: Selbst wenn eine Seite scheitert, bleiben Kopfzeile und andere Seite nutzbar. */}
        {page === 'local' && (
          <ErrorBoundary label="Die Seite „Lokal“" resetKey={location ? `${location.latitude},${location.longitude}` : ''}>
            <LocalPage location={location} setLocation={setLocation} />
          </ErrorBoundary>
        )}
        {page === 'mountain' && (
          <ErrorBoundary label="Die Seite „Berg & Tal“" resetKey={location ? `${location.latitude},${location.longitude}` : ''}>
            <MountainPage valley={location} mountain={mountain} onChooseValley={() => setPage('local')} />
          </ErrorBoundary>
        )}
        {page === 'radar' && (
          <ErrorBoundary label="Die Seite „Radar“">
            <RadarPage location={location} />
          </ErrorBoundary>
        )}
        {page === 'synoptic' && (
          <ErrorBoundary label="Die Seite „Großwetterlage“">
            <SynopticPage location={location} />
          </ErrorBoundary>
        )}
      </main>
    </>
  )
}

export default App
