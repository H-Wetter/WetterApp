/**
 * Weitere Einflüsse auf Österreich (Etappe 18d): Saharastaub, Gewitterneigung nach Regionen,
 * Nullgrad- und Schneefallgrenze für Nord- und Südalpen, großräumiger Sturm.
 *
 * Alle Schwellenwerte stehen gleich hier oben und lassen sich anpassen.
 */
import type { Alpenpunkt } from '../data/alpenpunkte'
import type { AlpenDaten, AlpenVariable, EuropeGrid, StaubDaten } from '../types/grosswetterlage'
import { ebenenNeigung, richtungName } from './stroemung'

/** Saharastaub in µg/m³ (gleiche Richtwerte wie im Umwelt-Bereich): ab 20 leicht, ab 50 deutlich, ab 100 stark */
export const STAUB_STUFEN = [20, 50, 100] as const
/** Trübung der Luft (Aerosol-optische Dicke): Ab diesem Wert wirkt der Himmel auch ohne Wolken milchig. */
export const TRUEBUNG_AB = 0.4
/** CAPE in J/kg (wie in CLAUDE.md): ab 500 leichte, ab 1000 deutliche, ab 2000 kräftige Gewitterneigung */
export const CAPE_STUFEN = [500, 1000, 2000] as const
/** Die Schneefallgrenze liegt erfahrungsgemäß etwa so viele Meter unter der Nullgradgrenze. */
export const SCHNEEFALLGRENZE_UNTER_NULLGRAD_M = 300
/** Schneefallgrenze nur nennen, wenn auf dieser Alpenseite mindestens so viel Niederschlag fällt (mm am Tag) */
export const SCHNEEFALL_AB_MM = 1
/** Nullgradgrenze: Ab diesem Unterschied (m) zwischen Tagesbeginn und Tagesende heißt es „sinkt“ bzw. „steigt“. */
export const NULLGRAD_TREND_M = 500
/**
 * Druckgefälle über Österreich in hPa je 100 km: ab 2 lebhafter bis starker Wind, ab 3 Sturm möglich.
 * Zur Einordnung: 2 hPa je 100 km entsprechen in der freien Luft rund 55 km/h, 3 hPa rund 85 km/h.
 */
export const STURM_STUFEN = [2, 3] as const
/** Gebiet für das Druckgefälle: Rasterpunkte rund um Österreich (Breite und Länge von/bis) */
export const STURM_GEBIET = { latMin: 45, latMax: 50, lonMin: 7.5, lonMax: 17.5 }

const HOUR = 3600 * 1000

/** Regionen für die Gewitterneigung: welche Alpenpunkte gehören dazu? */
export const REGIONEN: { name: string; punkte: string[] }[] = [
  { name: 'im Westen', punkte: ['bregenz', 'innsbruck'] },
  { name: 'im Norden', punkte: ['salzburg', 'linz'] },
  { name: 'im Osten', punkte: ['wien'] },
  { name: 'im Süden', punkte: ['graz', 'klagenfurt'] },
]

export interface Staub {
  /** 0 = kein nennenswerter Staub, 1 leicht, 2 deutlich, 3 stark */
  stufe: 0 | 1 | 2 | 3
  /** höchster Wert des Tages über alle Orte (µg/m³) */
  maxDust: number
  /** höchste Trübung des Tages */
  maxAod: number | null
  /** Orte mit mindestens leichter Belastung */
  orte: string[]
}

export interface Gewitterneigung {
  /** höchste Stufe über alle Regionen: 0 keine, 1 leicht, 2 deutlich, 3 kräftig */
  stufe: 0 | 1 | 2 | 3
  /** Regionen mit mindestens leichter Neigung, stärkste zuerst */
  regionen: { name: string; stufe: 1 | 2 | 3; cape: number }[]
}

export interface Hoehengrenze {
  /** Nullgradgrenze am Tagesbeginn, am Tagesende und im Mittel (m) */
  start: number
  ende: number
  mittel: number
  /** Schneefallgrenze (m), nur wenn auf dieser Seite Niederschlag fällt */
  schneefall: number | null
}

export interface Sturm {
  /** 0 = unauffällig, 1 = lebhaft bis stark, 2 = Sturm möglich */
  stufe: 0 | 1 | 2
  /** größtes Druckgefälle des Tages in hPa je 100 km */
  gefaelle: number
  /** Richtung, aus der der Wind dabei weht (Grad) */
  windAus: number
}

// ---------- Hilfen ----------

function mean(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
}

function modelMean(data: AlpenDaten, punktId: string, variable: AlpenVariable, ti: number, models: string[]): number | null {
  return mean(models.map((m) => data.werte[punktId]?.[m]?.[variable]?.[ti] ?? null))
}

function dayIndices(times: number[], dayStart: number): number[] {
  return times.map((t, i) => (t >= dayStart && t < dayStart + 24 * HOUR ? i : -1)).filter((i) => i >= 0)
}

function stufeVon<T extends number>(value: number, stufen: readonly number[]): T {
  return stufen.filter((s) => value >= s).length as T
}

function maxOf(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  return valid.length ? Math.max(...valid) : null
}

/** Auf 100 m gerundet */
function hundert(m: number): number {
  return Math.round(m / 100) * 100
}

// ---------- Saharastaub ----------

/** Saharastaub am gewählten Tag. `null`, wenn die Staub-Vorhersage nicht so weit reicht (ca. 5 Tage). */
export function analyseStaub(data: StaubDaten, punkte: Alpenpunkt[], dayStart: number): Staub | null {
  const idx = dayIndices(data.times, dayStart)
  const perOrt = punkte.map((p) => ({ name: p.name, max: maxOf(idx.map((ti) => data.dust[p.id]?.[ti] ?? null)) }))
  const maxDust = maxOf(perOrt.map((o) => o.max))
  if (maxDust === null) return null
  return {
    stufe: stufeVon(maxDust, STAUB_STUFEN),
    maxDust,
    maxAod: maxOf(punkte.flatMap((p) => idx.map((ti) => data.aod[p.id]?.[ti] ?? null))),
    orte: perOrt.filter((o) => o.max !== null && o.max >= STAUB_STUFEN[0]).map((o) => o.name),
  }
}

// ---------- Gewitterneigung ----------

/** Höchster CAPE-Wert des Tages je Region (Mittel der Modelle und der Orte der Region). */
export function analyseGewitter(data: AlpenDaten, dayStart: number, models: string[] = data.models): Gewitterneigung | null {
  const idx = dayIndices(data.times, dayStart)
  const regionen: Gewitterneigung['regionen'] = []
  let anyData = false
  for (const region of REGIONEN) {
    const cape = maxOf(idx.map((ti) => mean(region.punkte.map((id) => modelMean(data, id, 'cape', ti, models)))))
    if (cape === null) continue
    anyData = true
    const stufe = stufeVon<0 | 1 | 2 | 3>(cape, CAPE_STUFEN)
    if (stufe > 0) regionen.push({ name: region.name, stufe: stufe as 1 | 2 | 3, cape })
  }
  if (!anyData) return null
  regionen.sort((a, b) => b.cape - a.cape)
  return { stufe: regionen[0]?.stufe ?? 0, regionen }
}

// ---------- Nullgradgrenze und Schneefallgrenze ----------

/**
 * Nullgradgrenze für eine Alpenseite ('nord' oder 'sued'): Mittel über die Orte dieser Seite.
 * Die Schneefallgrenze schätzen wir rund 300 m darunter (Schnee schmilzt erst ein Stück unterhalb von 0 °C).
 */
export function analyseHoehengrenze(
  data: AlpenDaten,
  punkte: Alpenpunkt[],
  seite: 'nord' | 'sued',
  dayStart: number,
  models: string[] = data.models,
): Hoehengrenze | null {
  const orte = punkte.filter((p) => p.seite === seite)
  const idx = dayIndices(data.times, dayStart)
  const series = idx.map((ti) => mean(orte.map((p) => modelMean(data, p.id, 'freezing_level_height', ti, models)))).filter((v): v is number => v !== null)
  if (series.length === 0) return null
  const mittel = series.reduce((a, b) => a + b, 0) / series.length

  // Niederschlag des Tages auf dieser Seite (Wert = Summe der 3 Stunden davor)
  const rainIdx = data.times.map((t, i) => (t > dayStart && t <= dayStart + 24 * HOUR ? i : -1)).filter((i) => i >= 0)
  const regen = mean(orte.map((p) => rainIdx.reduce<number>((sum, ti) => sum + (modelMean(data, p.id, 'precipitation', ti, models) ?? 0), 0)))
  // Fällt Niederschlag, zählt die tiefste Nullgradgrenze des Tages: So weit herunter kann es schneien.
  const schneefall = regen !== null && regen >= SCHNEEFALL_AB_MM ? Math.max(0, Math.min(...series) - SCHNEEFALLGRENZE_UNTER_NULLGRAD_M) : null
  return { start: series[0], ende: series[series.length - 1], mittel, schneefall }
}

// ---------- Sturm ----------

/**
 * Großräumiger Sturm: Je stärker der Luftdruck über Österreich von einer Seite zur anderen abfällt,
 * desto stärker der Wind. Wir legen durch den Luftdruck der Rasterpunkte rund um Österreich (STURM_GEBIET)
 * eine schräge Ebene und nehmen das größte Gefälle des Tages.
 *
 * Warum das Europa-Raster und nicht die Alpenpunkte? In Alpentälern ist der auf Meereshöhe umgerechnete
 * Luftdruck ungenau (kalte Luft im Tal täuscht hohen Druck vor). Zwischen nahen Orten entstehen so
 * scheinbare Druckunterschiede, die keinen Wind bedeuten. Über das größere Gebiet mittelt sich das heraus.
 */
export function analyseSturm(grid: EuropeGrid, dayStart: number): Sturm | null {
  const g = STURM_GEBIET
  const cols = grid.lons.length
  let best: Sturm | null = null
  grid.times.forEach((t, ti) => {
    if (t < dayStart || t >= dayStart + 24 * HOUR) return
    const pts: { lat: number; lon: number; wert: number }[] = []
    grid.lats.forEach((lat, r) => {
      grid.lons.forEach((lon, c) => {
        const wert = grid.pressure[ti][r * cols + c]
        if (wert !== null && lat >= g.latMin && lat <= g.latMax && lon >= g.lonMin && lon <= g.lonMax) pts.push({ lat, lon, wert })
      })
    })
    const ebene = ebenenNeigung(pts)
    if (!ebene) return
    // hPa je Meter → hPa je 100 km
    const gefaelle = Math.hypot(ebene.dx, ebene.dy) * 100_000
    if (best && best.gefaelle >= gefaelle) return
    // Der Wind weht entlang der Linien gleichen Drucks, mit dem tiefen Druck links (wie bei der Höhenströmung).
    const windAus = ((Math.atan2(ebene.dy, -ebene.dx) * 180) / Math.PI + 360) % 360
    best = { stufe: stufeVon(gefaelle, STURM_STUFEN), gefaelle, windAus }
  })
  return best
}

// ---------- Texte ----------

function liste(items: string[]): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`
}

export function staubText(s: Staub): string {
  if (s.stufe === 0) {
    return s.maxAod !== null && s.maxAod >= TRUEBUNG_AB
      ? 'Kein Saharastaub, die Luft ist aber durch andere Schwebteilchen getrübt.'
      : 'Kein nennenswerter Saharastaub in der Luft.'
  }
  const wo = s.orte.length > 0 && s.orte.length <= 3 ? `, vor allem bei ${liste(s.orte)}` : ''
  const menge = `bis ${Math.round(s.maxDust / 5) * 5} µg/m³${wo}`
  if (s.stufe === 1) return `Etwas Saharastaub in der Luft (${menge}): Der Himmel kann milchig wirken.`
  const folge = 'Der Himmel ist trüb, und wenn Regen oder Schnee fällt, bleibt gelblicher Staub auf Autos und Schneeflächen zurück.'
  return `${s.stufe === 2 ? 'Deutlich' : 'Sehr viel'} Saharastaub in der Luft (${menge}): ${folge}`
}

const NEIGUNG = ['', 'leicht', 'deutlich', 'kräftig']

export function gewitterText(g: Gewitterneigung): string {
  if (g.stufe === 0) return 'Keine nennenswerte Gewitterneigung.'
  const teile = g.regionen.map((r) => `${r.name} ${NEIGUNG[r.stufe]}`)
  const rest = g.regionen.length < REGIONEN.length ? ', sonst gering' : ''
  return `Gewitterneigung ${liste(teile)}${rest} (CAPE bis ${Math.round(g.regionen[0].cape / 50) * 50} J/kg).`
}

function grenzeTeil(name: string, h: Hoehengrenze): string {
  if (Math.abs(h.ende - h.start) >= NULLGRAD_TREND_M) {
    return `${name} ${h.ende < h.start ? 'sinkt' : 'steigt'} sie von ${hundert(h.start)} auf ${hundert(h.ende)} m`
  }
  return `${name} liegt sie um ${hundert(h.mittel)} m`
}

export function hoehengrenzeText(nord: Hoehengrenze | null, sued: Hoehengrenze | null): string | null {
  if (!nord && !sued) return null
  const teile = [nord ? grenzeTeil('in den Nordalpen', nord) : null, sued ? grenzeTeil('in den Südalpen', sued) : null].filter((t): t is string => t !== null)
  let text = `Nullgradgrenze: ${teile.join(', ')}.`
  const schnee = [
    nord?.schneefall != null ? `im Norden bis etwa ${hundert(nord.schneefall)} m` : null,
    sued?.schneefall != null ? `im Süden bis etwa ${hundert(sued.schneefall)} m` : null,
  ].filter((t): t is string => t !== null)
  if (schnee.length > 0) text += ` Schnee fällt ${schnee.join(', ')} herab.`
  return text
}

export function sturmText(s: Sturm): string {
  if (s.stufe === 0) return 'Kein großräumiger Sturm: Das Druckgefälle über Österreich ist gering.'
  const gefaelle = `${s.gefaelle.toFixed(1).replace('.', ',')} hPa je 100 km`
  return s.stufe === 1
    ? `Kräftiges Druckgefälle über Österreich (${gefaelle}): verbreitet lebhafter bis starker Wind aus ${richtungName(s.windAus)}.`
    : `Sehr starkes Druckgefälle über Österreich (${gefaelle}): Sturm aus ${richtungName(s.windAus)} ist möglich, vor allem auf den Bergen und im Flachland.`
}
