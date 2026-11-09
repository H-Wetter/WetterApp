import type { LocationSource, WeatherLocation } from '../types/location'

/**
 * Merkt sich den zuletzt gewählten Ort im Browser (localStorage).
 * So steht nach dem Neuladen der Seite gleich wieder das Wetter da – und dank des
 * 30-Minuten-Caches (src/api/cache.ts) meist ganz ohne neue Abrufe bei Open-Meteo.
 * Der Ort bleibt nur in diesem Browser auf diesem Gerät, er wird nirgendwohin geschickt.
 */
const STORAGE_KEY = 'wetterapp-ort'

const SOURCES: LocationSource[] = ['gps', 'search', 'default']

/** Prüft, ob der gespeicherte Text wirklich ein brauchbarer Ort ist (er könnte alt oder kaputt sein). */
function isLocation(value: unknown): value is WeatherLocation {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.name === 'string' &&
    typeof v.latitude === 'number' &&
    Math.abs(v.latitude) <= 90 &&
    typeof v.longitude === 'number' &&
    Math.abs(v.longitude) <= 180 &&
    (v.elevation === undefined || typeof v.elevation === 'number') &&
    SOURCES.includes(v.source as LocationSource)
  )
}

export function loadSavedLocation(): WeatherLocation | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (!text) return null
    const parsed = JSON.parse(text) as unknown
    return isLocation(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** `null` löscht den gemerkten Ort. */
export function saveLocation(location: WeatherLocation | null) {
  try {
    if (location) localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Speicher gesperrt (z. B. privater Modus) – dann wird der Ort eben nicht gemerkt.
  }
}
