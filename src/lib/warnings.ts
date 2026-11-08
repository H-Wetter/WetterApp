import type { MultiModelForecast } from '../types/forecast'
import type { DaySummary } from './daily'
import { isThunderCode } from './weatherSymbol'

/**
 * Warnhinweise (regelbasiert) – angelehnt an die Schwellen von DWD und GeoSphere Austria.
 *
 * Wichtig: Das sind Hinweise aus Modelldaten, KEINE amtlichen Warnungen.
 * Wir nehmen je Modell den Tageswert und davon den MEDIAN (den „mittleren“ Wert) –
 * so kann ein einzelnes extremes Modell keinen Alarm auslösen. Dazu zeigen wir,
 * wie viele Modelle die Schwelle erreichen.
 */

/** 1 = gelb, 2 = orange, 3 = rot, 4 = violett */
export type WarnLevel = 1 | 2 | 3 | 4
export type WarnKind = 'thunder' | 'gust' | 'snow' | 'ice'

export interface Warning {
  kind: WarnKind
  level: WarnLevel
  title: string
  detail: string
  dayStart: number
  /** Zeitfenster (Stunden-Zeitpunkte), wenn bekannt */
  from: number | null
  to: number | null
  /** wie viele Modelle die Schwelle erreichen, von wie vielen */
  hits: number
  total: number
}

export const LEVEL_NAME: Record<WarnLevel, string> = { 1: 'gelb', 2: 'orange', 3: 'rot', 4: 'violett' }

/** Zusätzliche Variablen, die für die Warnungen abgefragt werden müssen. */
export const WARNING_EXTRA_VARIABLES = ['cape', 'freezing_level_height']

// ---------- Schwellen ----------

/** Böen in km/h: Windböen / Sturmböen / schwere Sturmböen / Orkanböen (DWD-Beaufort-Stufen) */
export const GUST_LEVELS = [50, 75, 89, 118] as const
const GUST_TITLES = ['Windböen', 'Sturmböen', 'Schwere Sturmböen', 'Orkanböen'] as const

/** Neuschnee in cm pro Tag */
export const SNOW_LEVELS = [3, 10, 25, 50] as const
const SNOW_TITLES = ['Schneefall', 'Starker Schneefall', 'Sehr starker Schneefall', 'Extremer Schneefall'] as const

/** CAPE in J/kg (laut CLAUDE.md: > 500 leicht, > 1000 deutlich, > 2000 kräftig) */
export const CAPE_LEVELS = [500, 1000, 2000] as const
const THUNDER_TITLES = ['Gewitter möglich', 'Gewitter', 'Kräftige Gewitter'] as const

// ---------- Hilfsfunktionen ----------

function nums(values: (number | null | undefined)[]): number[] {
  return values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Stufe zu einem Wert (0 = keine Warnung) */
function levelOf(value: number, limits: readonly number[]): number {
  let level = 0
  limits.forEach((limit, i) => {
    if (value >= limit) level = i + 1
  })
  return level
}

/** Erste und letzte Stunde, in der die Bedingung erfüllt ist. */
function window(times: number[], from: number, to: number, test: (i: number) => boolean): { from: number | null; to: number | null } {
  let first: number | null = null
  let last: number | null = null
  for (let i = from; i < to; i++) {
    if (!test(i)) continue
    if (first === null) first = times[i]
    last = times[i]
  }
  return { from: first, to: last }
}

function seriesOf(fc: MultiModelForecast, variable: string, id: string): (number | null)[] | undefined {
  return (fc.data as Record<string, Record<string, (number | null)[]>>)[variable]?.[id] ?? fc.extra[variable]?.[id]
}

/** Werte aller Modelle in Stunde i. */
function atHour(fc: MultiModelForecast, variable: string, i: number): number[] {
  return nums(fc.availableModels.map((id) => seriesOf(fc, variable, id)?.[i]))
}

/** Tageswert je Modell (z. B. Maximum oder Summe), nur Modelle mit genug Stunden. */
function perModelDaily(
  fc: MultiModelForecast,
  variable: string,
  from: number,
  to: number,
  reduce: (values: number[]) => number,
): number[] {
  const out: number[] = []
  for (const id of fc.availableModels) {
    const values = nums((seriesOf(fc, variable, id) ?? []).slice(from, to))
    if (values.length >= 20) out.push(reduce(values))
  }
  return out
}

const max = (v: number[]) => Math.max(...v)
const sum = (v: number[]) => v.reduce((a, b) => a + b, 0)

// ---------- Regeln ----------

function gustWarning(fc: MultiModelForecast, day: DaySummary): Warning | null {
  const maxima = perModelDaily(fc, 'wind_gusts_10m', day.startIndex, day.endIndex, max)
  const m = median(maxima)
  if (m === null) return null
  const level = levelOf(m, GUST_LEVELS)
  if (level === 0) return null
  const w = window(fc.times, day.startIndex, day.endIndex, (i) => (median(atHour(fc, 'wind_gusts_10m', i)) ?? 0) >= GUST_LEVELS[0])
  return {
    kind: 'gust',
    level: level as WarnLevel,
    title: GUST_TITLES[level - 1],
    detail: `Böen bis etwa ${Math.round(m)} km/h (stärkstes Modell ${Math.round(Math.max(...maxima))} km/h).`,
    dayStart: day.dayStart,
    ...w,
    hits: maxima.filter((v) => v >= GUST_LEVELS[level - 1]).length,
    total: maxima.length,
  }
}

function snowWarning(fc: MultiModelForecast, day: DaySummary): Warning | null {
  const sums = perModelDaily(fc, 'snowfall', day.startIndex, day.endIndex, sum)
  const m = median(sums)
  if (m === null) return null
  const level = levelOf(m, SNOW_LEVELS)
  if (level === 0) return null
  const w = window(fc.times, day.startIndex, day.endIndex, (i) => (median(atHour(fc, 'snowfall', i)) ?? 0) >= 0.2)
  return {
    kind: 'snow',
    level: level as WarnLevel,
    title: SNOW_TITLES[level - 1],
    detail: `Etwa ${m.toFixed(0)} cm Neuschnee (Modelle: ${Math.round(Math.min(...sums))} bis ${Math.round(Math.max(...sums))} cm).`,
    dayStart: day.dayStart,
    ...w,
    hits: sums.filter((v) => v >= SNOW_LEVELS[level - 1]).length,
    total: sums.length,
  }
}

/**
 * Gewitter: CAPE (Energie für Gewitter) UND Wettercode (melden Modelle Gewitter?) zusammen.
 * Viel CAPE ohne Gewittercode → eine Stufe niedriger (Energie da, aber Auslösung unsicher).
 * Gewittercode bei mind. 30 % der Modelle → mindestens gelb.
 */
function thunderWarning(fc: MultiModelForecast, day: DaySummary): Warning | null {
  let maxCape = 0
  let maxShare = 0
  for (let i = day.startIndex; i < day.endIndex; i++) {
    maxCape = Math.max(maxCape, median(atHour(fc, 'cape', i)) ?? 0)
    const codes = atHour(fc, 'weather_code', i)
    if (codes.length) maxShare = Math.max(maxShare, codes.filter(isThunderCode).length / codes.length)
  }

  let level = levelOf(maxCape, CAPE_LEVELS)
  if (maxShare < 0.1) level = Math.max(0, level - 1)
  if (maxShare >= 0.3) level = Math.max(1, level)
  if (level === 0) return null

  const total = fc.availableModels.length
  const hits = fc.availableModels.filter((id) =>
    nums((seriesOf(fc, 'weather_code', id) ?? []).slice(day.startIndex, day.endIndex)).some(isThunderCode),
  ).length
  const w = window(fc.times, day.startIndex, day.endIndex, (i) => {
    const codes = atHour(fc, 'weather_code', i)
    const share = codes.length ? codes.filter(isThunderCode).length / codes.length : 0
    return share >= 0.1 || (median(atHour(fc, 'cape', i)) ?? 0) >= CAPE_LEVELS[0]
  })

  const capeText = maxCape >= 100 ? ` CAPE bis ${Math.round(maxCape / 50) * 50} J/kg.` : ''
  const extra = level >= 2 ? ' Möglich: Starkregen, Hagel, Sturmböen.' : ''
  return {
    kind: 'thunder',
    level: level as WarnLevel,
    title: THUNDER_TITLES[Math.min(level, 3) - 1],
    detail: `${hits} von ${total} Modellen zeigen Gewitter.${capeText}${extra}`,
    dayStart: day.dayStart,
    ...w,
    hits,
    total,
  }
}

/**
 * Glätte: Niederschlag bei Temperaturen um/unter 0 °C oder wenn die Nullgradgrenze
 * bis zum Ort herunterkommt. (Schneefall hat eine eigene Warnung.)
 */
function iceWarning(fc: MultiModelForecast, day: DaySummary, elevation: number, freezing: FreezingInfo | null): Warning | null {
  const wet = (day.precipSum.mean ?? 0) >= 1 && day.precipShare >= 0.3
  if (!wet) return null
  const cold = (day.tempMin.mean ?? 99) <= 0.5
  const lowFreezing = freezing !== null && freezing.min <= elevation + 100
  if (!cold && !lowFreezing) return null
  const w = window(fc.times, day.startIndex, day.endIndex, (i) => {
    const t = median(atHour(fc, 'temperature_2m', i))
    const p = median(atHour(fc, 'precipitation', i))
    return t !== null && p !== null && t <= 1 && p >= 0.1
  })
  return {
    kind: 'ice',
    level: 1,
    title: 'Glättegefahr',
    detail:
      'Niederschlag bei Temperaturen um 0 °C' +
      (freezing === null
        ? '.'
        : freezing.min <= elevation + 50
          ? ' – die Nullgradgrenze reicht bis zum Boden.'
          : ` – Nullgradgrenze sinkt bis etwa ${Math.round(freezing.min / 50) * 50} m.`),
    dayStart: day.dayStart,
    ...w,
    hits: 0,
    total: 0,
  }
}

// ---------- Nullgradgrenze ----------

export interface FreezingInfo {
  /** tiefster / höchster Wert des Tages (Mittel der Modelle je Stunde), m über dem Meer */
  min: number
  max: number
  /** ungefähre Schneefallgrenze ≈ Nullgradgrenze − 300 m (Faustregel) */
  snowLine: number
  models: number
}

/** Nullgradgrenze eines Tages (aus den Modellen, die sie liefern). */
export function freezingLevel(fc: MultiModelForecast, day: DaySummary): FreezingInfo | null {
  const hourly: number[] = []
  let models = 0
  for (let i = day.startIndex; i < day.endIndex; i++) {
    const values = atHour(fc, 'freezing_level_height', i)
    models = Math.max(models, values.length)
    const m = median(values)
    if (m !== null) hourly.push(m)
  }
  if (hourly.length === 0) return null
  const min = Math.min(...hourly)
  return { min, max: Math.max(...hourly), snowLine: Math.max(0, min - 300), models }
}

// ---------- Alles zusammen ----------

/** Alle Hinweise für die übergebenen Tage, sortiert nach Tag und Stärke. */
export function computeWarnings(fc: MultiModelForecast, days: DaySummary[], elevation: number): Warning[] {
  const out: Warning[] = []
  for (const day of days) {
    const freezing = freezingLevel(fc, day)
    for (const w of [thunderWarning(fc, day), gustWarning(fc, day), snowWarning(fc, day), iceWarning(fc, day, elevation, freezing)]) {
      if (w) out.push(w)
    }
  }
  return out.sort((a, b) => a.dayStart - b.dayStart || b.level - a.level)
}

/** Höchste Warnstufe eines Tages (0 = keine). */
export function maxLevel(warnings: Warning[], dayStart: number): number {
  return warnings.filter((w) => w.dayStart === dayStart).reduce((m, w) => Math.max(m, w.level), 0)
}
