import { useState } from 'react'
import { DEFAULT_MOUNTAIN } from './lib/defaults'
import { LocalPage } from './pages/LocalPage'
import { MountainPage } from './pages/MountainPage'
import type { WeatherLocation } from './types/location'

type Page = 'local' | 'mountain'

const PAGES: { id: Page; label: string }[] = [
  { id: 'local', label: 'Lokal' },
  { id: 'mountain', label: 'Berg & Tal' },
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
        {page === 'local' && <LocalPage location={location} setLocation={setLocation} />}
        {page === 'mountain' && (
          <MountainPage valley={location} mountain={mountain} onChooseValley={() => setPage('local')} />
        )}
      </main>
    </>
  )
}

export default App
