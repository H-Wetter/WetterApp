import { AQ_VARIABLES, type AirQualityData, type AqVariable } from '../types/airQuality'
import type { WeatherLocation } from '../types/location'
import { fetchJsonCached } from './cache'

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'

interface AirQualityResponse {
  hourly: { time: string[] } & Record<string, (number | null)[] | string[]>
}

/**
 * Luftqualität, UV, Saharastaub und Pollen (Open-Meteo, Daten vom Copernicus-Dienst CAMS).
 * Reichweite: ca. 5 Tage, Pollen ca. 4 Tage und nur in Europa während der Saison.
 */
export async function fetchAirQuality(location: WeatherLocation, days: number, signal?: AbortSignal): Promise<AirQualityData> {
  const params = new URLSearchParams({
    latitude: location.latitude.toFixed(4),
    longitude: location.longitude.toFixed(4),
    hourly: AQ_VARIABLES.join(','),
    forecast_days: String(days),
    timezone: 'auto',
  })
  const raw = await fetchJsonCached<AirQualityResponse>(
    `${AIR_QUALITY_URL}?${params.toString()}`,
    'Luftqualitätsdaten konnten nicht geladen werden',
    signal,
  )
  const data = {} as AirQualityData['data']
  for (const v of AQ_VARIABLES) {
    data[v as AqVariable] = (raw.hourly[v] as (number | null)[] | undefined) ?? raw.hourly.time.map(() => null)
  }
  return {
    // Ortszeit „als UTC gelesen“ – wie in openMeteo.ts
    times: raw.hourly.time.map((t) => Date.parse(`${t}:00Z`)),
    data,
  }
}
