import type { HourStats, Series } from '../types/forecast'

/** Median einer bereits sortierten Liste. */
function medianOfSorted(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Statistik für eine Stunde aus den Werten aller Modelle; `null` wird ignoriert. */
export function statsForValues(values: (number | null | undefined)[]): HourStats {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (nums.length === 0) return { mean: null, median: null, min: null, max: null, count: 0 }

  const sorted = [...nums].sort((a, b) => a - b)
  const sum = nums.reduce((acc, v) => acc + v, 0)
  return {
    mean: sum / nums.length,
    median: medianOfSorted(sorted),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: nums.length,
  }
}

/**
 * Statistik pro Stunde über mehrere Modelle.
 * @param seriesByModel Zeitreihen je Modell-ID
 * @param modelIds      welche Modelle einfließen sollen (z. B. nur die sichtbaren)
 * @param length        Anzahl Stunden
 */
export function hourlyStats(
  seriesByModel: Record<string, Series>,
  modelIds: string[],
  length: number,
): HourStats[] {
  const result: HourStats[] = []
  for (let i = 0; i < length; i++) {
    result.push(statsForValues(modelIds.map((id) => seriesByModel[id]?.[i])))
  }
  return result
}

/** Rundet auf eine Nachkommastelle, `null` bleibt `null`. */
export function round1(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10
}
