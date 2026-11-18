/**
 * Europa-Skizze für die Großwetterlage (Etappe 18e): dieselbe Länderkarte wie im Reiter „Europa“
 * (src/lib/europaMap.ts, Natural Earth), Ausschnitt wie das Europa-Raster, Österreich hervorgehoben.
 */
import { EUROPE_GRID } from '../api/grosswetterlage'
import { EUROPA_LAENDER, buildEuropaKarte, europaHoehe, type Ausschnitt } from './europaMap'

/** Ausschnitt = Europa-Raster, damit jedes erkannte H und T auf der Skizze liegt */
const AUSSCHNITT: Ausschnitt = { west: EUROPE_GRID.west, east: EUROPE_GRID.east, south: EUROPE_GRID.south, north: EUROPE_GRID.north }

/** Breite der Zeichenfläche (das SVG wird per viewBox skaliert) */
export const SKIZZE_WIDTH = 500
export const SKIZZE_HEIGHT = europaHoehe(SKIZZE_WIDTH, AUSSCHNITT)

export const KUESTE_QUELLE = EUROPA_LAENDER.quelle

const KARTE = buildEuropaKarte(SKIZZE_WIDTH, SKIZZE_HEIGHT, 0, AUSSCHNITT)

/** Länge/Breite → Bildpunkte [x, y] */
export function projectEurope(lon: number, lat: number): [number, number] {
  return KARTE.project(lon, lat) ?? [-100, -100]
}

/** Alle Staaten (ohne Österreich) als einzelne Pfade, damit die Grenzen sichtbar sind */
export function laenderPfade(): { id: string; name: string; d: string }[] {
  return KARTE.laender.filter((l) => l.id !== 'AUT')
}

/** SVG-Pfad von Österreich */
export function austriaPath(): string {
  return KARTE.laender.find((l) => l.id === 'AUT')?.d ?? ''
}
