/**
 * Sonnenstrahlung und grobe Photovoltaik-Schätzung (Etappe 19).
 *
 * Open-Meteo liefert je Stunde die mittlere Leistung der Sonne auf eine waagrechte Fläche in W/m²
 * (Mittel der Stunde davor):
 * - shortwave_radiation: alles zusammen (Globalstrahlung)
 * - direct_radiation: direkt von der Sonnenscheibe (wirft Schatten)
 * - diffuse_radiation: vom Himmel und von den Wolken gestreut
 * Eine Stunde mit 500 W/m² bringt 0,5 kWh je Quadratmeter. Die Tagessumme ist die Summe aller Stunden.
 */
import type { MultiModelForecast, Series } from '../types/forecast'
import type { DaySummary } from './daily'

/** Zusätzliche stündliche Variablen, die für die Strahlung abgefragt werden */
export const STRAHLUNG_VARIABLES = ['shortwave_radiation', 'direct_radiation', 'diffuse_radiation']

/**
 * Anteil der eingestrahlten Energie, der bei einer Photovoltaik-Anlage als Strom ankommt
 * (Verluste durch Wärme, Wechselrichter, Kabel, Schmutz). Üblich sind 0,75 bis 0,85.
 */
export const PV_WIRKUNGSANTEIL = 0.8
/** Ein Modell zählt für einen Tag nur mit, wenn es mindestens so viele Stunden liefert. */
const MIN_STUNDEN = 20

export interface StrahlungTag {
  dayStart: number
  /** Globalstrahlung des Tages in kWh/m² (Mittel der Modelle) */
  global: number
  /** niedrigstes und höchstes Modell (kWh/m²) */
  globalMin: number
  globalMax: number
  /** direkter und diffuser Anteil in kWh/m², `null` = kein Modell liefert ihn */
  direkt: number | null
  diffus: number | null
  /** höchste Stundenleistung des Tages in W/m² (Mittel der Modelle) */
  spitze: number
  /** grobe Schätzung des Ertrags in kWh je kWp installierter Leistung (waagrechte Fläche) */
  pvKwhJeKwp: number
  /** so viele Modelle haben Werte geliefert */
  modelle: number
}

export interface StrahlungStunde {
  t: number
  /** W/m², Mittel der Modelle; `null` = kein Wert */
  global: number | null
  direkt: number | null
  diffus: number | null
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}

/** Tagessumme in kWh/m² je Modell (nur Modelle mit genug Stunden) */
function tagesSummen(series: Record<string, Series> | undefined, from: number, to: number): number[] {
  if (!series) return []
  const out: number[] = []
  for (const values of Object.values(series)) {
    const hours = values.slice(from, to).filter((v): v is number => v !== null)
    if (hours.length >= MIN_STUNDEN) out.push(hours.reduce((a, b) => a + Math.max(0, b), 0) / 1000)
  }
  return out
}

/** Mittel der Modelle für eine Stunde */
function stundenMittel(series: Record<string, Series> | undefined, i: number): number | null {
  if (!series) return null
  return mean(
    Object.values(series)
      .map((values) => values[i])
      .filter((v): v is number => v !== null && v !== undefined)
      // Manche Modelle liefern nachts winzige negative Werte (Rechenungenauigkeit): Strahlung ist nie kleiner als 0.
      .map((v) => Math.max(0, v)),
  )
}

/**
 * Photovoltaik-Schätzung: Module sind so bemessen, dass 1 kWp bei 1000 W/m² Einstrahlung 1 kW liefert.
 * Darum gilt grob: Ertrag in kWh je kWp = Einstrahlung in kWh/m² × Wirkungsanteil.
 * Gerechnet wird mit der Strahlung auf eine WAAGRECHTE Fläche. Nach Süden geneigte Module bekommen
 * im Winter deutlich mehr, im Hochsommer etwas weniger.
 */
export function pvErtrag(globalKwh: number): number {
  return globalKwh * PV_WIRKUNGSANTEIL
}

/** Strahlung je Tag. Tage, für die kein Modell genug Stunden liefert, fehlen. */
export function strahlungTage(fc: MultiModelForecast, days: DaySummary[]): StrahlungTag[] {
  const out: StrahlungTag[] = []
  for (const day of days) {
    const sums = tagesSummen(fc.extra.shortwave_radiation, day.startIndex, day.endIndex)
    const global = mean(sums)
    if (global === null) continue
    let spitze = 0
    for (let i = day.startIndex; i < day.endIndex; i++) spitze = Math.max(spitze, stundenMittel(fc.extra.shortwave_radiation, i) ?? 0)
    out.push({
      dayStart: day.dayStart,
      global,
      globalMin: Math.min(...sums),
      globalMax: Math.max(...sums),
      direkt: mean(tagesSummen(fc.extra.direct_radiation, day.startIndex, day.endIndex)),
      diffus: mean(tagesSummen(fc.extra.diffuse_radiation, day.startIndex, day.endIndex)),
      spitze,
      pvKwhJeKwp: pvErtrag(global),
      modelle: sums.length,
    })
  }
  return out
}

/** Stundenwerte eines Tages für das Diagramm */
export function strahlungStunden(fc: MultiModelForecast, day: DaySummary): StrahlungStunde[] {
  const out: StrahlungStunde[] = []
  for (let i = day.startIndex; i < day.endIndex; i++) {
    out.push({
      t: fc.times[i],
      global: stundenMittel(fc.extra.shortwave_radiation, i),
      direkt: stundenMittel(fc.extra.direct_radiation, i),
      diffus: stundenMittel(fc.extra.diffuse_radiation, i),
    })
  }
  return out
}

/** 1,234 → „1,2“ */
export function kwh(value: number): string {
  return value.toFixed(1).replace('.', ',')
}
