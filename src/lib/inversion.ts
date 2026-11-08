import type { MultiModelForecast } from '../types/forecast'
import type { DaySummary } from './daily'
import { statsForValues } from './statistics'

/**
 * Inversion = am Berg ist es wärmer als im Tal (CLAUDE.md: „Temperatur am Bergpunkt höher als im Tal“).
 * Normal nimmt die Temperatur nach oben ab; bei einer Inversion liegt kalte Luft im Tal,
 * darüber wärmere. Typisch im Herbst/Winter bei Hochdruck – oft mit Hochnebel im Tal.
 */

/** Unter diesem Höhenunterschied (m) ist ein Berg-Tal-Vergleich nicht sinnvoll. */
export const MIN_HEIGHT_DIFFERENCE = 300

/** Ab dieser Entfernung (km) zwischen Tal und Berg ist der Vergleich nur noch grob. */
export const MAX_DISTANCE_KM = 40

/** Entfernung zweier Punkte auf der Erde in km (Haversine-Formel). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export interface HourComparison {
  t: number
  /** mittlere Temperatur im Tal / am Berg (°C) */
  valley: number | null
  mountain: number | null
  /** Berg minus Tal: positiv = Inversion */
  diff: number | null
  inversion: boolean
}

/** Tagesabschnitte für Texte */
export const DAY_PARTS = [
  { key: 'night', label: 'in der Nacht', from: 0, to: 6 },
  { key: 'morning', label: 'am Vormittag', from: 6, to: 12 },
  { key: 'afternoon', label: 'am Nachmittag', from: 12, to: 18 },
  { key: 'evening', label: 'am Abend', from: 18, to: 24 },
] as const

export interface DayInversion {
  dayStart: number
  /** Anzahl Stunden mit Inversion */
  hours: number
  /** in welchen Tagesabschnitten (mind. 3 Stunden) */
  parts: string[]
  /** größter Unterschied Berg − Tal (°C) */
  maxDiff: number | null
  /** Hochnebel-Verdacht: Inversion am Vormittag + im Tal deutlich weniger Sonne als am Berg */
  fog: boolean
}

function meanAt(fc: MultiModelForecast, i: number): number | null {
  return statsForValues(fc.availableModels.map((id) => fc.data.temperature_2m[id]?.[i] ?? null)).mean
}

/** Stündlicher Vergleich Tal ↔ Berg (gleiche Zeitachse vorausgesetzt). */
export function compareHours(valley: MultiModelForecast, mountain: MultiModelForecast): HourComparison[] {
  const n = Math.min(valley.times.length, mountain.times.length)
  const out: HourComparison[] = []
  for (let i = 0; i < n; i++) {
    const v = meanAt(valley, i)
    const m = meanAt(mountain, i)
    const diff = v !== null && m !== null ? m - v : null
    out.push({ t: valley.times[i], valley: v, mountain: m, diff, inversion: diff !== null && diff > 0 })
  }
  return out
}

/** Inversion für einen Tag zusammenfassen. */
export function summarizeInversion(
  hours: HourComparison[],
  valleyDay: DaySummary,
  mountainDay: DaySummary | undefined,
): DayInversion {
  const dayHours = hours.slice(valleyDay.startIndex, valleyDay.endIndex)
  const inv = dayHours.filter((h) => h.inversion)
  const parts = DAY_PARTS.filter(
    (p) => dayHours.filter((h, k) => h.inversion && k >= p.from && k < p.to).length >= 3,
  ).map((p) => p.label)

  const diffs = dayHours.map((h) => h.diff).filter((d): d is number => d !== null)
  const morningInversion = dayHours.filter((h, k) => h.inversion && k >= 6 && k < 12).length >= 3
  const sunValley = valleyDay.sunshineHours.mean
  const sunMountain = mountainDay?.sunshineHours.mean ?? null
  const fogBySun =
    sunValley !== null && sunMountain !== null && sunMountain >= 2 && sunValley <= sunMountain * 0.6
  const fogBySymbol = valleyDay.symbol.condition === 'fog'

  return {
    dayStart: valleyDay.dayStart,
    hours: inv.length,
    parts,
    maxDiff: diffs.length ? Math.max(...diffs) : null,
    fog: morningInversion && (fogBySun || fogBySymbol),
  }
}
