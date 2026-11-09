import type { Webcam } from '../types/webcam'

/**
 * Webcams von Windy (Webcams API v3, https://api.windy.com/webcams/docs), am 09.11.2026 geprüft.
 *
 * Bedingungen (https://api.windy.com/webcams/terms), kurz:
 * – Quellenangabe „Webcams provided by Windy.com“ mit Link sichtbar anzeigen
 * – Bilder nur in Originalgröße oder kleiner, nur die Adressen aus der API verwenden
 * – jedes Bild verlinkt auf die Webcam-Seite bei Windy
 * – Bilder NICHT speichern/kopieren: Die Bildadressen laufen in der Gratis-Version nach ca. 10 Minuten ab
 *
 * Der Schlüssel kommt aus der Datei `.env` (VITE_WINDY_API_KEY) – nie direkt in den Code schreiben.
 */

const WEBCAMS_URL = 'https://api.windy.com/webcams/api/v3/webcams'
/** Mehr als 50 pro Anfrage erlaubt Windy nicht. */
const PAGE_SIZE = 50
/** Höchstens so viele Seiten (= 150 Webcams) – reicht auch für 50 km um eine Stadt. */
const MAX_PAGES = 3
/**
 * Ergebnis merken: 8 Minuten. Etwas weniger als die ca. 10 Minuten, nach denen die
 * Bildadressen ablaufen – sonst würden wir abgelaufene Bilder zeigen.
 */
const CACHE_MS = 8 * 60 * 1000

/** Fehler, wenn kein Schlüssel eingetragen ist – die Seite zeigt dann nur die Such-Links. */
export class MissingWebcamKeyError extends Error {
  constructor() {
    super('Für die Webcam-Suche fehlt der Windy-Schlüssel (VITE_WINDY_API_KEY in der Datei .env).')
  }
}

/** Ist ein Windy-Schlüssel eingetragen? */
export function hasWebcamKey(): boolean {
  return Boolean(import.meta.env.VITE_WINDY_API_KEY?.trim())
}

// ---------- So sieht die Antwort von Windy aus (nur die Felder, die wir brauchen) ----------

interface RawWebcam {
  webcamId?: number | string
  title?: string
  status?: string
  lastUpdatedOn?: string
  location?: { city?: string; region?: string; country?: string; latitude?: number; longitude?: number }
  images?: { current?: { preview?: string; thumbnail?: string } }
  urls?: { detail?: string }
}

interface RawResponse {
  total?: number
  webcams?: RawWebcam[]
}

/** Windy schreibt bei fehlenden Angaben manchmal „unknown“ – das zeigen wir nicht an. */
function known(text: string | undefined): string | undefined {
  const t = text?.trim()
  return t && t.toLowerCase() !== 'unknown' ? t : undefined
}

function toWebcam(raw: RawWebcam): Webcam | null {
  const lat = raw.location?.latitude
  const lon = raw.location?.longitude
  if (raw.webcamId === undefined || typeof lat !== 'number' || typeof lon !== 'number') return null
  // Nur aktive Webcams (Windy liefert sonst evtl. abgeschaltete mit)
  if (raw.status && raw.status !== 'active') return null
  const id = String(raw.webcamId)
  const updated = raw.lastUpdatedOn ? Date.parse(raw.lastUpdatedOn) : NaN
  return {
    id,
    title: raw.title?.trim() || 'Webcam',
    city: known(raw.location?.city),
    region: known(raw.location?.region),
    country: known(raw.location?.country),
    lat,
    lon,
    previewUrl: raw.images?.current?.preview ?? raw.images?.current?.thumbnail,
    detailUrl: raw.urls?.detail ?? `https://www.windy.com/webcams/${id}`,
    updatedAt: Number.isFinite(updated) ? updated : undefined,
  }
}

async function fetchPage(lat: number, lon: number, radiusKm: number, offset: number, key: string, signal?: AbortSignal): Promise<RawResponse> {
  const params = new URLSearchParams({
    // Achtung: klein geschrieben „nearby“, sonst wird der Filter ignoriert
    nearby: `${lat.toFixed(4)},${lon.toFixed(4)},${radiusKm}`,
    limit: String(PAGE_SIZE),
    offset: String(offset),
    include: 'images,location,urls',
    lang: 'de',
  })
  const response = await fetch(`${WEBCAMS_URL}?${params.toString()}`, { signal, headers: { 'x-windy-api-key': key } })
  if (response.status === 401 || response.status === 403) {
    throw new Error('Windy hat den Schlüssel abgelehnt. Ist er richtig eingetragen? (Ein neuer Schlüssel braucht ein paar Minuten, bis er gilt.)')
  }
  if (response.status === 429) throw new Error('Windy meldet zu viele Anfragen. Bitte in ein paar Minuten erneut versuchen.')
  if (!response.ok) throw new Error(`Webcams konnten nicht geladen werden (HTTP ${response.status}).`)
  return (await response.json()) as RawResponse
}

// ---------- Kurzzeit-Speicher (nur im Arbeitsspeicher, Bilder werden nie gespeichert) ----------

const cache = new Map<string, { time: number; webcams: Webcam[] }>()

/** Gemerkte Ergebnisse vergessen – z. B. wenn Bilder abgelaufen sind. */
export function clearWebcamCache() {
  cache.clear()
}

/**
 * Webcams im Umkreis eines Punkts (unsortiert – Sortieren macht `lib/webcams.ts`).
 * @throws MissingWebcamKeyError, wenn kein Schlüssel eingetragen ist
 */
export async function fetchWebcamsNearby(lat: number, lon: number, radiusKm: number, signal?: AbortSignal): Promise<Webcam[]> {
  const key = import.meta.env.VITE_WINDY_API_KEY?.trim()
  if (!key) throw new MissingWebcamKeyError()

  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)},${radiusKm}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.time < CACHE_MS) return hit.webcams

  const found = new Map<string, Webcam>()
  for (let page = 0; page < MAX_PAGES; page++) {
    const raw = await fetchPage(lat, lon, radiusKm, page * PAGE_SIZE, key, signal)
    const list = raw.webcams ?? []
    for (const r of list) {
      const cam = toWebcam(r)
      if (cam) found.set(cam.id, cam)
    }
    // Weiter nur, wenn es noch mehr gibt
    const total = raw.total ?? 0
    if (list.length < PAGE_SIZE || (page + 1) * PAGE_SIZE >= total) break
  }

  const webcams = [...found.values()]
  cache.set(cacheKey, { time: Date.now(), webcams })
  return webcams
}
