import type { OrtOesterreich } from '../data/orte-oesterreich'
import type { BundeslandId } from '../types/austria'
import type { MultiModelForecast } from '../types/forecast'
import type { WeatherLocation } from '../types/location'
import { BUNDESLAENDER } from './austriaMap'
import { summarizeDays } from './daily'

/**
 * Österreich-Karte: Wettersymbol je Ort und Tag, und die Platzierung der Beschriftungen,
 * damit sich nichts überlappt.
 */

// ---------- Wettercode des Tages ----------

/** Tagsüber zählt für das Symbol: 6 bis 18 Uhr (Ende exklusiv) */
const DAY_FROM = 6
const DAY_TO = 18

/**
 * Häufigster Wert einer Liste; bei Gleichstand der größere.
 * Bei WMO-Wettercodes ist ein größerer Code „schwereres“ Wetter
 * (0 klar … 3 bedeckt, 45/48 Nebel, 51–67 Niesel/Regen, 71–77 Schnee, 80–86 Schauer, 95–99 Gewitter).
 */
export function modeHigher(values: number[]): number | null {
  if (values.length === 0) return null
  const count = new Map<number, number>()
  for (const v of values) count.set(v, (count.get(v) ?? 0) + 1)
  let best: number | null = null
  let bestCount = 0
  for (const [v, c] of count) {
    if (c > bestCount || (c === bestCount && best !== null && v > best)) {
      best = v
      bestCount = c
    }
  }
  return best
}

/**
 * Wettercode für einen Tag (Symbol auf der Karte):
 * 1. Je Modell der häufigste Code tagsüber (6–18 Uhr). So macht ein einzelner Schauer am Abend
 *    noch keinen Regentag, und die Nacht (klar oder neblig) zählt nicht mit.
 * 2. Über alle Modelle der häufigste dieser Codes.
 * Bei Gleichstand jeweils der schwerere (größere) Code, damit Regen oder Schnee nicht untergehen.
 * @param startIndex Index der Mitternacht des Tages in forecast.times
 */
export function dailyWeatherCode(forecast: MultiModelForecast, startIndex: number): number | null {
  const perModel: number[] = []
  for (const id of forecast.availableModels) {
    const codes = (forecast.data.weather_code[id] ?? [])
      .slice(startIndex + DAY_FROM, startIndex + DAY_TO)
      .filter((c): c is number => typeof c === 'number')
    const code = modeHigher(codes)
    if (code !== null) perModel.push(code)
  }
  return modeHigher(perModel)
}

// ---------- Beschriftungen ohne Überlappung ----------

export interface LabelBox {
  id: string
  /** Punkt des Ortes (SVG-Koordinaten) */
  x: number
  y: number
  /** Größe der Beschriftung */
  w: number
  h: number
  /**
   * Optional: Abstand von der Oberkante bis zum Punkt, an dem der Ort liegen soll (z. B. Mitte des
   * Symbols). Dann wird zuerst versucht, die Beschriftung direkt auf den Ort zu setzen.
   */
  anchorY?: number
}

export interface PlacedLabel {
  id: string
  /** linke obere Ecke der Beschriftung */
  left: number
  top: number
  w: number
  h: number
  /** true = Beschriftung ist vom Punkt abgerückt, eine kurze Linie verbindet beide */
  leader: boolean
  /** true = Beschriftung sitzt direkt auf dem Ort (kein eigener Punkt nötig) */
  onPoint: boolean
}

interface Rect {
  left: number
  top: number
  w: number
  h: number
}

function overlaps(a: Rect, b: Rect, gap: number): boolean {
  return a.left < b.left + b.w + gap && b.left < a.left + a.w + gap && a.top < b.top + b.h + gap && b.top < a.top + a.h + gap
}

/** Nächster Punkt der Beschriftung zum Ort – dort endet die Verbindungslinie */
export function leaderEnd(r: Rect, x: number, y: number): [number, number] {
  return [Math.max(r.left, Math.min(x, r.left + r.w)), Math.max(r.top, Math.min(y, r.top + r.h))]
}

/** Läuft die Strecke von (x1, y1) nach (x2, y2) durch das Rechteck? (Prüfung an 16 Punkten der Strecke) */
function segmentHits(x1: number, y1: number, x2: number, y2: number, r: Rect): boolean {
  for (let i = 1; i < 16; i++) {
    const x = x1 + ((x2 - x1) * i) / 16
    const y = y1 + ((y2 - y1) * i) / 16
    if (x > r.left && x < r.left + r.w && y > r.top && y < r.top + r.h) return true
  }
  return false
}

function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.left + a.w, b.left + b.w) - Math.max(a.left, b.left)
  const h = Math.min(a.top + a.h, b.top + b.h) - Math.max(a.top, b.top)
  return w > 0 && h > 0 ? w * h : 0
}

/**
 * Setzt die Beschriftungen so, dass sie sich nicht überlappen und keinen anderen Ortspunkt verdecken.
 * Für jeden Ort werden Positionen rund um den Punkt ausprobiert (rechts, links, oben, unten, schräg),
 * zuerst nah, dann weiter weg. Orte mit vielen Nachbarn (Wien, St. Pölten, Eisenstadt) kommen zuerst dran,
 * damit sie die besten Plätze bekommen. Findet sich gar kein freier Platz, nimmt die Funktion den mit
 * der kleinsten Überlappung.
 * @param gap Mindestabstand zwischen Beschriftungen
 * @param dot Radius des Ortspunkts (Abstand der Beschriftung vom Punkt)
 */
export function placeLabels(items: LabelBox[], width: number, height: number, gap = 4, dot = 6): PlacedLabel[] {
  // Orte mit vielen Nachbarn zuerst – das klappt meistens. Sonst weitere Reihenfolgen probieren.
  const neighbours = (it: LabelBox) =>
    items.filter((o) => o !== it && Math.hypot(o.x - it.x, o.y - it.y) < (it.w + it.h) * 1.5).length
  const orders: LabelBox[][] = [
    [...items].sort((a, b) => neighbours(b) - neighbours(a)),
    [...items].sort((a, b) => b.x - a.x), // von Osten nach Westen
    [...items].sort((a, b) => a.y - b.y), // von Norden nach Süden
    [...items].sort((a, b) => b.y - a.y),
  ]
  // dazu feste „Zufalls“-Reihenfolgen (immer dieselben, damit die Karte nicht springt)
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let k = 0; k < 40; k++) orders.push([...items].map((it) => ({ it, r: rnd() })).sort((a, b) => a.r - b.r).map((x) => x.it))

  // Bewertung: Summe der Abstände zwischen Ort und Mitte seiner Beschriftung (kleiner = besser).
  const cost = (result: PlacedLabel[]) =>
    result.reduce((sum, p, i) => sum + (p.onPoint ? 0 : Math.hypot(p.left + p.w / 2 - items[i].x, p.top + p.h / 2 - items[i].y)), 0)

  // Zuerst nur kurze Linien erlauben; reicht das nicht, beliebig lange.
  for (const maxLeader of [2.2, Infinity]) {
    let best: { result: PlacedLabel[]; c: number } | null = null
    for (const order of orders) {
      const { result, clean } = placeInOrder(items, order, width, height, gap, dot, maxLeader)
      if (!clean) continue
      const c = cost(result)
      if (!best || c < best.c) best = { result, c }
    }
    if (best) return best.result
  }
  return placeInOrder(items, orders[0], width, height, gap, dot, Infinity).result
}

/** Ein Durchlauf in fester Reihenfolge. clean = alle fanden einen freien Platz. */
function placeInOrder(
  items: LabelBox[],
  order: LabelBox[],
  width: number,
  height: number,
  gap: number,
  dot: number,
  /** größter erlaubter Abstand Ort → Mitte der Beschriftung, in Vielfachen der Beschriftungshöhe */
  maxLeader: number,
): { result: PlacedLabel[]; clean: boolean } {
  let clean = true
  const placed: PlacedLabel[] = []
  /** Verbindungslinien, die schon gezogen sind – neue Beschriftungen dürfen sie nicht verdecken */
  const leaders: [number, number, number, number][] = []
  const dotRect = (o: LabelBox): Rect => ({ left: o.x - dot, top: o.y - dot, w: dot * 2, h: dot * 2 })

  for (const it of order) {
    const { w, h } = it
    // Kandidaten: linke obere Ecke relativ zum Punkt
    const near: [number, number][] = [
      [dot, -h / 2], // rechts
      [-w - dot, -h / 2], // links
      [-w / 2, -h - dot], // oben
      [-w / 2, dot], // unten
      [dot, -h - dot / 2], // rechts oben
      [dot, dot / 2], // rechts unten
      [-w - dot, -h - dot / 2], // links oben
      [-w - dot, dot / 2], // links unten
    ]
    const candidates: { rect: Rect; leader: boolean; onPoint?: boolean }[] = []
    // Am liebsten direkt auf dem Ort (Symbol über dem Punkt)
    if (it.anchorY !== undefined) {
      candidates.push({ rect: { left: it.x - w / 2, top: it.y - it.anchorY, w, h }, leader: false, onPoint: true })
    }
    for (const factor of [1, 1.8]) {
      for (const [dx, dy] of near) {
        // etwas weiter weg: Richtung beibehalten, Abstand vergrößern
        const cx = dx + w / 2
        const cy = dy + h / 2
        candidates.push({ rect: { left: it.x + cx * factor - w / 2, top: it.y + cy * factor - h / 2, w, h }, leader: factor > 1 })
      }
    }
    const inBounds = (r: Rect) => r.left >= 0 && r.top >= 0 && r.left + r.w <= width && r.top + r.h <= height
    const blockers: Rect[] = [...placed, ...items.filter((o) => o !== it).map(dotRect)]
    /**
     * Frei ist eine Stelle, wenn sie im Bild liegt, nichts überlappt, keine vorhandene Linie verdeckt
     * und – bei abgerückten Beschriftungen – die eigene Linie durch keine andere Beschriftung läuft.
     */
    const isFree = (r: Rect, leader: boolean) => {
      if (!inBounds(r) || blockers.some((bl) => overlaps(r, bl, gap))) return false
      if (leaders.some(([x1, y1, x2, y2]) => segmentHits(x1, y1, x2, y2, r))) return false
      if (!leader) return true
      const [ex, ey] = leaderEnd(r, it.x, it.y)
      return !blockers.some((bl) => segmentHits(it.x, it.y, ex, ey, bl))
    }
    let chosen = candidates.find((c) => isFree(c.rect, c.leader || !c.onPoint))

    // Kein Platz in der Nähe: die ganze Fläche in einem Raster absuchen und den freien Platz
    // nehmen, der dem Ort am nächsten liegt (eine Linie verbindet dann Ort und Beschriftung).
    if (!chosen) {
      const step = Math.max(4, h / 3)
      let best: { rect: Rect; d: number } | null = null
      for (let top = 0; top + h <= height; top += step) {
        for (let left = 0; left + w <= width; left += step) {
          const rect = { left, top, w, h }
          const d = Math.hypot(left + w / 2 - it.x, top + h / 2 - it.y)
          if (d > maxLeader * Math.max(w, h)) continue
          if (!isFree(rect, true)) continue
          if (!best || d < best.d) best = { rect, d }
        }
      }
      if (best) chosen = { rect: best.rect, leader: true }
    }
    // Ganz ohne freien Platz: die Stelle mit der kleinsten Überlappung (dann andere Reihenfolge probieren)
    if (!chosen) {
      clean = false
      chosen =
        candidates
          .filter((c) => inBounds(c.rect))
          .map((c) => ({ c, cost: blockers.reduce((sum, bl) => sum + overlapArea(c.rect, bl), 0) }))
          .sort((x, y) => x.cost - y.cost)[0]?.c ?? candidates[0]
    }
    placed.push({ id: it.id, ...chosen.rect, leader: chosen.leader, onPoint: chosen.onPoint ?? false })
    if (chosen.leader) leaders.push([it.x, it.y, ...leaderEnd(chosen.rect, it.x, it.y)])
  }
  // Reihenfolge wie übergeben zurückgeben
  return { result: items.map((it) => placed.find((p) => p.id === it.id) as PlacedLabel), clean }
}

/** Grobe Breite eines Textes in Vielfachen der Schriftgröße (Durchschnitt für eine normale Schrift) */
export function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.56
}

// ---------- Werte je Ort und Tag ----------


export interface PlaceDay {
  /** Mitternacht des Tages (Ortszeit als UTC, wie forecast.times) */
  dayStart: number
  /** WMO-Wettercode für das Symbol (siehe dailyWeatherCode) */
  code: number | null
  /** Höchst- und Tiefstwert (Mittel der Modelle) */
  max: number | null
  min: number | null
}

/** Symbol, Höchst- und Tiefstwert eines Ortes für alle Tage der Vorhersage (Index 0 = heute). */
export function placeDays(forecast: MultiModelForecast): PlaceDay[] {
  return summarizeDays(forecast).map((day) => ({
    dayStart: day.dayStart,
    code: dailyWeatherCode(forecast, day.startIndex),
    max: day.tempMax.mean,
    min: day.tempMin.mean,
  }))
}

/**
 * Für die Tagesauswahl: je Tag das häufigste Symbol über alle Orte (bei Gleichstand das schwerere).
 * @param perPlace Tageswerte je Ort (aus placeDays), alle mit denselben Tagen
 */
export function dayOverview(perPlace: PlaceDay[][], days: number): { dayStart: number; code: number | null }[] {
  const first = perPlace.find((p) => p.length > 0) ?? []
  return first.slice(0, days).map((d, i) => ({
    dayStart: d.dayStart,
    code: modeHigher(perPlace.map((p) => p[i]?.code).filter((c): c is number => typeof c === 'number')),
  }))
}

/** „12°/3°“ (mit echtem Minuszeichen) */
export function tempPair(max: number | null, min: number | null): string {
  const f = (v: number | null) => (v === null ? '–' : `${Math.round(v)}°`.replace('-', '−'))
  return `${f(max)}/${f(min)}`
}

/**
 * Größe eines Markers auf der Karte: oben die Temperaturen („12°/6°“), darunter das Symbol
 * (2,2 × Schrift). Der Ort liegt in der Mitte des Symbols (anchorY). Gleiche Formel in Karte und Tests.
 */
export function labelSize(temps: string, font: number): { w: number; h: number; icon: number; anchorY: number } {
  const icon = font * 2.5
  const text = font * 1.15
  const w = Math.max(textWidth(temps, font), icon) + font * 0.5
  return { w, h: text + icon, icon, anchorY: text + icon / 2 }
}

// ---------- Ort → „Lokal“ ----------

/** Ort der Österreich-Karte als Standort für „Lokal“ („Mehr Details“) */
export function ortAlsStandort(ort: OrtOesterreich): WeatherLocation {
  const land = BUNDESLAENDER.features.find((f) => f.properties.id === ort.bundesland)?.properties.name
  return {
    name: ort.name,
    latitude: ort.latitude,
    longitude: ort.longitude,
    elevation: ort.elevation,
    country: 'Österreich',
    region: land,
    source: 'search',
  }
}

/** Welcher Ort gehört zu einem Bundesland? (Klick auf die Fläche → Landeshauptstadt) */
export function hauptstadtVon(land: BundeslandId, orte: OrtOesterreich[]): OrtOesterreich | undefined {
  return orte.find((o) => o.bundesland === land && o.art === 'hauptstadt')
}
