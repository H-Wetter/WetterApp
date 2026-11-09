import { ErrorBoundary } from '../components/ErrorBoundary'
import { WindyMap } from '../components/WindyMap'
import { DEFAULT_LOCATION } from '../lib/defaults'
import { blitzortungMapUrl } from '../lib/radar'
import type { WeatherLocation } from '../types/location'

/**
 * Seite „Radar“: die eingebettete Windy-Karte (Radar, Satellit, Regen, Wind …)
 * und ein Link zur Live-Blitzkarte von Blitzortung.org.
 * (Bis 09.11.2026 gab es hier zusätzlich ein eigenes RainViewer-Radar – Windy reicht.)
 */
export function RadarPage({ location }: { location: WeatherLocation | null }) {
  const place = location ?? DEFAULT_LOCATION
  return (
    <div className="page">
      <h1>Radar</h1>

      <ErrorBoundary label="Die Windy-Karte">
        <WindyMap place={place} />
      </ErrorBoundary>

      <p className="card small">
        ⚡ <strong>Blitze live:</strong>{' '}
        <a href={blitzortungMapUrl(place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer">
          Blitzkarte von Blitzortung.org öffnen
        </a>{' '}
        <span className="muted">
          (neuer Tab; die Daten dürfen nicht direkt in fremde Apps eingebaut werden). Die Gewittergefahr aus der Vorhersage steht
          in den Warnhinweisen auf der Seite „Lokal“.
        </span>
      </p>
    </div>
  )
}
