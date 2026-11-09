import { formatCoordinates } from '../lib/defaults'
import type { WeatherLocation } from '../types/location'

const SOURCE_LABEL: Record<WeatherLocation['source'], string> = {
  gps: 'per Browser-Standort',
  search: 'aus der Ortssuche',
  default: 'Standard-Standort',
}

/**
 * Zeigt den aktuell gewählten Ort an.
 * Mit `onToggleChange` erscheint rechts oben ein Knopf „Ort ändern“ (bzw. „Schließen“, solange die Auswahl offen ist).
 */
export function LocationCard({
  location,
  onToggleChange,
  changing = false,
}: {
  location: WeatherLocation
  onToggleChange?: () => void
  changing?: boolean
}) {
  const place = [location.region, location.country].filter(Boolean).join(', ')
  return (
    <section className="card location-card">
      <div>
        <p className="muted small">{SOURCE_LABEL[location.source]}</p>
        <h2>{location.name}</h2>
        {place && <p>{place}</p>}
        <p className="muted">
          {formatCoordinates(location.latitude, location.longitude)}
          {location.elevation !== undefined && ` · ${Math.round(location.elevation)} m`}
        </p>
      </div>
      {onToggleChange && (
        <button type="button" onClick={onToggleChange} aria-expanded={changing}>
          {changing ? 'Schließen' : 'Ort ändern'}
        </button>
      )}
    </section>
  )
}
