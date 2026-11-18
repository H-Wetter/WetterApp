import type { OrtEuropa } from '../data/orte-europa'
import type { WeatherLocation } from '../types/location'
import { EUROPA_LAENDER, europaHoehe } from './europaMap'

/**
 * Europa-Karte (Reiter „Europa“): Maße der Zeichenfläche und Hilfen für Klicks.
 * Symbol, Temperaturen und Platzierung der Beschriftungen kommen aus src/lib/austria.ts
 * (gleiche Regeln wie bei der Österreich-Karte).
 */

export const EUROPA_MAP_WIDTH = 1000
/** Unter dieser Kartenbreite (Pixel) die schmale Fassung mit 14 statt 21 Hauptstädten */
export const EUROPA_NARROW_PX = 720
/** Höhe so, dass der Ausschnitt unverzerrt hineinpasst */
export const EUROPA_MAP_HEIGHT = europaHoehe(EUROPA_MAP_WIDTH)
/**
 * Am Handy: freier Streifen oben und unten, wie bei der Österreich-Karte. Beschriftungen, die im
 * Gedränge (Mitteleuropa) keinen Platz finden, dürfen dorthin ausweichen.
 */
export const EUROPA_MOBILE_BAND = 110
export const EUROPA_MOBILE_HEIGHT = EUROPA_MAP_HEIGHT + 2 * EUROPA_MOBILE_BAND

/** Deutscher Name eines Landes aus der Kartendatei, z. B. „FRA“ → „Frankreich“ */
export function landName(id: string): string | undefined {
  return EUROPA_LAENDER.features.find((f) => f.properties.id === id)?.properties.name
}

/** Welche Hauptstadt der Karte liegt in diesem Land? (Klick auf die Fläche) */
export function hauptstadtVonLand(landId: string, orte: OrtEuropa[]): OrtEuropa | undefined {
  return orte.find((o) => o.land === landId)
}

/** Ort der Europa-Karte als Standort für „Lokal“ („Mehr Details“) */
export function ortEuropaAlsStandort(ort: OrtEuropa): WeatherLocation {
  return {
    name: ort.name,
    latitude: ort.latitude,
    longitude: ort.longitude,
    elevation: ort.elevation,
    country: landName(ort.land),
    source: 'search',
  }
}
