import type { HourStats, HourlyVariable, MultiModelForecast } from '../types/forecast'
import { moonInfo, type MoonInfo } from './moon'
import { statsForValues } from './statistics'
import { isFogCode, isThunderCode, weatherSymbol, type WeatherSymbol } from './weatherSymbol'
import { meanWindDirection, type WindDirection } from './wind'

/** Paare (Richtung, Stärke) für die Richtungsmittelung – über Modelle und Stunden. */
function windPairs(forecast: MultiModelForecast, modelIds: string[], from: number, to: number) {
  const pairs: { direction: number | null; speed: number | null }[] = []
  for (const id of modelIds) {
    const dirs = forecast.data.wind_direction_10m[id]
    const speeds = forecast.data.wind_speed_10m[id]
    if (!dirs || !speeds) continue
    for (let i = from; i < to; i++) pairs.push({ direction: dirs[i] ?? null, speed: speeds[i] ?? null })
  }
  return pairs
}

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
  /** gefühlte Temperatur (Wind, Luftfeuchte, Sonne eingerechnet) */
  feelsMax: HourStats
  feelsMin: HourStats
  precipSum: HourStats
  /** Anteil der Modelle mit mindestens 1 mm Niederschlag an diesem Tag (0–1) */
  precipShare: number
  /**
   * Niederschlagswahrscheinlichkeit in % (höchster Stundenwert des Tages, gemittelt über die Modelle,
   * die eine Wahrscheinlichkeit liefern – das sind Ensemble-Berechnungen). `null` = kein Modell liefert sie.
   */
  precipProbability: number | null
  snowSum: number | null
  windMax: HourStats
  gustMax: HourStats
  /** vorherrschende Windrichtung des Tages (alle Modelle und Stunden, nach Windstärke gewichtet) */
  windDirection: WindDirection
  /** Sonnenstunden des Tages */
  sunshineHours: HourStats
  sunrise: number | null
  sunset: number | null
  moon: MoonInfo
  modelCount: number
  symbol: WeatherSymbol
  /** Wetter in der folgenden Nacht (18 bis 6 Uhr), `null` am Ende der Vorhersage */
  nightSymbol: WeatherSymbol | null
}

/** Ein Stundenbereich in der Vorhersage, z. B. ein Tag oder die nächsten 24 Stunden (Ende exklusiv). */
export interface HourRange {
  startIndex: number
  endIndex: number
}

export interface HourSummary {
  t: number
  index: number
  temp: HourStats
  feels: HourStats
  precip: HourStats
  /** Anteil der Modelle mit mindestens 0,1 mm in dieser Stunde (0–1) */
  precipShare: number
  /** Niederschlagswahrscheinlichkeit in % (Mittel der Modelle, die sie liefern) */
  precipProbability: number | null
  snow: number | null
  wind: HourStats
  gust: HourStats
  /** mittlere Windrichtung über die Modelle */
  windDirection: WindDirection
  cloud: number | null
  /** Sonnenschein in dieser Stunde, in Minuten */
  sunshineMinutes: number | null
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

/** Nur wenn genug Stunden vorhanden sind, ist eine Tagessumme/ein Tagesextrem sinnvoll. */
function full(values: Values): number[] | null {
  const n = nums(values)
  return n.length >= MIN_HOURS_PER_DAY ? n : null
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
    const dayStart = forecast.times[start]

    const perModel = forecast.availableModels
      .map((id) => {
        const temps = full(range(forecast, 'temperature_2m', id, start, end))
        if (!temps) return null

        const codes = nums(range(forecast, 'weather_code', id, start, end))
        // Bewölkung nur tagsüber zählt fürs Tagessymbol (nachts sieht man die Wolken ja nicht).
        const cloudAll = range(forecast, 'cloud_cover', id, start, end)
        const cloudDay = nums(cloudAll.filter((_, i) => isDayAt(forecast, start + i)))
        const precip = sum(nums(range(forecast, 'precipitation', id, start, end)))
        const feels = full(range(forecast, 'apparent_temperature', id, start, end))
        const sunshine = full(range(forecast, 'sunshine_duration', id, start, end))
        const probability = nums(range(forecast, 'precipitation_probability', id, start, end))

        return {
          tMax: Math.max(...temps),
          tMin: Math.min(...temps),
          feelsMax: feels ? Math.max(...feels) : null,
          feelsMin: feels ? Math.min(...feels) : null,
          precip,
          snow: sum(nums(range(forecast, 'snowfall', id, start, end))),
          windMax: Math.max(0, ...nums(range(forecast, 'wind_speed_10m', id, start, end))),
          gustMax: Math.max(0, ...nums(range(forecast, 'wind_gusts_10m', id, start, end))),
          // Sonnenscheindauer kommt in Sekunden pro Stunde → Tagessumme in Stunden
          sunshineHours: sunshine ? sum(sunshine) / 3600 : null,
          probabilityMax: probability.length >= MIN_HOURS_PER_DAY ? Math.max(...probability) : null,
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
    const sun = forecast.sun.find((s) => s.dayStart === dayStart)

    days.push({
      dayStart,
      startIndex: start,
      endIndex: end,
      tempMax: statsForValues(perModel.map((m) => m.tMax)),
      tempMin: statsForValues(perModel.map((m) => m.tMin)),
      feelsMax: statsForValues(perModel.map((m) => m.feelsMax)),
      feelsMin: statsForValues(perModel.map((m) => m.feelsMin)),
      precipSum,
      precipShare,
      precipProbability: mean(nums(perModel.map((m) => m.probabilityMax))),
      snowSum,
      windMax: statsForValues(perModel.map((m) => m.windMax)),
      gustMax: statsForValues(perModel.map((m) => m.gustMax)),
      windDirection: meanWindDirection(windPairs(forecast, forecast.availableModels, start, end)),
      sunshineHours: statsForValues(perModel.map((m) => m.sunshineHours)),
      sunrise: sun?.sunrise ?? null,
      sunset: sun?.sunset ?? null,
      // Mondphase für Mitternacht des Folgetages – also die Nacht, die zu diesem Tag gehört
      moon: moonInfo(dayStart + 24 * 60 * 60 * 1000),
      modelCount: n,
      symbol: weatherSymbol(
        { precipitation: precipSum.mean, snowfall: snowSum, cloudCover: cloud, precipShare, thunderShare, fogShare, isDay: true },
        'day',
      ),
      nightSymbol: nightSymbol(forecast, start + 18, start + 30, moonInfo(dayStart + 24 * 60 * 60 * 1000).phase),
    })
  }

  // Tage ganz ohne Modelle (sollte nicht vorkommen) weglassen.
  return days.filter((d) => d.modelCount > 0)
}

/**
 * Wetter einer Nacht (Stunden `from` bis `to`, z. B. 18 bis 6 Uhr) als ein Symbol mit Mond.
 * Gleiche Regeln wie beim Tagessymbol, nur über die Nachtstunden gemittelt.
 */
function nightSymbol(forecast: MultiModelForecast, from: number, to: number, moonPhase: number): WeatherSymbol | null {
  if (to > forecast.times.length) return null
  const perModel = forecast.availableModels
    .map((id) => {
      const temps = nums(range(forecast, 'temperature_2m', id, from, to))
      if (temps.length < (to - from) / 2) return null
      const codes = nums(range(forecast, 'weather_code', id, from, to))
      return {
        precip: sum(nums(range(forecast, 'precipitation', id, from, to))),
        snow: sum(nums(range(forecast, 'snowfall', id, from, to))),
        cloud: mean(nums(range(forecast, 'cloud_cover', id, from, to))),
        thunder: codes.some(isThunderCode),
        fog: codes.filter(isFogCode).length >= 3,
      }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
  const n = perModel.length
  if (n === 0) return null
  return weatherSymbol(
    {
      precipitation: mean(perModel.map((m) => m.precip)),
      snowfall: mean(perModel.map((m) => m.snow)),
      cloudCover: mean(nums(perModel.map((m) => m.cloud))),
      precipShare: perModel.filter((m) => m.precip >= 1).length / n,
      thunderShare: perModel.filter((m) => m.thunder).length / n,
      fogShare: perModel.filter((m) => m.fog).length / n,
      isDay: false,
      moonPhase,
    },
    'day',
  )
}

/** Die nächsten `count` Stunden ab der Stunde, in der `now` liegt (Zeiten wie forecast.times). */
export function upcomingHours(forecast: MultiModelForecast, now: number, count = 24): HourRange {
  const hourStart = Math.floor(now / 3_600_000) * 3_600_000
  const found = forecast.times.findIndex((t) => t >= hourStart)
  const startIndex = found < 0 ? forecast.times.length : found
  return { startIndex, endIndex: Math.min(forecast.times.length, startIndex + count) }
}

/** Fasst einen Stundenbereich (z. B. einen Tag) stundenweise zusammen (Statistik über alle Modelle je Stunde). */
export function summarizeHours(forecast: MultiModelForecast, day: HourRange): HourSummary[] {
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
    const sunshine = mean(nums(at('sunshine_duration', i)))
    const thunderShare = codes.length ? codes.filter(isThunderCode).length / codes.length : 0
    const fogShare = codes.length ? codes.filter(isFogCode).length / codes.length : 0
    const precipShare = precipValues.length ? precipValues.filter((v) => v >= 0.1).length / precipValues.length : 0
    const t = forecast.times[i]

    hours.push({
      t,
      index: i,
      temp,
      feels: statsForValues(at('apparent_temperature', i)),
      precip,
      precipShare,
      precipProbability: mean(nums(at('precipitation_probability', i))),
      snow,
      wind: statsForValues(at('wind_speed_10m', i)),
      gust: statsForValues(at('wind_gusts_10m', i)),
      windDirection: meanWindDirection(windPairs(forecast, ids, i, i + 1)),
      cloud,
      sunshineMinutes: sunshine === null ? null : sunshine / 60,
      modelCount: temp.count,
      symbol: weatherSymbol(
        {
          precipitation: precip.mean,
          snowfall: snow,
          cloudCover: cloud,
          precipShare,
          thunderShare,
          fogShare,
          isDay: isDayAt(forecast, i),
          moonPhase: moonInfo(t).phase,
        },
        'hour',
      ),
    })
  }
  return hours
}
