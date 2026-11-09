import type { Measurement, Station } from '../types/station'
import { fetchJsonCached } from './cache'

/**
 * Echte Messwerte von GeoSphere Austria (früher ZAMG), Messnetz „TAWES“, alle 10 Minuten.
 * Kostenlos, ohne Schlüssel, Lizenz CC BY 4.0 → Quellenangabe „GeoSphere Austria“ nötig.
 * Limit: 5 Abrufe pro Sekunde, 240 pro Stunde – darum wird alles zwischengespeichert.
 * Doku: https://dataset.api.hub.geosphere.at/v1/docs/
 */
const BASE_URL = 'https://dataset.api.hub.geosphere.at/v1/station/current/tawes-v1-10min'

/** Die Stationsliste ändert sich fast nie → 7 Tage merken. */
const STATIONS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
/** Neue Messwerte gibt es alle 10 Minuten → so lange merken. */
const MEASUREMENTS_MAX_AGE_MS = 10 * 60 * 1000

/** Diese Messgrößen fragen wir ab (Namen laut GeoSphere-Metadaten). */
const PARAMETERS = ['TL', 'RF', 'TP', 'FF', 'FFX', 'DD', 'RR', 'SO', 'SCHNEE'] as const
type Parameter = (typeof PARAMETERS)[number]

/** GeoSphere misst Wind in m/s, die App zeigt km/h. */
const MS_TO_KMH = 3.6

interface MetadataResponse {
  stations: {
    id: string
    name: string
    state: string
    lat: number
    lon: number
    altitude: number
    is_active: boolean
  }[]
}

interface DataResponse {
  timestamps: string[]
  features: {
    properties: {
      station: string
      parameters: Partial<Record<Parameter, { data: (number | null)[] }>>
    }
  }[]
}

/** Verständliche Fehlermeldung für GeoSphere (die Antworten enthalten keinen deutschen Grund). */
async function geosphereError(response: Response, what: string): Promise<Error> {
  if (response.status === 429) {
    return new Error(`${what}: Zu viele Abrufe bei GeoSphere Austria (höchstens 240 pro Stunde). Bitte etwas später erneut versuchen.`)
  }
  return new Error(`${what} (GeoSphere Austria, HTTP ${response.status}).`)
}

/** Alle aktiven Messstationen mit Koordinaten und Höhe. */
export async function fetchStations(signal?: AbortSignal): Promise<Station[]> {
  const raw = await fetchJsonCached<MetadataResponse>(`${BASE_URL}/metadata`, 'Die Liste der Messstationen konnte nicht geladen werden', signal, {
    maxAgeMs: STATIONS_MAX_AGE_MS,
    toError: geosphereError,
  })
  return raw.stations
    .filter((s) => s.is_active && Number.isFinite(s.lat) && Number.isFinite(s.lon))
    .map((s) => ({ id: s.id, name: s.name, state: s.state, lat: s.lat, lon: s.lon, altitude: s.altitude }))
}

/**
 * Die neuesten Messwerte mehrerer Stationen in EINEM Abruf.
 * Stationen, die gerade nichts senden, fehlen in der Antwort einfach.
 */
export async function fetchMeasurements(stationIds: string[], signal?: AbortSignal): Promise<Measurement[]> {
  if (stationIds.length === 0) return []
  const params = new URLSearchParams({
    parameters: PARAMETERS.join(','),
    // sortiert, damit dieselbe Auswahl immer dieselbe Adresse (und damit denselben Cache-Eintrag) ergibt
    station_ids: [...stationIds].sort().join(','),
  })
  const raw = await fetchJsonCached<DataResponse>(`${BASE_URL}?${params.toString()}`, 'Die Messwerte konnten nicht geladen werden', signal, {
    maxAgeMs: MEASUREMENTS_MAX_AGE_MS,
    toError: geosphereError,
  })

  const time = Date.parse(raw.timestamps[raw.timestamps.length - 1] ?? '')
  return raw.features.map((f) => {
    const p = f.properties.parameters
    // jeweils der letzte Wert der Zeitreihe (bei „current“ gibt es nur einen)
    const value = (name: Parameter): number | null => {
      const data = p[name]?.data
      const v = data?.[data.length - 1]
      return typeof v === 'number' && Number.isFinite(v) ? v : null
    }
    const kmh = (name: Parameter): number | null => {
      const v = value(name)
      return v === null ? null : v * MS_TO_KMH
    }
    return {
      stationId: f.properties.station,
      time,
      temp: value('TL'),
      humidity: value('RF'),
      dewPoint: value('TP'),
      wind: kmh('FF'),
      gust: kmh('FFX'),
      windDirection: value('DD'),
      precipitation: value('RR'),
      sunshine: value('SO'),
      snowDepth: value('SCHNEE'),
    }
  })
}

// ---------- Vergangene Messungen (für den Modell-Check) ----------

const HISTORY_URL = 'https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min'
/** Vergangene Messungen ändern sich nicht mehr → 1 Stunde merken */
const HISTORY_MAX_AGE_MS = 60 * 60 * 1000

/** „2026-11-09T07:00“ – Format, das GeoSphere für start/end erwartet (UTC) */
function isoMinute(ms: number): string {
  return new Date(ms).toISOString().slice(0, 16)
}

/**
 * Stündliche Temperaturen einer Station für die letzten `hours` Stunden.
 * GeoSphere misst alle 10 Minuten; wir nehmen jeweils den Wert zur vollen Stunde.
 * @returns Map: volle Stunde (echte UTC-Zeit, ms) → Temperatur (°C)
 */
export async function fetchStationTemperatureHistory(stationId: string, hours: number, signal?: AbortSignal): Promise<Map<number, number>> {
  // Ende auf die volle Stunde abrunden → dieselbe Adresse für eine ganze Stunde (Cache greift)
  const end = Math.floor(Date.now() / 3_600_000) * 3_600_000
  const params = new URLSearchParams({
    parameters: 'TL',
    station_ids: stationId,
    start: isoMinute(end - hours * 3_600_000),
    end: isoMinute(end),
  })
  const raw = await fetchJsonCached<DataResponse>(`${HISTORY_URL}?${params.toString()}`, 'Die vergangenen Messwerte konnten nicht geladen werden', signal, {
    maxAgeMs: HISTORY_MAX_AGE_MS,
    toError: geosphereError,
  })
  const values = raw.features[0]?.properties.parameters.TL?.data ?? []
  const result = new Map<number, number>()
  raw.timestamps.forEach((t, i) => {
    const ms = Date.parse(t)
    const v = values[i]
    if (ms % 3_600_000 === 0 && typeof v === 'number' && Number.isFinite(v)) result.set(ms, v)
  })
  return result
}
