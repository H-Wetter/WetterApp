import type { HourlyVariable, MultiModelForecast } from '../types/forecast'
import { hourlyStats, round1 } from './statistics'

/**
 * Eine Zeile im Diagramm = eine Stunde.
 * Modellwerte stehen unter ihrer Modell-ID, dazu die Statistik über die sichtbaren Modelle.
 */
export interface ChartRow {
  t: number
  mean: number | null
  median: number | null
  /** Streuband [Min, Max] – Recharts zeichnet daraus eine Fläche. */
  band: [number, number] | null
  count: number
  /** Optional: Mittelwert einer zweiten Größe (z. B. Böen beim Wind-Diagramm). */
  extraMean?: number | null
  [modelId: string]: number | null | [number, number] | undefined
}

/**
 * Baut die Diagrammzeilen für eine Größe.
 * @param visibleIds nur diese Modelle fließen in Mittelwert und Streuband ein
 * @param extraVariable zusätzlich deren Mittelwert (z. B. 'wind_gusts_10m')
 */
export function buildChartRows(
  forecast: MultiModelForecast,
  variable: HourlyVariable,
  visibleIds: string[],
  extraVariable?: HourlyVariable,
): ChartRow[] {
  const n = forecast.times.length
  const series = forecast.data[variable]
  const stats = hourlyStats(series, visibleIds, n)
  const extraStats = extraVariable ? hourlyStats(forecast.data[extraVariable], visibleIds, n) : null

  return forecast.times.map((t, i) => {
    const s = stats[i]
    const row: ChartRow = {
      t,
      mean: round1(s.mean),
      median: round1(s.median),
      // Ein Band braucht mindestens 2 Modelle, sonst wäre es nur ein Strich.
      band: s.count >= 2 && s.min !== null && s.max !== null ? [s.min, s.max] : null,
      count: s.count,
    }
    if (extraStats) row.extraMean = round1(extraStats[i].mean)
    for (const id of visibleIds) row[id] = series[id]?.[i] ?? null
    return row
  })
}

/** Anzahl Tage, für die ein Modell Daten liefert (gerundet auf ½ Tag). */
export function reachInDays(forecast: MultiModelForecast, modelId: string): number {
  const last = forecast.lastIndex[modelId]
  if (last === undefined) return 0
  return Math.round(((last + 1) / 24) * 2) / 2
}
