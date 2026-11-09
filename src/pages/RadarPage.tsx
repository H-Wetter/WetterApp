import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Pane, TileLayer, Tooltip, useMapEvents } from 'react-leaflet'
import type { LeafletEventHandlerFnMap, TileEvent } from 'leaflet'
import { RADAR_MAX_NATIVE_ZOOM, RADAR_TILE_SIZE, canLoadTiles, fetchRadarFrames, noteTileRequest, type RadarFrame } from '../api/rainviewer'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { WindyMap } from '../components/WindyMap'
import { DEFAULT_LOCATION } from '../lib/defaults'
import { RADAR_LEGEND, dbzToRainRate, formatAgo, formatClock, formatRainRate } from '../lib/radar'
import type { WeatherLocation } from '../types/location'

/** Neue Radarbilder kommen alle 10 Minuten – wir fragen alle 5 Minuten nach. */
const REFRESH_MS = 5 * 60 * 1000
/** So lange bleibt jedes Bild beim Abspielen mindestens stehen (am Ende länger). */
const FRAME_MS = 700
const END_PAUSE_MS = 2000
const TICK_MS = 200

/** Zustand der Animation. In einem ref, weil die Uhr (setInterval) immer die aktuellen Werte braucht. */
interface Anim {
  /** gerade sichtbares Bild */
  shown: RadarFrame | null
  /** Bild, das unsichtbar vorgeladen wird */
  pending: RadarFrame | null
  /** gewünschtes Bild (Index in der Liste) */
  target: number
  shownAt: number
  /** Kacheln, die das letzte Bild gebraucht hat (Schätzung fürs nächste) */
  tilesPerFrame: number
  /** verschiedene Kachel-Adressen des vorgeladenen Bilds */
  pendingTiles: Set<string>
  /** Bilder, die für den aktuellen Kartenausschnitt schon vollständig geladen sind (kosten nichts mehr) */
  loadedFrames: Set<number>
}

/** Adresse einer Kachel aus dem Leaflet-Ereignis */
function tileSrc(e: TileEvent): string {
  return (e.tile as HTMLImageElement).src
}

/** Wird die Karte verschoben oder gezoomt, braucht jedes Bild neue Kacheln. */
function MapMoveWatcher({ onMove }: { onMove: () => void }) {
  useMapEvents({ moveend: onMove })
  return null
}

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; frames: RadarFrame[] }

/** Seite „Radar“: gemessener Niederschlag der letzten ca. 2 Stunden, als Animation. */
export function RadarPage({ location }: { location: WeatherLocation | null }) {
  const place = location ?? DEFAULT_LOCATION
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [reload, setReload] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [tileError, setTileError] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  // Kopie der Werte aus dem ref, die die Anzeige braucht (das ref selbst darf man beim Zeichnen nicht lesen)
  const [view, setView] = useState<Pick<Anim, 'shown' | 'pending' | 'target'>>({ shown: null, pending: null, target: 0 })
  const anim = useRef<Anim>({ shown: null, pending: null, target: 0, shownAt: 0, tilesPerFrame: 8, pendingTiles: new Set(), loadedFrames: new Set() })
  const framesRef = useRef<RadarFrame[]>([])
  const playingRef = useRef(false)
  const bump = useCallback(() => {
    const a = anim.current
    setView({ shown: a.shown, pending: a.pending, target: a.target })
  }, [])

  // Liste der Radarbilder laden – beim Öffnen und dann alle 5 Minuten
  useEffect(() => {
    const controller = new AbortController()
    const fetchFrames = () =>
      fetchRadarFrames(controller.signal)
        .then((frames) => {
          const a = anim.current
          const old = framesRef.current
          const wasAtLatest = !a.shown || a.shown.time === old[old.length - 1]?.time
          framesRef.current = frames
          if (!a.shown) {
            // erstes Laden: gleich das neueste Bild zeigen
            a.shown = frames[frames.length - 1]
            a.shownAt = Date.now()
            a.target = frames.length - 1
          } else if (wasAtLatest && !playingRef.current) {
            a.target = frames.length - 1
          } else {
            const i = frames.findIndex((f) => f.time === a.shown?.time)
            a.target = i >= 0 ? i : 0
          }
          setLoad({ status: 'ok', frames })
          bump()
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          // Scheitert nur die Aktualisierung, bleiben die alten Bilder stehen
          if (framesRef.current.length > 0) return
          setLoad({ status: 'error', message: err instanceof Error ? err.message : 'Unbekannter Fehler.' })
        })
    fetchFrames()
    const id = window.setInterval(fetchFrames, REFRESH_MS)
    return () => {
      controller.abort()
      window.clearInterval(id)
    }
  }, [reload, bump])

  // Die Uhr der Animation: lädt das gewünschte Bild vor und schaltet beim Abspielen weiter
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now())
      const a = anim.current
      const frames = framesRef.current
      if (frames.length === 0 || a.pending) return

      const targetFrame = frames[a.target]
      if (targetFrame && targetFrame.time !== a.shown?.time) {
        // Neues Bild nötig – aber nur, wenn das Limit von RainViewer es erlaubt
        const expected = a.loadedFrames.has(targetFrame.time) ? 0 : a.tilesPerFrame
        if (canLoadTiles(expected)) {
          a.pending = targetFrame
          a.pendingTiles = new Set()
          setWaiting(false)
          bump()
        } else {
          setWaiting(true)
        }
        return
      }

      if (playingRef.current) {
        const isLast = a.target >= frames.length - 1
        if (Date.now() - a.shownAt >= (isLast ? END_PAUSE_MS : FRAME_MS)) {
          a.target = isLast ? 0 : a.target + 1
          bump()
        }
      }
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [bump])

  const countTile = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      tileloadstart: (e: TileEvent) => noteTileRequest(tileSrc(e)),
      tileerror: () => setTileError(true),
      load: () => {
        const shownFrame = anim.current.shown
        if (shownFrame) anim.current.loadedFrames.add(shownFrame.time)
      },
    }),
    [],
  )
  const pendingHandlers = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      tileloadstart: (e: TileEvent) => {
        noteTileRequest(tileSrc(e))
        anim.current.pendingTiles.add(tileSrc(e))
      },
      tileerror: () => setTileError(true),
      // alle Kacheln des vorgeladenen Bilds sind da → sichtbar machen
      load: () => {
        const a = anim.current
        if (!a.pending) return
        if (a.pendingTiles.size > 0) a.tilesPerFrame = a.pendingTiles.size
        a.loadedFrames.add(a.pending.time)
        a.shown = a.pending
        a.pending = null
        a.shownAt = Date.now()
        bump()
      },
    }),
    [bump],
  )

  function setPlayingBoth(value: boolean) {
    playingRef.current = value
    setPlaying(value)
  }

  if (load.status === 'loading') {
    return (
      <div className="page">
        <h1>Radar</h1>
        <p className="hint">Radarbilder werden geladen …</p>
        <WindyMap place={place} />
      </div>
    )
  }
  if (load.status === 'error') {
    return (
      <div className="page">
        <h1>Radar</h1>
        <div className="card">
          <p className="error">{load.message}</p>
          <button type="button" onClick={() => setReload((r) => r + 1)}>
            Erneut versuchen
          </button>
        </div>
        <WindyMap place={place} />
      </div>
    )
  }

  const frames = load.frames
  const shown = view.shown ?? frames[frames.length - 1]
  const pending = view.pending
  const target = Math.min(view.target, frames.length - 1)
  const isLatest = shown.time === frames[frames.length - 1].time

  return (
    <div className="page">
      <h1>Radar</h1>

      <div className="card syn-controls">
        <div className="syn-time">
          <button
            type="button"
            className="primary"
            onClick={() => setPlayingBoth(!playing)}
            aria-label={playing ? 'Anhalten' : 'Abspielen'}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <strong>
            {formatClock(shown.time)} <span className="muted small">({isLatest ? 'neuestes Bild, ' : ''}{formatAgo(shown.time, now)})</span>
          </strong>
        </div>
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={target}
          onChange={(e) => {
            setPlayingBoth(false)
            anim.current.target = Number(e.target.value)
            bump()
          }}
          aria-label="Zeitpunkt wählen"
        />
        {waiting && <p className="small muted">Kurz warten – RainViewer erlaubt nur 100 Kachelbilder pro Minute …</p>}
        {tileError && (
          <p className="small notice">Einige Kartenteile konnten nicht geladen werden (zu viele Anfragen?). In einer Minute erneut versuchen.</p>
        )}
      </div>

      <ErrorBoundary label="Die Radarkarte">
        <MapContainer
          className="syn-map radar-map"
          center={[place.latitude, place.longitude]}
          zoom={7}
          minZoom={4}
          maxZoom={9}
          zoomSnap={0.5}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Radar: <a href="https://www.rainviewer.com/">RainViewer</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* eigene Ebene, damit das Radar nicht wie die Grundkarte grau gefiltert wird */}
          <Pane name="radar" style={{ zIndex: 250 }}>
            <TileLayer
              key={shown.time}
              url={shown.tileUrl}
              opacity={0.8}
              maxNativeZoom={RADAR_MAX_NATIVE_ZOOM}
                tileSize={RADAR_TILE_SIZE}
                zoomOffset={-1}
              eventHandlers={countTile}
            />
            {pending && (
              <TileLayer
                key={pending.time}
                url={pending.tileUrl}
                opacity={0}
                maxNativeZoom={RADAR_MAX_NATIVE_ZOOM}
                tileSize={RADAR_TILE_SIZE}
                zoomOffset={-1}
                eventHandlers={pendingHandlers}
              />
            )}
          </Pane>
          <MapMoveWatcher onMove={() => anim.current.loadedFrames.clear()} />
          <CircleMarker
            center={[place.latitude, place.longitude]}
            radius={6}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#2f6fdd', fillOpacity: 1 }}
          >
            <Tooltip>{place.name}</Tooltip>
          </CircleMarker>
        </MapContainer>
      </ErrorBoundary>

      <div className="card syn-legend">
        <div className="radar-scale">
          {RADAR_LEGEND.map((s) => (
            <span key={s.dbz} title={`ab ca. ${formatRainRate(dbzToRainRate(s.dbz))}`}>
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
        <p className="small">
          Das Radar zeigt, wo es in den letzten ca. 2 Stunden <strong>tatsächlich</strong> geregnet oder geschneit hat (alle 10
          Minuten ein Bild). Gelb bis Rot heißt kräftiger Regen, oft Gewitter; Rosa: Hagel möglich. Fahre über die Legende für
          die ungefähre Regenmenge.
        </p>
        <p className="small muted">
          Radar: RainViewer (kostenlos für private Nutzung). Bei RainViewer gibt es keine Vorschau in die Zukunft und Details nur
          bis zu einer bestimmten Zoomstufe – beim weiteren Hineinzoomen wird das Bild unscharf. Live-Blitze gibt es leider nicht kostenlos; die
          Gewittergefahr aus der Vorhersage steht in den Warnhinweisen auf der Seite „Lokal“.
        </p>
      </div>

      <ErrorBoundary label="Die Windy-Karte">
        <WindyMap place={place} />
      </ErrorBoundary>
    </div>
  )
}
