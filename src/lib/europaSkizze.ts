/**
 * Europa-Skizze für die Großwetterlage (Etappe 18e): rechnet Länge/Breite in Bildpunkte um
 * und baut die Umrisse von Land und Österreich als SVG-Pfade.
 *
 * Küstenlinien: src/data/europa-kueste.json (Natural Earth, gemeinfrei; erzeugt mit scripts/make-europa-kueste.mjs).
 * Österreich: die Bundesländer-Grenzen der Österreich-Karte.
 */
import kueste from '../data/europa-kueste.json'
import { EUROPE_GRID } from '../api/grosswetterlage'
import { BUNDESLAENDER } from './austriaMap'

/** Breite der Zeichenfläche (das SVG wird per viewBox skaliert) */
export const SKIZZE_WIDTH = 500
/**
 * Ein Längengrad ist bei 50° Breite nur 0,64-mal so lang wie ein Breitengrad.
 * Damit Europa nicht in die Breite gezogen wirkt, rechnen wir die Höhe damit aus.
 */
const LON_FAKTOR = Math.cos((50 * Math.PI) / 180)
const GRAD_BREIT = EUROPE_GRID.east - EUROPE_GRID.west
const GRAD_HOCH = EUROPE_GRID.north - EUROPE_GRID.south
export const SKIZZE_HEIGHT = Math.round((SKIZZE_WIDTH * GRAD_HOCH) / (GRAD_BREIT * LON_FAKTOR))

export const KUESTE_QUELLE = (kueste as { quelle: string }).quelle

/** Länge/Breite → Bildpunkte [x, y] */
export function projectEurope(lon: number, lat: number): [number, number] {
  return [((lon - EUROPE_GRID.west) / GRAD_BREIT) * SKIZZE_WIDTH, ((EUROPE_GRID.north - lat) / GRAD_HOCH) * SKIZZE_HEIGHT]
}

function ringPath(ring: number[][]): string {
  return `${ring.map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'}${projectEurope(lon, lat).map((v) => v.toFixed(1)).join(' ')}`).join('')}Z`
}

/** SVG-Pfad aller Landflächen */
export function landPath(): string {
  return (kueste as { rings: number[][][] }).rings.map(ringPath).join('')
}

/** SVG-Pfad von Österreich (alle Bundesländer, nur die Außenringe) */
export function austriaPath(): string {
  return BUNDESLAENDER.features
    .flatMap((f) => {
      const geometry = f.geometry as { type: string; coordinates: unknown }
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates as number[][][]] : (geometry.coordinates as number[][][][])
      return polygons.map((polygon) => ringPath(polygon[0]))
    })
    .join('')
}
