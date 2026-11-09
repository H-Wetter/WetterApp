import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchElevations } from '../api/elevation'
import { isPlausibleElevation } from '../api/geocoding'
import { fetchMultiModelForecast } from '../api/openMeteo'
import { MissingWebcamKeyError, clearWebcamCache, fetchWebcamsNearby, hasWebcamKey } from '../api/webcams'
import { Term } from '../components/LexikonLink'
import { DEFAULT_LOCATION } from '../lib/defaults'
import { PROFILE_EXTRA_VARIABLES, profileInversions } from '../lib/inversion'
import { localNow } from '../lib/time'
import {
  INVERSION_CHECK_MODELS,
  MOUNTAIN_MIN_ABOVE_VALLEY_M,
  WEBCAM_DEFAULT_RADIUS_KM,
  WEBCAM_RADIUS_CHOICES,
  ageText,
  fallbackLinks,
  fogPosition,
  groupByLevel,
  inversionNow,
  placeWebcams,
} from '../lib/webcams'
import type { HourInversion } from '../lib/inversion'
import type { WeatherLocation } from '../types/location'
import type { PlacedWebcam } from '../types/webcam'

const RADIUS_KEY = 'wetter-app.webcam-radius'
/** Nach so langer Zeit (ms) beim erneuten Öffnen der Seite neu laden – die Bildadressen laufen ab. */
const REFRESH_AFTER_MS = 8 * 60 * 1000

interface Props {
  /** gewählter Ort aus „Lokal“ – `null` = noch keiner, dann Graz */
  location: WeatherLocation | null
  /** Ist die Seite gerade sichtbar? (Sie bleibt im Hintergrund erhalten.) */
  active: boolean
  onChooseLocation: () => void
}

type CamState =
  | { key: string; webcams: PlacedWebcam[]; valleyElevation: number | null; elevationError: boolean; loadedAt: number }
  | { key: string; error: string; missingKey: boolean }

function readRadius(): number {
  try {
    const r = Number(localStorage.getItem(RADIUS_KEY))
    return WEBCAM_RADIUS_CHOICES.includes(r) ? r : WEBCAM_DEFAULT_RADIUS_KM
  } catch {
    return WEBCAM_DEFAULT_RADIUS_KM
  }
}

function km(d: number): string {
  return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(d < 10 ? 1 : 0).replace('.', ',')} km`
}

/** Seite „Webcams“: Webcams rund um den Ort, getrennt nach Tal- und Berglage. */
export function WebcamsPage({ location, active, onChooseLocation }: Props) {
  const place = location ?? DEFAULT_LOCATION
  const [radius, setRadius] = useState(readRadius)
  const [reload, setReload] = useState(0)
  const [camState, setCamState] = useState<CamState | null>(null)
  const [inversion, setInversion] = useState<{ key: string; hour: HourInversion | null } | null>(null)

  // ---------- 1. Webcams + Höhen laden ----------
  const camKey = `${place.latitude},${place.longitude},${radius},${reload}`
  useEffect(() => {
    const controller = new AbortController()
    const knownElevation = isPlausibleElevation(place.elevation) && place.source !== 'gps' ? place.elevation : null

    async function load(): Promise<CamState> {
      const cams = await fetchWebcamsNearby(place.latitude, place.longitude, radius, controller.signal)
      // Höhen aus dem Höhenmodell – Windy liefert keine. Bleiben dauerhaft im Speicher (Gelände ändert sich nicht).
      // Den Standort selbst fragen wir mit ab, wenn seine Höhe nicht sicher bekannt ist.
      const points = cams.map((c) => ({ lat: c.lat, lon: c.lon }))
      if (knownElevation === null) points.push({ lat: place.latitude, lon: place.longitude })
      let heights: (number | null)[] = []
      let elevationError = false
      try {
        heights = points.length > 0 ? await fetchElevations(points, controller.signal) : []
      } catch (err) {
        if (controller.signal.aborted) throw err
        elevationError = true
      }
      const valleyElevation = knownElevation ?? (heights.length > cams.length ? (heights[cams.length] ?? null) : null)
      return {
        key: camKey,
        webcams: placeWebcams(cams, { lat: place.latitude, lon: place.longitude }, radius, heights.slice(0, cams.length)),
        valleyElevation,
        elevationError,
        loadedAt: Date.now(),
      }
    }

    load()
      .then(setCamState)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setCamState({
          key: camKey,
          error: err instanceof Error ? err.message : 'Unbekannter Fehler.',
          missingKey: err instanceof MissingWebcamKeyError,
        })
      })
    return () => controller.abort()
  }, [camKey, place, radius])

  // Beim Zurückkehren auf die Seite: Sind die Bildadressen schon zu alt, neu laden.
  const loadedAt = camState && 'loadedAt' in camState ? camState.loadedAt : null
  const wasActive = useRef(active)
  useEffect(() => {
    if (active && !wasActive.current && loadedAt !== null && Date.now() - loadedAt > REFRESH_AFTER_MS) {
      setReload((r) => r + 1)
    }
    wasActive.current = active
  }, [active, loadedAt])

  // ---------- 2. Gibt es gerade eine Inversion / Hochnebel? (kleiner Abruf, 3 Modelle, 1 Tag) ----------
  const valleyElevation = camState && 'webcams' in camState ? camState.valleyElevation : null
  const invKey = valleyElevation !== null ? `${place.latitude},${place.longitude},${valleyElevation}` : ''
  useEffect(() => {
    if (!invKey || valleyElevation === null) return
    const controller = new AbortController()
    fetchMultiModelForecast(place, INVERSION_CHECK_MODELS, 1, controller.signal, PROFILE_EXTRA_VARIABLES)
      .then((fc) => setInversion({ key: invKey, hour: inversionNow(profileInversions(fc, valleyElevation), localNow(fc.utcOffsetSeconds)) }))
      // Klappt das nicht, fehlt nur der Hinweis – die Webcams gehen trotzdem.
      .catch(() => {
        if (!controller.signal.aborted) setInversion({ key: invKey, hour: null })
      })
    return () => controller.abort()
  }, [invKey, place, valleyElevation])

  const current = camState && camState.key === camKey ? camState : null
  const data = current && 'webcams' in current ? current : null
  const groups = useMemo(
    () => (data && data.valleyElevation !== null ? groupByLevel(data.webcams, data.valleyElevation) : null),
    [data],
  )
  const inv = inversion && inversion.key === invKey ? inversion.hour : null
  const fogTop = inv?.inversion && inv.fog ? inv.fogTop : null

  function chooseRadius(r: number) {
    setRadius(r)
    try {
      localStorage.setItem(RADIUS_KEY, String(r))
    } catch {
      // nicht speicherbar – gilt dann nur bis zum Neuladen
    }
  }

  function refresh() {
    clearWebcamCache()
    setReload((r) => r + 1)
  }

  return (
    <div className="page">
      <h1>Webcams</h1>
      <p className="muted">
        Live-Bilder rund um deinen Ort, nach Entfernung sortiert – getrennt nach Tal und Berg. So siehst du z. B. direkt, ob unten{' '}
        <Term id="hochnebel">Hochnebel</Term> liegt und oben die Sonne scheint.
      </p>

      {!location && (
        <p className="notice">
          Du hast noch keinen Ort gewählt – es wird Graz verwendet.{' '}
          <button type="button" className="link-button" onClick={onChooseLocation}>
            Ort wählen
          </button>
        </p>
      )}

      <section className="card terrain-card">
        <div className="terrain-head">
          <strong>
            Um {place.name}
            {data?.valleyElevation != null && ` (${Math.round(data.valleyElevation)} m)`}
          </strong>
          <div className="segmented" role="group" aria-label="Umkreis wählen">
            {WEBCAM_RADIUS_CHOICES.map((r) => (
              <button key={r} type="button" className={r === radius ? 'active' : ''} aria-pressed={r === radius} onClick={() => chooseRadius(r)}>
                {r} km
              </button>
            ))}
          </div>
        </div>

        {hasWebcamKey() && !current && <p className="hint">Webcams werden gesucht …</p>}

        {current && 'error' in current && !current.missingKey && (
          <div>
            <p className="error">{current.error}</p>
            <button type="button" onClick={refresh}>
              Erneut versuchen
            </button>
          </div>
        )}
        {current && 'error' in current && current.missingKey && (
          <p className="notice small">
            Die automatische Webcam-Suche ist noch nicht eingerichtet (es fehlt der kostenlose Windy-Schlüssel). Unten findest du
            Links zu Webcam-Seiten.
          </p>
        )}

        {data && data.webcams.length === 0 && (
          <p className="notice small">
            Im Umkreis von {radius} km hat Windy keine Webcams gefunden.
            {radius < 50 ? ' Vergrößere den Umkreis oder schau bei den Links unten.' : ' Schau bei den Links unten.'}
          </p>
        )}
        {data && data.webcams.length > 0 && (
          <p className="small muted">
            {data.webcams.length} Webcam{data.webcams.length === 1 ? '' : 's'} im Umkreis von {radius} km.{' '}
            <button type="button" className="link-button" onClick={refresh}>
              Bilder neu laden
            </button>
          </p>
        )}
        {data?.elevationError && (
          <p className="notice small">Die Höhen der Webcams konnten nicht geladen werden – darum ohne Einteilung in Tal und Berg.</p>
        )}
      </section>

      {inv?.inversion && (
        <p className="inversion-banner">
          <strong>
            Gerade <Term id="inversion">Inversion</Term>
            {fogTop !== null ? ' mit Hochnebel' : ''}
          </strong>
          {' – '}
          {fogTop !== null ? (
            <>
              geschätzte <Term id="hochnebel">Nebelobergrenze</Term> etwa {Math.round(fogTop / 50) * 50} m. Vergleiche die Tal-Webcams
              (vermutlich trüb) mit den Berg-Webcams (vermutlich darüber in der Sonne).
            </>
          ) : (
            <>oben ist es wärmer als im Tal. Vergleiche die Bilder in Tal- und Berglage.</>
          )}
          <span className="muted small"> (Schätzung aus {INVERSION_CHECK_MODELS.length} Modellen, genauer unter „Berg &amp; Tal“)</span>
        </p>
      )}

      {data && groups && data.webcams.length > 0 && (
        <>
          <WebcamSection
            title="Tallage"
            hint={`bis ${MOUNTAIN_MIN_ABOVE_VALLEY_M} m über ${place.name}`}
            variant="valley"
            webcams={groups.valley}
            fogTop={fogTop}
            onExpired={refresh}
          />
          <WebcamSection
            title="Berglage"
            hint={`mindestens ${MOUNTAIN_MIN_ABOVE_VALLEY_M} m über ${place.name}`}
            variant="mountain"
            webcams={groups.mountain}
            fogTop={fogTop}
            onExpired={refresh}
          />
          {groups.unknown.length > 0 && (
            <WebcamSection title="Ohne Höhenangabe" variant="unknown" webcams={groups.unknown} fogTop={null} onExpired={refresh} />
          )}
        </>
      )}
      {data && !groups && data.webcams.length > 0 && (
        <WebcamSection title="Alle Webcams" variant="unknown" webcams={data.webcams} fogTop={null} onExpired={refresh} />
      )}

      {data && data.webcams.length > 0 && (
        <p className="small muted webcam-credit">
          Webcams provided by{' '}
          <a href="https://www.windy.com/" target="_blank" rel="noopener noreferrer">
            Windy.com
          </a>{' '}
          ·{' '}
          <a href="https://www.windy.com/webcams/add" target="_blank" rel="noopener noreferrer">
            Webcam hinzufügen
          </a>
          . Die Bilder werden nur eingebunden, nicht gespeichert. Höhen: Open-Meteo (Höhenmodell, 90 m).
        </p>
      )}

      <section className="card">
        <h3>Weitere Webcam-Seiten</h3>
        <p className="small muted">
          {data && data.webcams.length > 0
            ? 'Noch mehr Webcams in Österreich und den Alpen (öffnen sich in einem neuen Tab):'
            : `Hier findest du Webcams rund um ${place.name} (öffnen sich in einem neuen Tab):`}
        </p>
        <ul className="webcam-links">
          {fallbackLinks(place.name).map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer">
                {l.label}
              </a>{' '}
              <span className="muted small">– {l.note}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

interface SectionProps {
  title: string
  hint?: string
  variant: 'valley' | 'mountain' | 'unknown'
  webcams: PlacedWebcam[]
  fogTop: number | null
  onExpired: () => void
}

/** So viele Webcams je Bereich zuerst zeigen – bei Städten gibt es oft sehr viele. */
const FIRST_SHOWN = 12

function WebcamSection({ title, hint, variant, webcams, fogTop, onExpired }: SectionProps) {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? webcams : webcams.slice(0, FIRST_SHOWN)
  return (
    <section className={`webcam-section webcam-${variant}`}>
      <h2>
        {title} <span className="muted small">{hint ? `(${hint}) ` : ''}· {webcams.length}</span>
      </h2>
      {webcams.length === 0 ? (
        <p className="hint small">
          {variant === 'mountain' ? 'Keine Webcam in Berglage im Umkreis – vergrößere den Umkreis.' : 'Keine Webcam in dieser Lage.'}
        </p>
      ) : (
        <ul className="webcam-grid">
          {shown.map((cam) => (
            // Neue Bildadresse = neue Karte, damit „Bild abgelaufen“ nach dem Neuladen verschwindet
            <WebcamCard key={`${cam.id}-${cam.previewUrl ?? ''}`} cam={cam} fogTop={fogTop} onExpired={onExpired} />
          ))}
        </ul>
      )}
      {webcams.length > FIRST_SHOWN && (
        <button type="button" className="webcam-more" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'Weniger anzeigen' : `Alle ${webcams.length} anzeigen`}
        </button>
      )}
    </section>
  )
}

function WebcamCard({ cam, fogTop, onExpired }: { cam: PlacedWebcam; fogTop: number | null; onExpired: () => void }) {
  const [broken, setBroken] = useState(false)
  const fog = fogPosition(cam.elevation, fogTop)
  const place = [cam.city, cam.region].filter(Boolean).join(', ')
  const age = ageText(cam.updatedAt)

  return (
    <li className="webcam-card card">
      {/* Bedingung von Windy: Das Bild verlinkt immer auf die Webcam-Seite. */}
      <a className="webcam-image" href={cam.detailUrl} target="_blank" rel="noopener noreferrer" title="Webcam bei Windy öffnen (neuer Tab)">
        {cam.previewUrl && !broken ? (
          <img src={cam.previewUrl} alt={`Webcam ${cam.title}`} loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <span className="webcam-noimage">{cam.previewUrl ? 'Bild abgelaufen' : 'kein Vorschaubild'}</span>
        )}
      </a>
      <div className="webcam-info">
        <a href={cam.detailUrl} target="_blank" rel="noopener noreferrer" className="webcam-title">
          {cam.title} ↗
        </a>
        {place && <span className="small muted">{place}</span>}
        <span className="small">
          {cam.elevation !== null ? `${Math.round(cam.elevation)} m` : 'Höhe unbekannt'} · {km(cam.distanceKm)} {cam.direction}
          {age && <span className="muted"> · Bild {age}</span>}
        </span>
        {fog === 'above' && <span className="webcam-badge fog-above">über dem Nebel</span>}
        {fog === 'inside' && <span className="webcam-badge fog-inside">im Nebelbereich</span>}
        {broken && (
          <button type="button" className="link-button small" onClick={onExpired}>
            Bilder neu laden
          </button>
        )}
      </div>
    </li>
  )
}
