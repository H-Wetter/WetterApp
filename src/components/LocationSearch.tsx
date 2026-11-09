import { useEffect, useState, type FormEvent } from 'react'
import { searchLocations, type SearchHit } from '../api/geocoding'
import type { WeatherLocation } from '../types/location'
import { Loading } from './Loading'
import { ErrorMessage } from './ErrorMessage'
import { friendlyError } from '../api/errors'

interface Props {
  onSelect: (location: WeatherLocation) => void
}

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; query: string; hits: SearchHit[] }
  | { status: 'error'; message: string }

function errorText(err: unknown): string {
  const message = friendlyError(err)
  return `Suche nicht möglich: ${message}`
}

/**
 * Suchfeld für Orte (Open-Meteo Geocoding, deutsch).
 * – Beim Tippen erscheinen Vorschläge (nach kurzer Pause).
 * – Enter oder „Übernehmen“ nimmt direkt den besten Treffer, z. B. „Wien“ → Wien, Österreich.
 */
export function LocationSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>({ status: 'idle' })

  const trimmed = query.trim()
  // Unter 2 Zeichen wird nicht gesucht – dann zeigen wir einfach nichts an.
  const tooShort = trimmed.length < 2
  const shown: SearchState = tooShort ? { status: 'idle' } : state

  useEffect(() => {
    if (tooShort) return

    const controller = new AbortController()
    // 300 ms warten, damit nicht bei jedem Tastendruck eine Anfrage rausgeht.
    const timer = setTimeout(() => {
      setState({ status: 'loading' })
      searchLocations(trimmed, controller.signal)
        .then((hits) => setState({ status: 'done', query: trimmed, hits }))
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          setState({ status: 'error', message: errorText(err) })
        })
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed, tooShort])

  function choose(hit: SearchHit) {
    onSelect(hit)
    setQuery('')
  }

  // Enter / „Übernehmen“: besten (ersten) Treffer übernehmen.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (tooShort) return

    // Liegen schon Ergebnisse für genau diesen Text vor, nehmen wir die.
    if (state.status === 'done' && state.query === trimmed) {
      if (state.hits.length > 0) choose(state.hits[0])
      return
    }

    // Sonst sofort suchen (ohne auf die Tipp-Pause zu warten).
    setState({ status: 'loading' })
    try {
      const hits = await searchLocations(trimmed)
      setState({ status: 'done', query: trimmed, hits })
      if (hits.length > 0) choose(hits[0])
    } catch (err: unknown) {
      setState({ status: 'error', message: errorText(err) })
    }
  }

  return (
    <form className="search" onSubmit={handleSubmit}>
      <label htmlFor="location-search" className="sr-only">
        Ort suchen
      </label>
      <div className="search-row">
        <input
          id="location-search"
          type="search"
          placeholder="z. B. Wien, Innsbruck, Schöckl …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="primary" disabled={tooShort}>
          Übernehmen
        </button>
      </div>

      {shown.status === 'loading' && <Loading>Suche läuft …</Loading>}
      {shown.status === 'error' && <ErrorMessage message={shown.message} />}
      {shown.status === 'done' && shown.hits.length === 0 && (
        <p className="hint">Kein Ort mit diesem Namen gefunden.</p>
      )}
      {shown.status === 'done' && shown.hits.length > 0 && (
        <ul className="search-results">
          {shown.hits.map((hit) => (
            <li key={hit.id}>
              <button type="button" onClick={() => choose(hit)}>
                <strong>{hit.name}</strong>
                <span className="muted">
                  {[hit.region, hit.country].filter(Boolean).join(', ')}
                  {hit.elevation !== undefined && ` · ${Math.round(hit.elevation)} m`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
