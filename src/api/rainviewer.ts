/**
 * Regenradar von RainViewer (https://www.rainviewer.com/api.html) – kostenlos für private Nutzung,
 * Quellenangabe Pflicht. Grenzen seit 1.1.2026 (am 08.11.2026 geprüft):
 * – nur Bilder der letzten ca. 2 Stunden (keine Vorschau), alle 10 Minuten
 * – höchstens Zoomstufe 7, nur das Farbschema „Universal Blue“
 * – höchstens 100 Anfragen pro Minute und Gerät (jede Kachel zählt!)
 */

const MAPS_URL = 'https://api.rainviewer.com/public/weather-maps.json'
/** Farbschema 2 = Universal Blue (das einzige, das es kostenlos noch gibt) */
const COLOR_SCHEME = 2
/** 1_0 = geglättet, Schnee nicht extra einfärben (sonst bräuchte es eine zweite Legende) */
const OPTIONS = '1_0'
/**
 * Wir holen 512-Pixel-Kacheln: Eine davon deckt so viel ab wie vier kleine, zählt aber nur als eine Anfrage.
 * Leaflet rechnet dafür mit zoomOffset −1. RainViewer liefert sie bis Kachel-Zoom 7 = Karten-Zoom 8.
 */
export const RADAR_TILE_SIZE = 512
export const RADAR_MAX_NATIVE_ZOOM = 8

export interface RadarFrame {
  /** Zeitpunkt in ms (UTC) */
  time: number
  /** Adresse der Kachelbilder für Leaflet, mit {z}/{x}/{y} */
  tileUrl: string
}

interface MapsResponse {
  host: string
  radar: { past: { time: number; path: string }[] }
}

/** Liste der verfügbaren Radarbilder (älteste zuerst). Kostet eine Anfrage. */
export async function fetchRadarFrames(signal?: AbortSignal): Promise<RadarFrame[]> {
  const response = await fetch(MAPS_URL, { signal })
  if (response.status === 429) throw new Error('RainViewer meldet zu viele Anfragen. Bitte eine Minute warten.')
  if (!response.ok) throw new Error(`Radardaten konnten nicht geladen werden (HTTP ${response.status}).`)
  const raw = (await response.json()) as MapsResponse
  if (!raw.radar?.past?.length) throw new Error('RainViewer liefert gerade keine Radarbilder.')
  return raw.radar.past.map((f) => ({
    time: f.time * 1000,
    tileUrl: `${raw.host}${f.path}/${RADAR_TILE_SIZE}/{z}/{x}/{y}/${COLOR_SCHEME}/${OPTIONS}.png`,
  }))
}

// ---------- Mitzählen der Kachel-Anfragen (Limit 100 pro Minute) ----------

const WINDOW_MS = 60_000
/** Etwas Abstand zum echten Limit von 100 */
const BUDGET = 85
/**
 * Schon geladene Kachel-Adressen mit Zeitpunkt. Die liegen im Browser-Cache (2 Tage) und kosten keine
 * Anfrage mehr. Im Browser gespeichert, damit das auch nach dem Neuladen der Seite gilt.
 * Radarbilder sind nach ca. 2 Stunden weg – darum merken wir uns die Adressen 3 Stunden.
 */
const SEEN_KEY = 'wetter-app.radar-tiles.v1'
const SEEN_MAX_AGE_MS = 3 * 60 * 60 * 1000

interface StoredSeen {
  /** Adresse → Zeitpunkt der Anfrage (ms) */
  seen: Record<string, number>
}

function loadSeen(): Map<string, number> {
  try {
    const text = localStorage.getItem(SEEN_KEY)
    if (!text) return new Map()
    const stored = JSON.parse(text) as StoredSeen
    const limit = Date.now() - SEEN_MAX_AGE_MS
    return new Map(Object.entries(stored.seen ?? {}).filter(([, t]) => typeof t === 'number' && t >= limit))
  } catch {
    return new Map()
  }
}

const seen = loadSeen()
/** Anfragen der letzten Minute – auch aus dem Speicher, falls die Seite gerade neu geladen wurde */
const stamps: number[] = [...seen.values()].filter((t) => t >= Date.now() - WINDOW_MS).sort((a, b) => a - b)
let saveTimer: number | undefined

function saveSeen() {
  window.clearTimeout(saveTimer)
  // gebündelt speichern statt bei jeder einzelnen Kachel
  saveTimer = window.setTimeout(() => {
    const limit = Date.now() - SEEN_MAX_AGE_MS
    for (const [url, t] of seen) if (t < limit) seen.delete(url)
    try {
      const stored: StoredSeen = { seen: Object.fromEntries(seen) }
      localStorage.setItem(SEEN_KEY, JSON.stringify(stored))
    } catch {
      // Speicher voll oder gesperrt – dann zählt der Zähler nach dem Neuladen nur vorsichtiger.
    }
  }, 1000)
}

function prune() {
  const limit = Date.now() - WINDOW_MS
  while (stamps.length > 0 && stamps[0] < limit) stamps.shift()
}

/** Bei jeder Kachel aufrufen, die der Browser anfordert. Bereits bekannte Adressen zählen nicht. */
export function noteTileRequest(url: string) {
  if (!url || seen.has(url)) return
  const now = Date.now()
  seen.set(url, now)
  stamps.push(now)
  saveSeen()
}

/** Dürfen wir jetzt ein weiteres Radarbild mit etwa `expectedTiles` Kacheln laden? */
export function canLoadTiles(expectedTiles: number): boolean {
  prune()
  return stamps.length + expectedTiles <= BUDGET
}
