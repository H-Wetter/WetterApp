import type { Series } from './forecast'

/** Stündliche Größen, die wir aus der Ensemble-API holen (Namen exakt wie bei Open-Meteo). */
export const ENSEMBLE_VARIABLES = ['temperature_2m', 'precipitation'] as const
export type EnsembleVariable = (typeof ENSEMBLE_VARIABLES)[number]

/** Ein Ensemble-System (z. B. ECMWF mit 51 Läufen). */
export interface EnsembleModelInfo {
  /** API-Name, z. B. „ecmwf_ifs025_ensemble“ */
  id: string
  label: string
  provider: string
}

/** Ein einzelner Rechenlauf („Member“) eines Ensembles. */
export interface EnsembleMember {
  /** z. B. „member07_ecmwf_ifs025_ensemble“ (der Kontrolllauf hat kein „memberNN“) */
  id: string
  /** API-Name des Ensembles, zu dem der Lauf gehört */
  model: string
  values: Record<EnsembleVariable, Series>
}

/** Ergebnis der Ensemble-Abfrage. */
export interface EnsembleData {
  /** Ortszeit „als UTC gelesen“ (wie MultiModelForecast.times) */
  times: number[]
  utcOffsetSeconds: number
  members: EnsembleMember[]
}

/** Verteilung eines Werts über alle Läufe. */
export interface Spread {
  min: number
  p10: number
  median: number
  p90: number
  max: number
}

export type Confidence = 'hoch' | 'mittel' | 'gering'

/** Zusammenfassung eines Tages über alle Läufe. */
export interface EnsembleDay {
  dayStart: number
  /** 0 = heute, 7 = Tag 8 … */
  dayIndex: number
  /** Anzahl Läufe mit vollständigen Daten an diesem Tag */
  memberCount: number
  /** Ensembles, die an diesem Tag noch Daten liefern */
  models: string[]
  tmax: Spread
  tmin: Spread
  /** Tagessumme Niederschlag in mm */
  precip: Spread
  /** Anteil der Läufe mit mindestens 1 mm (0–100 %) */
  precipProbability: number
  /** Wie einig sind sich die Läufe? (aus der Breite des Bands der Höchstwerte) */
  confidence: Confidence
}
