import type { HourlyVariable, MultiModelForecast, Series } from '../types/forecast'
import type { WeatherLocation } from '../types/location'
import { PRESSURE_LEVELS, WIND_LEVELS, type CloudProfileRaw } from '../types/clouds'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

export const FORECAST_VARIABLES: HourlyVariable[] = [
  'temperature_2m',
  'precipitation',
  'wind_speed_10m',
  'wind_gusts_10m',
  'weather_code',
  'cloud_cover',
  'snowfall',
  'is_day',
  'apparent_temperature',
  'sunshine_duration',
  'precipitation_probability',
  'wind_direction_10m',
]

/** Rohantwort von Open-Meteo. Bei mehreren Modellen heißen die Felder z. B. „temperature_2m_ecmwf_ifs“. */
interface ForecastResponse {
  utc_offset_seconds: number
  hourly: { time: string[] } & Record<string, Series | string[]>
  /** Tageswerte; bei mehreren Modellen z. B. „sunrise_ecmwf_ifs“ (für alle Modelle gleich, weil astronomisch) */
  daily?: { time: string[] } & Record<string, (string | null)[]>
}

/** Sonnenauf-/-untergang aus den Tageswerten – wir nehmen das erste Modell, das Werte liefert. */
function parseSunTimes(daily: ForecastResponse['daily']): MultiModelForecast['sun'] {
  if (!daily) return []
  const keys = Object.keys(daily)
  const sunriseKey = keys.find((k) => k.startsWith('sunrise') && daily[k].some((v) => v !== null))
  const sunsetKey = keys.find((k) => k.startsWith('sunset') && daily[k].some((v) => v !== null))
  return daily.time.map((day, i) => {
    const rise = sunriseKey ? daily[sunriseKey][i] : null
    const set = sunsetKey ? daily[sunsetKey][i] : null
    return {
      dayStart: Date.parse(`${day}T00:00:00Z`),
      sunrise: rise ? parseLocalTime(rise) : null,
      sunset: set ? parseLocalTime(set) : null,
    }
  })
}

interface ErrorResponse {
  error: true
  reason: string
}

/** Variablen für den Wolkenschnitt (Etappe 4). */
export function cloudProfileVariables(): string[] {
  return [
    ...PRESSURE_LEVELS.map((l) => `cloud_cover_${l}hPa`),
    ...PRESSURE_LEVELS.map((l) => `geopotential_height_${l}hPa`),
    ...WIND_LEVELS.flatMap((l) => [`wind_speed_${l}hPa`, `wind_direction_${l}hPa`]),
    'temperature_2m',
    'dew_point_2m',
    'cloud_cover_low',
  ]
}

/**
 * Holt die Bewölkung auf den Druckniveaus samt deren Höhe, dazu Wind in der Höhe
 * und Temperatur/Taupunkt am Boden (für die Wolkenbasis). Eigene Anfrage, damit die
 * übrige Vorhersage nicht auf diese größere Datenmenge warten muss.
 */
export async function fetchCloudProfile(
  location: WeatherLocation,
  modelIds: string[],
  days: number,
  signal?: AbortSignal,
): Promise<CloudProfileRaw> {
  const variables = cloudProfileVariables()
  const params = new URLSearchParams({
    latitude: location.latitude.toFixed(4),
    longitude: location.longitude.toFixed(4),
    hourly: variables.join(','),
    models: modelIds.join(','),
    forecast_days: String(days),
    timezone: 'auto',
  })
  if (location.elevation !== undefined && location.source !== 'gps') {
    params.set('elevation', String(Math.round(location.elevation)))
  }

  const response = await fetch(`${FORECAST_URL}?${params.toString()}`, { signal })
  if (!response.ok) throw new Error(`Höhendaten konnten nicht geladen werden (HTTP ${response.status}).`)

  const raw = (await response.json()) as ForecastResponse & { elevation: number }
  const data: CloudProfileRaw['data'] = {}
  const available = new Set<string>()

  for (const variable of variables) {
    data[variable] = {}
    for (const modelId of modelIds) {
      const key = modelIds.length === 1 ? variable : `${variable}_${modelId}`
      const values = raw.hourly[key] as Series | undefined
      if (!values) continue
      data[variable][modelId] = values
      if (variable.startsWith('cloud_cover_') && variable.endsWith('hPa') && values.some((v) => v !== null)) {
        available.add(modelId)
      }
    }
  }

  return {
    times: raw.hourly.time.map(parseLocalTime),
    utcOffsetSeconds: raw.utc_offset_seconds,
    elevation: raw.elevation,
    data,
    availableModels: modelIds.filter((id) => available.has(id)),
  }
}

/** „2026-11-08T14:00“ (Ortszeit) → Zahl in ms, als UTC gelesen (siehe MultiModelForecast.times). */
function parseLocalTime(value: string): number {
  return Date.parse(`${value}:00Z`)
}

/**
 * Holt die stündliche Vorhersage mehrerer Modelle in EINER Anfrage.
 * Modelle, die den Ort nicht abdecken, fehlen in der Antwort einfach – sie landen nicht in `availableModels`.
 */
export async function fetchMultiModelForecast(
  location: WeatherLocation,
  modelIds: string[],
  days: number,
  signal?: AbortSignal,
  /** zusätzliche stündliche Variablen, landen in `extra` (z. B. 'temperature_850hPa') */
  extraVariables: string[] = [],
): Promise<MultiModelForecast> {
  const params = new URLSearchParams({
    latitude: location.latitude.toFixed(4),
    longitude: location.longitude.toFixed(4),
    hourly: [...FORECAST_VARIABLES, ...extraVariables].join(','),
    daily: 'sunrise,sunset',
    models: modelIds.join(','),
    forecast_days: String(days),
    timezone: 'auto',
  })
  // Höhe nur mitgeben, wenn sie verlässlich ist (Ortssuche/Standard). GPS-Höhen sind oft ungenau –
  // dann nimmt Open-Meteo selbst die Geländehöhe.
  if (location.elevation !== undefined && location.source !== 'gps') {
    params.set('elevation', String(Math.round(location.elevation)))
  }

  const response = await fetch(`${FORECAST_URL}?${params.toString()}`, { signal })
  if (!response.ok) {
    let reason = `HTTP ${response.status}`
    try {
      const err = (await response.json()) as ErrorResponse
      if (err.reason) reason = err.reason
    } catch {
      // Antwort war kein JSON – dann bleibt es beim HTTP-Status.
    }
    throw new Error(`Wetterdaten konnten nicht geladen werden (${reason}).`)
  }

  const raw = (await response.json()) as ForecastResponse
  const times = raw.hourly.time.map(parseLocalTime)

  const data = {} as MultiModelForecast['data']
  const lastIndex: Record<string, number> = {}
  const available = new Set<string>()

  for (const variable of FORECAST_VARIABLES) {
    data[variable] = {}
    for (const modelId of modelIds) {
      // Bei nur einem Modell hat Open-Meteo kein Suffix.
      const key = modelIds.length === 1 ? variable : `${variable}_${modelId}`
      const values = raw.hourly[key] as Series | undefined
      if (!values) continue
      data[variable][modelId] = values

      // Reichweite/Verfügbarkeit nur an der Temperatur messen (is_day ist z. B. immer gefüllt).
      if (variable !== 'temperature_2m') continue
      let last = -1
      values.forEach((v, i) => {
        if (v !== null) last = i
      })
      if (last >= 0) {
        available.add(modelId)
        lastIndex[modelId] = Math.max(lastIndex[modelId] ?? -1, last)
      }
    }
  }

  const extra: MultiModelForecast['extra'] = {}
  for (const variable of extraVariables) {
    extra[variable] = {}
    for (const modelId of modelIds) {
      const key = modelIds.length === 1 ? variable : `${variable}_${modelId}`
      const values = raw.hourly[key] as Series | undefined
      if (values) extra[variable][modelId] = values
    }
  }

  return {
    times,
    utcOffsetSeconds: raw.utc_offset_seconds,
    data,
    // Reihenfolge wie angefragt beibehalten.
    availableModels: modelIds.filter((id) => available.has(id)),
    lastIndex,
    sun: parseSunTimes(raw.daily),
    extra,
  }
}
