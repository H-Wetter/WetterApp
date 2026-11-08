import { openMeteoError } from './errors'

/**
 * Geländehöhe von Open-Meteo (Copernicus-Höhenmodell, 90 m Auflösung).
 * Bis 100 Punkte pro Anfrage, aber JEDER Punkt zählt als ein Aufruf (Minutenlimit 600, Tag 10.000).
 * Darum: jede Höhe dauerhaft im Browser merken (Gelände ändert sich nicht) und Anfragen pro Minute begrenzen.
 */

const ELEVATION_URL = 'https://api.open-meteo.com/v1/elevation'
const BATCH = 100
/** Höchstens so viele neue Punkte pro Minute – Abstand zum Limit von 600, die Vorhersage braucht auch Aufrufe */
const POINTS_PER_MINUTE = 500
const CACHE_KEY = 'wetter-app.elevation.v1'
/** Größe des Speichers begrenzen (ca. 15 Byte pro Punkt) */
const CACHE_MAX_POINTS = 8000

export interface LatLon {
  lat: number
  lon: number
}

/** Schlüssel eines Punkts: auf 4 Nachkommastellen (≈ 10 m) gerundet */
function pointKey(p: LatLon): string {
  return `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`
}

function loadCache(): Map<string, number> {
  try {
    const text = localStorage.getItem(CACHE_KEY)
    if (!text) return new Map()
    const parsed = JSON.parse(text) as Record<string, number>
    return new Map(Object.entries(parsed).filter(([, h]) => typeof h === 'number'))
  } catch {
    return new Map()
  }
}

const cache = loadCache()

function saveCache() {
  // Erst zusammenführen: Ein zweiter Browser-Tab der App könnte inzwischen andere Punkte gespeichert haben.
  for (const [key, h] of loadCache()) if (!cache.has(key)) cache.set(key, h)
  // älteste Einträge zuerst entfernen (Map behält die Einfüge-Reihenfolge)
  while (cache.size > CACHE_MAX_POINTS) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(cache)))
  } catch {
    // Speicher voll oder gesperrt – dann gilt der Cache nur bis zum Neuladen.
  }
}

/** Zeitpunkte der Punkte, die in der letzten Minute angefragt wurden */
const stamps: number[] = []

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      window.clearTimeout(id)
      reject(new DOMException('Abgebrochen', 'AbortError'))
    })
  })
}

/** Wartet, bis `count` weitere Punkte ins Minutenbudget passen. */
async function waitForBudget(count: number, signal?: AbortSignal, onWait?: (seconds: number) => void) {
  for (;;) {
    const limit = Date.now() - 60_000
    while (stamps.length > 0 && stamps[0] < limit) stamps.shift()
    if (stamps.length + count <= POINTS_PER_MINUTE) return
    const seconds = Math.ceil((stamps[0] + 60_000 - Date.now()) / 1000)
    onWait?.(seconds)
    await wait(Math.max(1000, seconds * 1000), signal)
  }
}

/**
 * Höhen für viele Punkte. Bekannte Punkte kommen aus dem Speicher, nur neue werden angefragt.
 * @param onWait wird aufgerufen, wenn wegen des Minutenlimits gewartet werden muss (Sekunden)
 */
export async function fetchElevations(points: LatLon[], signal?: AbortSignal, onWait?: (seconds: number) => void): Promise<number[]> {
  const missing = [...new Map(points.filter((p) => !cache.has(pointKey(p))).map((p) => [pointKey(p), p])).values()]

  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH)
    await waitForBudget(batch.length, signal, onWait)
    const params = new URLSearchParams({
      latitude: batch.map((p) => p.lat.toFixed(4)).join(','),
      longitude: batch.map((p) => p.lon.toFixed(4)).join(','),
    })
    const now = Date.now()
    batch.forEach(() => stamps.push(now))
    const response = await fetch(`${ELEVATION_URL}?${params.toString()}`, { signal })
    if (!response.ok) throw await openMeteoError(response, 'Geländehöhen konnten nicht geladen werden')
    const raw = (await response.json()) as { elevation?: number[] }
    if (!raw.elevation || raw.elevation.length !== batch.length) throw new Error('Geländehöhen sind unvollständig.')
    batch.forEach((p, k) => cache.set(pointKey(p), raw.elevation?.[k] ?? 0))
  }
  if (missing.length > 0) saveCache()

  return points.map((p) => cache.get(pointKey(p)) ?? 0)
}
