import type { Alpenpunkt } from '../data/alpenpunkte'
import type { AlpenDaten, AlpenVariable, EuropeGrid, StaubDaten } from '../types/grosswetterlage'
import { fetchJsonCached } from './cache'
import { openMeteoError } from './errors'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

/**
 * Europa-Raster: 15° W bis 35° O, 65° N bis 35° N, alle 2,5° → 21 × 13 = 273 Punkte.
 * Open-Meteo zählt jeden Punkt als einen Aufruf: Ein Laden kostet 273 von 10.000 Aufrufen pro Tag
 * und bleibt unter dem Minutenlimit von 600. Darum wird das Ergebnis eine Stunde aufgehoben.
 */
export const EUROPE_GRID = { west: -15, east: 35, north: 65, south: 35, step: 2.5 } as const
/** Haltedauer im Zwischenspeicher: 1 Stunde */
export const EUROPE_GRID_MAX_AGE_MS = 60 * 60 * 1000
const FORECAST_DAYS = 7
/** `ecmwf_ifs025` liefert auch die Höhenwerte (500 hPa), `ecmwf_ifs` nicht. */
const MODEL = 'ecmwf_ifs025'
const CACHE_KEY = 'wetterapp-europaraster-v1'

function range(from: number, to: number, step: number): number[] {
  const n = Math.round(Math.abs(to - from) / step)
  return Array.from({ length: n + 1 }, (_, i) => from + Math.sign(to - from) * i * step)
}

export const EUROPE_LATS = range(EUROPE_GRID.north, EUROPE_GRID.south, EUROPE_GRID.step)
export const EUROPE_LONS = range(EUROPE_GRID.west, EUROPE_GRID.east, EUROPE_GRID.step)

interface PointResponse {
  hourly: { time: number[]; pressure_msl: (number | null)[]; geopotential_height_500hPa: (number | null)[] }
}

// ---------- Zwischenspeicher ----------
// Eigener Speicher statt fetchJsonCached: Die Anfrage geht als POST hinaus (siehe unten),
// und wir heben nur gerundete Zahlen auf (ca. 100 KB statt mehrerer MB).

interface StoredGrid {
  fetchedAt: number
  times: number[]
  /** hPa × 10, gerundet */
  p: (number | null)[][]
  /** Meter, gerundet */
  z: (number | null)[][]
}

let memory: EuropeGrid | null = null
let running: Promise<EuropeGrid> | null = null

function isFresh(grid: EuropeGrid | null): grid is EuropeGrid {
  return !!grid && Date.now() - grid.fetchedAt < EUROPE_GRID_MAX_AGE_MS
}

function readStored(): EuropeGrid | null {
  try {
    const text = localStorage.getItem(CACHE_KEY)
    if (!text) return null
    const s = JSON.parse(text) as StoredGrid
    if (!Array.isArray(s.times) || !Array.isArray(s.p) || !Array.isArray(s.z)) return null
    return {
      lats: EUROPE_LATS,
      lons: EUROPE_LONS,
      times: s.times,
      fetchedAt: s.fetchedAt,
      pressure: s.p.map((row) => row.map((v) => (v === null ? null : v / 10))),
      z500: s.z,
    }
  } catch {
    return null
  }
}

function writeStored(grid: EuropeGrid) {
  const round = (v: number | null, factor: number) => (v === null ? null : Math.round(v * factor))
  const stored: StoredGrid = {
    fetchedAt: grid.fetchedAt,
    times: grid.times,
    p: grid.pressure.map((row) => row.map((v) => round(v, 10))),
    z: grid.z500.map((row) => row.map((v) => round(v, 1))),
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored))
  } catch {
    // Speicher voll oder gesperrt: Dann gilt der Zwischenspeicher nur bis zum Neuladen der Seite.
  }
}

// ---------- Abruf ----------

async function fetchGrid(): Promise<EuropeGrid> {
  const lats: number[] = []
  const lons: number[] = []
  for (const lat of EUROPE_LATS) {
    for (const lon of EUROPE_LONS) {
      lats.push(lat)
      lons.push(lon)
    }
  }
  // 273 Koordinaten machen die Adresse sehr lang, darum als POST (Open-Meteo unterstützt das).
  const body = new URLSearchParams({
    latitude: lats.join(','),
    longitude: lons.join(','),
    hourly: 'pressure_msl,geopotential_height_500hPa',
    models: MODEL,
    forecast_days: String(FORECAST_DAYS),
    // Ein Wert alle 6 Stunden reicht für die Großwetterlage und hält die Antwort klein.
    temporal_resolution: 'hourly_6',
    cell_selection: 'nearest',
    timeformat: 'unixtime',
    timezone: 'GMT',
  })
  const what = 'Die Daten zur Großwetterlage konnten nicht geladen werden'
  const response = await fetch(FORECAST_URL, { method: 'POST', body })
  if (!response.ok) throw await openMeteoError(response, what)

  const raw = (await response.json()) as PointResponse[]
  if (!Array.isArray(raw) || raw.length !== lats.length) throw new Error(`${what}: Die Antwort ist unvollständig.`)

  const times = raw[0].hourly.time.map((t) => t * 1000)
  // Umsortieren: [Punkt][Zeit] → [Zeit][Punkt]
  return {
    lats: EUROPE_LATS,
    lons: EUROPE_LONS,
    times,
    pressure: times.map((_, ti) => raw.map((p) => p.hourly.pressure_msl[ti] ?? null)),
    z500: times.map((_, ti) => raw.map((p) => p.hourly.geopotential_height_500hPa[ti] ?? null)),
    fetchedAt: Date.now(),
  }
}

/**
 * Liefert das Europa-Raster: aus dem Zwischenspeicher, wenn es jünger als eine Stunde ist,
 * sonst frisch von Open-Meteo. Fragen zwei Teile der App gleichzeitig, geht nur EIN Abruf hinaus.
 */
export async function loadEuropeGrid(): Promise<EuropeGrid> {
  if (isFresh(memory)) return memory
  const stored = readStored()
  if (isFresh(stored)) {
    memory = stored
    return stored
  }
  running ??= fetchGrid()
    .then((grid) => {
      memory = grid
      writeStored(grid)
      return grid
    })
    .finally(() => {
      running = null
    })
  return running
}

// ---------- Alpenpunkte (Etappe 18b) ----------

/**
 * Drei Modelle, die alle 7 Tage und die Höhenwerte liefern (am 13.11.2026 geprüft).
 * `ecmwf_ifs025` hat keine Nullgradgrenze, die kommt von den anderen beiden.
 */
export const ALPEN_MODELS = ['ecmwf_ifs025', 'dwd_icon_seamless', 'gfs_seamless']

/** Höchstens 10 Variablen, sonst zählt Open-Meteo den Abruf mehrfach. */
export const ALPEN_VARIABLES: AlpenVariable[] = [
  'pressure_msl',
  'geopotential_height_500hPa',
  'wind_speed_700hPa',
  'wind_direction_700hPa',
  'temperature_850hPa',
  'cape',
  'freezing_level_height',
  'precipitation',
]

interface AlpenResponse {
  hourly: { time: number[] } & Record<string, (number | null)[]>
}

/**
 * Höhenwind, Temperatur in 1500 m, Luftdruck und Regen an den Alpenpunkten, alle in EINEM Abruf.
 * 7 Tage voraus und 2 Tage zurück (für den Vergleich mit den Vortagen), ein Wert alle 3 Stunden.
 * Ergebnis 1 Stunde im Zwischenspeicher.
 */
export async function fetchAlpenDaten(punkte: Alpenpunkt[], signal?: AbortSignal): Promise<AlpenDaten> {
  const params = new URLSearchParams({
    latitude: punkte.map((p) => p.lat.toFixed(2)).join(','),
    longitude: punkte.map((p) => p.lon.toFixed(2)).join(','),
    hourly: ALPEN_VARIABLES.join(','),
    models: ALPEN_MODELS.join(','),
    forecast_days: String(FORECAST_DAYS),
    past_days: '2',
    temporal_resolution: 'hourly_3',
    timeformat: 'unixtime',
    timezone: 'GMT',
  })
  const raw = await fetchJsonCached<AlpenResponse | AlpenResponse[]>(
    `${FORECAST_URL}?${params.toString()}`,
    'Die Daten zur Strömung über Österreich konnten nicht geladen werden',
    signal,
    { maxAgeMs: EUROPE_GRID_MAX_AGE_MS },
  )
  const list = Array.isArray(raw) ? raw : [raw]
  if (list.length !== punkte.length) throw new Error(`Open-Meteo hat ${list.length} statt ${punkte.length} Punkte geliefert.`)

  const times = list[0].hourly.time.map((t) => t * 1000)
  const empty = times.map(() => null)
  const werte: AlpenDaten['werte'] = {}
  punkte.forEach((punkt, i) => {
    werte[punkt.id] = {}
    for (const model of ALPEN_MODELS) {
      const perVariable = {} as Record<AlpenVariable, (number | null)[]>
      for (const variable of ALPEN_VARIABLES) perVariable[variable] = list[i].hourly[`${variable}_${model}`] ?? empty
      werte[punkt.id][model] = perVariable
    }
  })
  return { times, models: ALPEN_MODELS, werte }
}

// ---------- Saharastaub (Etappe 18d) ----------

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'

interface StaubResponse {
  hourly: { time: number[]; dust?: (number | null)[]; aerosol_optical_depth?: (number | null)[] }
}

/**
 * Saharastaub und Trübung an mehreren Orten in EINEM Abruf (Copernicus-Dienst CAMS über Open-Meteo).
 * Die Vorhersage reicht nur etwa 5 Tage, danach kommen leere Werte. Ergebnis 1 Stunde im Zwischenspeicher.
 */
export async function fetchStaubDaten(punkte: Alpenpunkt[], signal?: AbortSignal): Promise<StaubDaten> {
  const params = new URLSearchParams({
    latitude: punkte.map((p) => p.lat.toFixed(2)).join(','),
    longitude: punkte.map((p) => p.lon.toFixed(2)).join(','),
    hourly: 'dust,aerosol_optical_depth',
    forecast_days: String(FORECAST_DAYS),
    timeformat: 'unixtime',
    timezone: 'GMT',
  })
  const raw = await fetchJsonCached<StaubResponse | StaubResponse[]>(
    `${AIR_QUALITY_URL}?${params.toString()}`,
    'Die Daten zum Saharastaub konnten nicht geladen werden',
    signal,
    { maxAgeMs: EUROPE_GRID_MAX_AGE_MS },
  )
  const list = Array.isArray(raw) ? raw : [raw]
  if (list.length !== punkte.length) throw new Error(`Open-Meteo hat ${list.length} statt ${punkte.length} Punkte geliefert.`)
  const times = list[0].hourly.time.map((t) => t * 1000)
  const empty = times.map(() => null)
  const dust: StaubDaten['dust'] = {}
  const aod: StaubDaten['aod'] = {}
  punkte.forEach((punkt, i) => {
    dust[punkt.id] = list[i].hourly.dust ?? empty
    aod[punkt.id] = list[i].hourly.aerosol_optical_depth ?? empty
  })
  return { times, dust, aod }
}
