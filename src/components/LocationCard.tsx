import { formatCoordinates } from '../lib/defaults'
import type { WeatherLocation } from '../types/location'

const SOURCE_LABEL: Record<WeatherLocation['source'], string> = {
  gps: 'per Browser-Standort',
  search: 'aus der Ortssuche',
  default: 'Standard-Standort',
}

/** Zeigt den aktuell gewählten Ort an. */
export function LocationCard({ location }: { location: WeatherLocation }) {
  const place = [location.region, location.country].filter(Boolean).join(', ')
  return (
    <section className="card">
      <p className="muted small">{SOURCE_LABEL[location.source]}</p>
      <h2>{location.name}</h2>
      {place && <p>{place}</p>}
      <p className="muted">
        {formatCoordinates(location.latitude, location.longitude)}
        {location.elevation !== undefined && ` · ${Math.round(location.elevation)} m`}
      </p>
    </section>
  )
}
