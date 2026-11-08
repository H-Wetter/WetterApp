import type { HourStats, HourlyVariable, MultiModelForecast } from '../types/forecast'
import { statsForValues } from './statistics'
import { isFogCode, isThunderCode, weatherSymbol, type WeatherSymbol } from './weatherSymbol'

/** Ab wie vielen Modellen gilt ein Tag als „gut abgesichert“? Darunter zeigen wir einen Hinweis. */
export const FEW_MODELS = 5

/** Mindestanzahl Stunden, die ein Modell für einen Tag liefern muss, um mitzuzählen. */
const MIN_HOURS_PER_DAY = 20

export interface DaySummary {
  /** Mitternacht dieses Tages (Ortszeit, siehe MultiModelForecast.times) */
  dayStart: number
  startIndex: number
  /** exklusiv */
  endIndex: number
  /** Statistik über die Modelle: z. B. tempMax.mean = Mittel der Tageshöchstwerte */
  tempMax: HourStats
  tempMin: HourStats
  precipSum: HourStats
  /** Anteil der Modelle mit mindestens 1 mm Niederschlag an diesem Tag (0–1) */
  precipShare: number
  snowSum: number | null
  windMax: HourStats
  gustMax: HourStats
  modelCount: number
  symbol: WeatherSymbol
}

export interface HourSummary {
  t: number
  index: number
  temp: HourStats
  precip: HourStats
  /** Anteil der Modelle mit mindestens 0,1 mm in dieser Stunde (0–1) */
  precipShare: number
  snow: number | null
  wind: HourStats
  gust: HourStats
  cloud: number | null
  modelCount: number
  symbol: WeatherSymbol
}

type Values = (number | null)[]

/** Werte eines Modells für einen Stundenbereich. */
function range(forecast: MultiModelForecast, variable: HourlyVariable, modelId: string, from: number, to: number): Values {
  return (forecast.data[variable][modelId] ?? []).slice(from, to)
}

function nums(values: Values): number[] {
  return values.filter((v): v is number => v !== null)
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

function mean(values: number[]): number | null {
  return values.length === 0 ? null : sum(values) / values.length
}

/** Tag/Nacht für eine Stunde – is_day ist bei allen Modellen gleich, wir nehmen das erste vorhandene. */
function isDayAt(forecast: MultiModelForecast, index: number): boolean {
  for (const id of forecast.availableModels) {
    const v = forecast.data.is_day[id]?.[index]
    if (v !== null && v !== undefined) return v === 1
  }
  const hour = new Date(forecast.times[index]).getUTCHours()
  return hour >= 7 && hour < 17
}

/** Fasst die Vorhersage zu Tagen zusammen (alle verfügbaren Modelle). */
export function summarizeDays(forecast: MultiModelForecast): DaySummary[] {
  const days: DaySummary[] = []

  for (let start = 0; start + 24 <= forecast.times.length; start += 24) {
    const end = start + 24

    const perModel = forecast.availableModels
      .map((id) => {
        const temps = nums(range(forecast, 'temperature_2m', id, start, end))
        if (temps.length < MIN_HOURS_PER_DAY) return null

        const codes = nums(range(forecast, 'weather_code', id, start, end))
        // Bewölkung nur tagsüber zählt fürs Tagessymbol (nachts sieht man die Wolken ja nicht).
        const cloudAll = range(forecast, 'cloud_cover', id, start, end)
        const cloudDay = nums(cloudAll.filter((_, i) => isDayAt(forecast, start + i)))
        const precip = sum(nums(range(forecast, 'precipitation', id, start, end)))

        return {
          tMax: Math.max(...temps),
          tMin: Math.min(...temps),
          precip,
          snow: sum(nums(range(forecast, 'snowfall', id, start, end))),
          windMax: Math.max(0, ...nums(range(forecast, 'wind_speed_10m', id, start, end))),
          gustMax: Math.max(0, ...nums(range(forecast, 'wind_gusts_10m', id, start, end))),
          cloud: mean(cloudDay.length > 0 ? cloudDay : nums(cloudAll)),
          thunder: codes.some(isThunderCode),
          fog: codes.filter(isFogCode).length >= 6,
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)

    const n = perModel.length
    const precipSum = statsForValues(perModel.map((m) => m.precip))
    const snowSum = mean(perModel.map((m) => m.snow))
    const cloud = mean(nums(perModel.map((m) => m.cloud)))
    const thunderShare = n ? perModel.filter((m) => m.thunder).length / n : 0
    const fogShare = n ? perModel.filter((m) => m.fog).length / n : 0
    const precipShare = n ? perModel.filter((m) => m.precip >= 1).length / n : 0

    days.push({
      dayStart: forecast.times[start],
      startIndex: start,
      endIndex: end,
      tempMax: statsForValues(perModel.map((m) => m.tMax)),
      tempMin: statsForValues(perModel.map((m) => m.tMin)),
      precipSum,
      precipShare,
      snowSum,
      windMax: statsForValues(perModel.map((m) => m.windMax)),
      gustMax: statsForValues(perModel.map((m) => m.gustMax)),
      modelCount: n,
      symbol: weatherSymbol(
        { precipitation: precipSum.mean, snowfall: snowSum, cloudCover: cloud, precipShare, thunderShare, fogShare, isDay: true },
        'day',
      ),
    })
  }

  // Tage ganz ohne Modelle (sollte nicht vorkommen) weglassen.
  return days.filter((d) => d.modelCount > 0)
}

/** Fasst einen Tag stundenweise zusammen (Statistik über alle Modelle je Stunde). */
export function summarizeHours(forecast: MultiModelForecast, day: DaySummary): HourSummary[] {
  const hours: HourSummary[] = []
  const ids = forecast.availableModels
  const at = (variable: HourlyVariable, i: number) => ids.map((id) => forecast.data[variable][id]?.[i] ?? null)

  for (let i = day.startIndex; i < day.endIndex; i++) {
    const temp = statsForValues(at('temperature_2m', i))
    if (temp.count === 0) continue

    const precipValues = nums(at('precipitation', i))
    const codes = nums(at('weather_code', i))
    const precip = statsForValues(precipValues)
    const snow = mean(nums(at('snowfall', i)))
    const cloud = mean(nums(at('cloud_cover', i)))
    const thunderShare = codes.length ? codes.filter(isThunderCode).length / codes.length : 0
    const fogShare = codes.length ? codes.filter(isFogCode).length / codes.length : 0
    const precipShare = precipValues.length ? precipValues.filter((v) => v >= 0.1).length / precipValues.length : 0

    hours.push({
      t: forecast.times[i],
      index: i,
      temp,
      precip,
      precipShare,
      snow,
      wind: statsForValues(at('wind_speed_10m', i)),
      gust: statsForValues(at('wind_gusts_10m', i)),
      cloud,
      modelCount: temp.count,
      symbol: weatherSymbol(
        { precipitation: precip.mean, snowfall: snow, cloudCover: cloud, precipShare, thunderShare, fogShare, isDay: isDayAt(forecast, i) },
        'hour',
      ),
    })
  }
  return hours
}
