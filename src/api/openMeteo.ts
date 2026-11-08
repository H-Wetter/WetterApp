import type { HourlyVariable, MultiModelForecast, Series } from '../types/forecast'
import type { WeatherLocation } from '../types/location'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

export const COMPARISON_VARIABLES: HourlyVariable[] = [
  'temperature_2m',
  'precipitation',
  'wind_speed_10m',
  'wind_gusts_10m',
]

/** Rohantwort von Open-Meteo. Bei mehreren Modellen heißen die Felder z. B. „temperature_2m_ecmwf_ifs“. */
interface ForecastResponse {
  utc_offset_seconds: number
  hourly: { time: string[] } & Record<string, Series | string[]>
}

interface ErrorResponse {
  error: true
  reason: string
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
): Promise<MultiModelForecast> {
  const params = new URLSearchParams({
    latitude: location.latitude.toFixed(4),
    longitude: location.longitude.toFixed(4),
    hourly: COMPARISON_VARIABLES.join(','),
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

  for (const variable of COMPARISON_VARIABLES) {
    data[variable] = {}
    for (const modelId of modelIds) {
      // Bei nur einem Modell hat Open-Meteo kein Suffix.
      const key = modelIds.length === 1 ? variable : `${variable}_${modelId}`
      const values = raw.hourly[key] as Series | undefined
      if (!values) continue
      data[variable][modelId] = values

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

  return {
    times,
    utcOffsetSeconds: raw.utc_offset_seconds,
    data,
    // Reihenfolge wie angefragt beibehalten.
    availableModels: modelIds.filter((id) => available.has(id)),
    lastIndex,
  }
}
