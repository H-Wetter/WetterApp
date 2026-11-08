/** Stündliche Variablen der Open-Meteo Air-Quality-API, die wir verwenden. */
export const AQ_VARIABLES = [
  'european_aqi',
  'pm10',
  'pm2_5',
  'ozone',
  'nitrogen_dioxide',
  'dust',
  'uv_index',
  'alder_pollen',
  'birch_pollen',
  'grass_pollen',
  'mugwort_pollen',
  'olive_pollen',
  'ragweed_pollen',
] as const

export type AqVariable = (typeof AQ_VARIABLES)[number]

export type PollenType = 'alder' | 'birch' | 'grass' | 'mugwort' | 'olive' | 'ragweed'

export interface AirQualityData {
  /** Ortszeit als Zahl (ms), wie bei MultiModelForecast.times */
  times: number[]
  data: Record<AqVariable, (number | null)[]>
}
