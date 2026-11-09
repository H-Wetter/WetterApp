import { useEffect, useMemo, useState } from 'react'
import { CACHE_MAX_AGE_MS, loadSynopticGrid, type SynopticResult } from '../api/synoptic'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { SynopticMap } from '../components/SynopticMap'
import { DEFAULT_LOCATION } from '../lib/defaults'
import { Z500_LEGEND, describeSynoptic, nearestTimeIndex, z500Color } from '../lib/synoptic'
import type { WeatherLocation } from '../types/location'
import { LinkedText, Term } from '../components/LexikonLink'
import { Loading } from '../components/Loading'

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; result: SynopticResult }

/** Zeitpunkt in der Zeitzone des Browsers, dazu die UTC-Stunde (so steht es auf Wetterkarten). */
function formatTime(ms: number): string {
  const local = new Date(ms).toLocaleString('de-AT', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${local} Uhr (${String(new Date(ms).getUTCHours()).padStart(2, '0')} UTC)`
}

function formatAge(ms: number): string {
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return 'gerade eben'
  if (minutes < 60) return `vor ${minutes} Min.`
  return `vor ${Math.floor(minutes / 60)} Std. ${minutes % 60} Min.`
}

/** Seite „Großwetterlage“: Europa-Karte mit Bodendruck und 500-hPa-Geopotential, 7 Tage per Zeitschieber. */
export function SynopticPage({ location }: { location: WeatherLocation | null }) {
  const place = location ?? DEFAULT_LOCATION
  const [state, setState] = useState<State>({ status: 'loading' })
  const [reload, setReload] = useState(0)
  const [timeIndex, setTimeIndex] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  // für die Anzeige „Daten von vor … Minuten“ und ob „Neu laden“ erlaubt ist
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const controller = new AbortController()
    loadSynopticGrid(controller.signal)
      .then((result) => setState({ status: 'ok', result }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Unbekannter Fehler.' })
      })
    return () => controller.abort()
  }, [reload])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const grid = state.status === 'ok' ? state.result.grid : null
  const index = grid ? (timeIndex ?? nearestTimeIndex(grid.times, now)) : 0

  // Abspielen: alle 0,8 Sekunden ein Zeitschritt weiter, am Ende anhalten
  useEffect(() => {
    if (!playing || !grid) return
    const id = window.setInterval(() => {
      setTimeIndex((prev) => {
        const current = prev ?? 0
        if (current >= grid.times.length - 1) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, 800)
    return () => window.clearInterval(id)
  }, [playing, grid])

  const description = useMemo(
    () => (grid ? describeSynoptic(grid, index, place.latitude, place.longitude) : null),
    [grid, index, place.latitude, place.longitude],
  )

  if (state.status === 'loading') {
    return (
      <div className="page">
        <h1>Großwetterlage</h1>
        <Loading>Kartendaten für Europa werden geladen …</Loading>
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="page">
        <h1>Großwetterlage</h1>
        <div className="card">
          <p className="error">{state.message}</p>
          <button type="button" onClick={() => setReload((r) => r + 1)}>
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  const { result } = state
  const g = result.grid
  const age = now - g.fetchedAt
  const canRefresh = age >= CACHE_MAX_AGE_MS

  function togglePlay() {
    if (!playing && index >= g.times.length - 1) setTimeIndex(0)
    else if (!playing) setTimeIndex(index)
    setPlaying((p) => !p)
  }

  return (
    <div className="page">
      <h1>Großwetterlage</h1>
      {result.warning && <p className="notice">{result.warning}</p>}

      <div className="card syn-controls">
        <div className="syn-time">
          <button type="button" className="primary" onClick={togglePlay} aria-label={playing ? 'Anhalten' : 'Abspielen'}>
            {playing ? '⏸' : '▶'}
          </button>
          <strong>{formatTime(g.times[index])}</strong>
        </div>
        <input
          type="range"
          min={0}
          max={g.times.length - 1}
          value={index}
          onChange={(e) => {
            setPlaying(false)
            setTimeIndex(Number(e.target.value))
          }}
          aria-label="Zeitpunkt wählen"
        />
        {description && (
          <p className="small">
            <LinkedText text={description} />
          </p>
        )}
      </div>

      <ErrorBoundary label="Die Karte" resetKey={`${g.fetchedAt}`}>
        <SynopticMap grid={g} timeIndex={index} location={place} />
      </ErrorBoundary>

      <div className="card syn-legend">
        <p className="small">
          <strong>Farbe</strong> = Höhe der 500-hPa-Fläche (ca. 5,5 km) in Dekametern. Blau: kalte Luft in der Höhe (<Term id="trog">Trog</Term>,
          unbeständig), Rot: warme Luft (<Term id="trog">Hochkeil</Term>, meist ruhig).
        </p>
        <div className="syn-scale">
          {Z500_LEGEND.map((v) => (
            <span key={v} style={{ background: z500Color(v) }}>
              {v}
            </span>
          ))}
        </div>
        <p className="small">
          <strong>Linien</strong> = <Term id="hoch-tief">Isobaren</Term> (gleicher Luftdruck am Boden) alle 5 hPa, dick alle 20 hPa. Liegen sie eng
          beieinander, weht kräftiger Wind. <strong>H</strong> = <Term id="hoch-tief">Hoch</Term>, <strong>T</strong> = <Term id="hoch-tief">Tief</Term>.
        </p>
        <p className="small muted">
          Modell ECMWF IFS, 7 Tage alle 6 Stunden. Daten geladen {formatAge(age)}; sie werden 3 Stunden zwischengespeichert, um
          die Aufrufe bei Open-Meteo zu sparen (ein Laden = 375 Rasterpunkte).
          {canRefresh && (
            <>
              {' '}
              <button type="button" onClick={() => setReload((r) => r + 1)}>
                Neu laden
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
