import type { SynopticGrid } from '../types/synoptic'
import { friendlyError, openMeteoError } from './errors'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

/**
 * Raster: 20° W – 40° O, 70° N – 35° N, alle 2,5° → 25 × 15 = 375 Punkte.
 * Open-Meteo zählt jeden Punkt als einen Aufruf → ein Laden kostet 375 von 10.000 Aufrufen pro Tag
 * (und bleibt unter dem Minutenlimit von 600).
 */
export const GRID = { west: -20, east: 40, north: 70, south: 35, step: 2.5 } as const
/** ECMWF rechnet alle 6 Stunden neu – 3 Stunden Cache sind ein guter Kompromiss. */
export const CACHE_MAX_AGE_MS = 3 * 60 * 60 * 1000
const FORECAST_DAYS = 7
const MODEL = 'ecmwf_ifs025'
const CACHE_KEY = 'wetter-app.synoptic.v1'

function range(from: number, to: number, step: number): number[] {
  const out: number[] = []
  const n = Math.round(Math.abs(to - from) / step)
  for (let i = 0; i <= n; i++) out.push(from + Math.sign(to - from) * i * step)
  return out
}

export const GRID_LATS = range(GRID.north, GRID.south, GRID.step)
export const GRID_LONS = range(GRID.west, GRID.east, GRID.step)

interface PointResponse {
  hourly: { time: number[]; pressure_msl: (number | null)[]; geopotential_height_500hPa: (number | null)[] }
}

/** Fehlende Werte (sollten nicht vorkommen) durch den Nachbarwert ersetzen, damit die Isolinien nicht reißen. */
function fillGaps(values: (number | null)[]): number[] {
  const firstValid = values.find((v): v is number => v !== null) ?? 0
  let last = firstValid
  return values.map((v) => (v === null ? last : (last = v)))
}

// ---------- Cache ----------

/** Kompakte Form für den Browser-Speicher: gerundete Ganzzahlen statt Kommazahlen (≈ 120 KB). */
interface StoredGrid {
  times: number[]
  fetchedAt: number
  /** hPa × 10 */
  p: number[][]
  /** gpdm × 10 */
  z: number[][]
}

let memoryCache: SynopticGrid | null = null

function readCache(): SynopticGrid | null {
  if (memoryCache) return memoryCache
  try {
    const text = localStorage.getItem(CACHE_KEY)
    if (!text) return null
    const s = JSON.parse(text) as StoredGrid
    if (!Array.isArray(s.times) || !Array.isArray(s.p) || !Array.isArray(s.z)) return null
    memoryCache = {
      lats: GRID_LATS,
      lons: GRID_LONS,
      times: s.times,
      fetchedAt: s.fetchedAt,
      pressure: s.p.map((row) => row.map((v) => v / 10)),
      z500: s.z.map((row) => row.map((v) => v / 10)),
    }
    return memoryCache
  } catch {
    return null
  }
}

function writeCache(grid: SynopticGrid) {
  memoryCache = grid
  const stored: StoredGrid = {
    times: grid.times,
    fetchedAt: grid.fetchedAt,
    p: grid.pressure.map((row) => row.map((v) => Math.round(v * 10))),
    z: grid.z500.map((row) => row.map((v) => Math.round(v * 10))),
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored))
  } catch {
    // Speicher voll oder gesperrt – dann gilt der Cache nur bis zum Neuladen der Seite.
  }
}

// ---------- Abfrage ----------

async function fetchGrid(signal?: AbortSignal): Promise<SynopticGrid> {
  const lats: number[] = []
  const lons: number[] = []
  for (const lat of GRID_LATS) {
    for (const lon of GRID_LONS) {
      lats.push(lat)
      lons.push(lon)
    }
  }
  // 375 Koordinaten machen die Adresse sehr lang – darum als POST (von Open-Meteo unterstützt).
  const body = new URLSearchParams({
    latitude: lats.join(','),
    longitude: lons.join(','),
    hourly: 'pressure_msl,geopotential_height_500hPa',
    models: MODEL,
    forecast_days: String(FORECAST_DAYS),
    temporal_resolution: 'hourly_6',
    cell_selection: 'nearest',
    timeformat: 'unixtime',
    timezone: 'GMT',
  })
  const response = await fetch(FORECAST_URL, { method: 'POST', body, signal })
  if (!response.ok) throw await openMeteoError(response, 'Kartendaten konnten nicht geladen werden')

  const raw = (await response.json()) as PointResponse[]
  if (!Array.isArray(raw) || raw.length !== lats.length) throw new Error('Kartendaten sind unvollständig.')

  const times = raw[0].hourly.time.map((t) => t * 1000)
  const pressureByPoint = raw.map((p) => fillGaps(p.hourly.pressure_msl))
  // Geopotential kommt in Metern → in Dekameter umrechnen (übliche Angabe auf Wetterkarten)
  const zByPoint = raw.map((p) => fillGaps(p.hourly.geopotential_height_500hPa).map((v) => v / 10))

  // Umsortieren: [Punkt][Zeit] → [Zeit][Punkt]
  return {
    lats: GRID_LATS,
    lons: GRID_LONS,
    times,
    pressure: times.map((_, ti) => pressureByPoint.map((series) => series[ti])),
    z500: times.map((_, ti) => zByPoint.map((series) => series[ti])),
    fetchedAt: Date.now(),
  }
}

export interface SynopticResult {
  grid: SynopticGrid
  /** Daten sind älter als 3 Stunden (z. B. weil das Neuladen scheiterte) */
  stale: boolean
  /** Hinweis, wenn alte Daten gezeigt werden, weil das Laden scheiterte */
  warning: string | null
}

/**
 * Liefert das Raster – aus dem Cache, wenn es jünger als 3 Stunden ist, sonst frisch von Open-Meteo.
 * Scheitert das Laden, gibt es (falls vorhanden) die alten Daten mit Hinweis.
 */
export async function loadSynopticGrid(signal?: AbortSignal): Promise<SynopticResult> {
  const cached = readCache()
  if (cached && Date.now() - cached.fetchedAt < CACHE_MAX_AGE_MS) {
    return { grid: cached, stale: false, warning: null }
  }
  try {
    const grid = await fetchGrid(signal)
    writeCache(grid)
    return { grid, stale: false, warning: null }
  } catch (err) {
    if (signal?.aborted || !cached) throw err
    const reason = friendlyError(err)
    return { grid: cached, stale: true, warning: `${reason} Es werden ältere Daten angezeigt.` }
  }
}
