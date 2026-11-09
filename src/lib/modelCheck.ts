import type { PreviousDayForecast } from '../types/forecast'
import { statsForValues } from './statistics'

/**
 * Modell-Check: Wie gut lagen die Modelle zuletzt an deinem Ort?
 * Verglichen wird die Temperatur-Vorhersage, die jedes Modell ~24 Stunden vorher gemacht hat,
 * mit der stündlichen Messung der nächsten GeoSphere-Station.
 */

/** So viele vergangene Tage werden ausgewertet. */
export const CHECK_DAYS = 3
/** Ein Modell braucht mindestens so viele vergleichbare Stunden, sonst wird es nicht bewertet. */
export const MIN_HOURS = 24
/** Kennung für den Mittelwert aller Modelle (wie ihn die App anzeigt) */
export const MEAN_ID = '__mittelwert__'

export interface ModelScore {
  modelId: string
  /** mittlere absolute Abweichung (°C) – je kleiner, desto besser */
  mae: number
  /** mittlere Abweichung mit Vorzeichen (°C): positiv = Modell zu warm, negativ = zu kalt */
  bias: number
  /** größte einzelne Abweichung (°C, Betrag) */
  maxError: number
  /** Anzahl verglichener Stunden */
  hours: number
}

/** Abweichungen einer Zeitreihe gegen die Messung zusammenfassen */
function score(modelId: string, pairs: { forecast: number; measured: number }[]): ModelScore | null {
  if (pairs.length < MIN_HOURS) return null
  const errors = pairs.map((p) => p.forecast - p.measured)
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
  return {
    modelId,
    mae: sum(errors.map(Math.abs)) / errors.length,
    bias: sum(errors) / errors.length,
    maxError: Math.max(...errors.map(Math.abs)),
    hours: errors.length,
  }
}

/**
 * Bewertet alle Modelle (und ihren Mittelwert) gegen die Messung, beste zuerst.
 * @param measured volle Stunde (echte UTC-Zeit, ms) → gemessene Temperatur
 */
export function scoreModels(prev: PreviousDayForecast, measured: Map<number, number>): ModelScore[] {
  const offset = prev.utcOffsetSeconds * 1000
  const ids = Object.keys(prev.temps)
  const pairsById = new Map<string, { forecast: number; measured: number }[]>(ids.map((id) => [id, []]))
  const meanPairs: { forecast: number; measured: number }[] = []

  prev.times.forEach((localTime, i) => {
    // Vorhersage-Zeit ist „Ortszeit als UTC“ → echte UTC-Zeit für den Abgleich mit der Messung
    const m = measured.get(localTime - offset)
    if (m === undefined) return
    for (const id of ids) {
      const f = prev.temps[id][i]
      if (f !== null && f !== undefined) pairsById.get(id)?.push({ forecast: f, measured: m })
    }
    // Mittelwert nur, wenn die meisten Modelle für diese Stunde einen Wert haben
    const s = statsForValues(ids.map((id) => prev.temps[id][i]))
    if (s.mean !== null && s.count >= ids.length / 2) meanPairs.push({ forecast: s.mean, measured: m })
  })

  const scores = ids.map((id) => score(id, pairsById.get(id) ?? [])).filter((s): s is ModelScore => s !== null)
  const mean = score(MEAN_ID, meanPairs)
  return [...scores, ...(mean ? [mean] : [])].sort((a, b) => a.mae - b.mae)
}

/** „zu warm“ / „zu kalt“ / „ausgeglichen“ – erst ab 0,5 °C mittlerer Abweichung lohnt die Tendenz */
export function biasText(bias: number): string {
  if (Math.abs(bias) < 0.5) return 'ausgeglichen'
  return `${bias > 0 ? 'zu warm' : 'zu kalt'} (${bias > 0 ? '+' : '−'}${Math.abs(bias).toFixed(1).replace('.', ',')} °C)`
}
