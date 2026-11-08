import type { WeatherLocation } from '../types/location'

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

/** So sieht ein Treffer in der Antwort der Open-Meteo Geocoding API aus (nur die Felder, die wir nutzen). */
interface GeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  elevation?: number
  country?: string
  admin1?: string
}

interface GeocodingResponse {
  /** Fehlt komplett, wenn nichts gefunden wurde. */
  results?: GeocodingResult[]
}

/**
 * Ist das eine echte Höhe? Tiefster Ort an Land: Totes Meer ca. −430 m, höchster: Mount Everest 8849 m.
 * Alles außerhalb (z. B. der Platzhalter −9999) gilt als „unbekannt“.
 */
export function isPlausibleElevation(h: number | null | undefined): h is number {
  return typeof h === 'number' && Number.isFinite(h) && h >= -500 && h <= 9000
}

export interface SearchHit extends WeatherLocation {
  id: number
}

/**
 * Sucht Orte nach Namen (deutsche Ortsnamen).
 * `signal` erlaubt es, eine veraltete Suche abzubrechen, wenn weitergetippt wird.
 */
export async function searchLocations(query: string, signal?: AbortSignal): Promise<SearchHit[]> {
  const params = new URLSearchParams({
    name: query,
    count: '8',
    language: 'de',
    format: 'json',
  })

  const response = await fetch(`${GEOCODING_URL}?${params.toString()}`, { signal })
  if (!response.ok) {
    throw new Error(`Ortssuche fehlgeschlagen (HTTP ${response.status})`)
  }

  const data = (await response.json()) as GeocodingResponse
  return (data.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    // Open-Meteo liefert −9999 als Platzhalter für „Höhe unbekannt“ – das darf nie weitergereicht werden
    elevation: isPlausibleElevation(r.elevation) ? r.elevation : undefined,
    country: r.country,
    region: r.admin1,
    source: 'search',
  }))
}
