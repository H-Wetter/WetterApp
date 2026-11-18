/**
 * Zugbahn der Hochs und Tiefs: Wohin wandert ein Kern in den nächsten Stunden?
 *
 * Das Europa-Raster hat alle 6 Stunden einen Zeitpunkt. Zu jedem folgenden Zeitpunkt nehmen wir
 * den nächstgelegenen Kern derselben Art (Tief → Tief, Hoch → Hoch), solange er nicht zu weit
 * entfernt ist. So entsteht eine Kette von Positionen; aus Anfang und Ende folgen Richtung und Tempo.
 * Gleiches Verfahren wie bei der Vb-Erkennung (findeItalientief in src/lib/grosswetterlage.ts).
 *
 * Grenzen: Das Raster ist 2,5° grob (rund 200–280 km). Kleine Verschiebungen sieht man deshalb
 * nicht, und das Tempo ist nur ein grober Wert.
 */
import type { EuropeGrid, PressureCenter } from '../types/grosswetterlage'
import { distanceKm, findPressureCenters } from './druckgebilde'
import { richtungName } from './stroemung'

/** So viele Stunden voraus verfolgen wir den Kern (Pfeillänge auf der Karte) */
export const ZUG_STUNDEN = 24
/**
 * Größter erlaubter Sprung in 6 Stunden (km). Schnelle Sturmtiefs schaffen rund 80 km/h,
 * also knapp 500 km in 6 Stunden; mit etwas Reserve für das grobe Raster 700 km.
 * Weiter weg ist es vermutlich ein anderer Kern.
 */
export const ZUG_SPRUNG_KM = 700
/**
 * Unter dieser Strecke (km in ZUG_STUNDEN) gilt der Kern als „liegt fast still“.
 * Etwa ein Rasterschritt: Kleinere Wege kann das Raster nicht sicher zeigen.
 */
export const ORTSFEST_KM = 250

const HOUR = 3600 * 1000

export interface Zugbahn {
  /** Positionen vom Start bis zum Ende, alle 6 Stunden */
  punkte: { lat: number; lon: number }[]
  /** wie viele Stunden die Kette tatsächlich reicht */
  stunden: number
  /** Luftlinie Start → Ende (km) */
  distanzKm: number
  /** Richtung, in die der Kern zieht (Grad, 0 = Norden, 90 = Osten); null bei ortsfest */
  richtungGrad: number | null
  /** mittleres Tempo (km/h) */
  kmh: number
  /** true = kaum Bewegung */
  ortsfest: boolean
  /**
   * true = Der Kern war vor Ende der Zeit nicht mehr zu finden: Er hat sich abgeschwächt,
   * mit einem anderen vereinigt oder den Ausschnitt verlassen.
   */
  verloren: boolean
}

/** Anfangsrichtung von Punkt 1 nach Punkt 2 auf der Erdkugel (Grad, 0 = Norden) */
export function richtungGrad(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180
  const y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r)
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r)
  return ((Math.atan2(y, x) / r) % 360 + 360) % 360
}

/**
 * Verfolgt einen Kern ab dem Zeitpunkt `timeIndex` höchstens `stunden` weit.
 * @returns null, wenn das Raster nach diesem Zeitpunkt keine Daten mehr hat (letzter Tag)
 */
export function zugbahn(grid: EuropeGrid, timeIndex: number, center: PressureCenter, stunden = ZUG_STUNDEN): Zugbahn | null {
  const start = grid.times[timeIndex]
  if (start === undefined || timeIndex + 1 >= grid.times.length) return null
  const punkte = [{ lat: center.lat, lon: center.lon }]
  let pos = punkte[0]
  let letzteZeit = start
  let verloren = false
  for (let ti = timeIndex + 1; ti < grid.times.length && grid.times[ti] - start <= stunden * HOUR; ti++) {
    let next: PressureCenter | null = null
    let nextDist = Infinity
    for (const c of findPressureCenters(grid, ti)) {
      if (c.kind !== center.kind) continue
      const d = distanceKm(pos.lat, pos.lon, c.lat, c.lon)
      if (d <= ZUG_SPRUNG_KM && d < nextDist) {
        next = c
        nextDist = d
      }
    }
    if (!next) {
      verloren = true
      break
    }
    pos = { lat: next.lat, lon: next.lon }
    punkte.push(pos)
    letzteZeit = grid.times[ti]
  }
  const ende = punkte[punkte.length - 1]
  const distanz = distanceKm(center.lat, center.lon, ende.lat, ende.lon)
  const h = (letzteZeit - start) / HOUR
  // Strecke auf 24 Stunden hochrechnen, damit „ortsfest“ bei kurzen Ketten nicht zu leicht greift
  const ortsfest = h === 0 || (distanz * ZUG_STUNDEN) / h < ORTSFEST_KM
  return {
    punkte,
    stunden: h,
    distanzKm: distanz,
    richtungGrad: ortsfest ? null : richtungGrad(center.lat, center.lon, ende.lat, ende.lon),
    kmh: h > 0 ? distanz / h : 0,
    ortsfest,
    verloren,
  }
}

/** „zieht nach Nordosten (rund 40 km/h)“, „liegt fast still“, „schwächt sich ab oder zieht aus dem Ausschnitt“ */
export function zugText(z: Zugbahn): string {
  if (z.punkte.length === 1 && z.verloren) return 'schwächt sich ab oder zieht aus dem Ausschnitt'
  if (z.ortsfest || z.richtungGrad === null) return 'liegt fast still'
  return `zieht nach ${richtungName(z.richtungGrad)} (rund ${Math.max(5, Math.round(z.kmh / 5) * 5)} km/h)`
}
