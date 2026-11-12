import { geoMercator, geoPath } from 'd3-geo'
import daten from '../data/bundeslaender.geo.json'
import type { BundeslaenderDaten, BundeslandId } from '../types/austria'

/**
 * Österreich-Karte als SVG: rechnet die Bundesländer-Grenzen (Länge/Breite) in Bildpunkte um.
 * Feste Ansicht ohne Zoom. Die Grenzen stammen aus src/data/bundeslaender.geo.json
 * (©Statistik Austria, GeoSphere Austria, CC BY 4.0; erzeugt mit scripts/make-austria-map.mjs).
 */

export const BUNDESLAENDER = daten as unknown as BundeslaenderDaten

/** Größe der Zeichenfläche (das SVG wird per viewBox auf die Bildschirmbreite skaliert) */
export const MAP_WIDTH = 1000
export const MAP_HEIGHT = 520
/** Rand um die Karte, damit Grenzen und Beschriftungen nicht abgeschnitten werden */
const PADDING = 16

/**
 * Am Handy ist die Karte nur gut 300 Pixel breit. Damit zehn lesbare Beschriftungen Platz haben,
 * bekommt die Zeichenfläche dort oben und unten einen freien Streifen: Beschriftungen, die im
 * Gedränge (z. B. Wien, St. Pölten, Eisenstadt) keinen Platz finden, rücken dorthin.
 */
export const MOBILE_HEIGHT = 760
export const MOBILE_BAND = 120

export interface LandPath {
  id: BundeslandId
  name: string
  hauptstadt: string
  /** SVG-Pfad (Attribut d) */
  d: string
}

export interface AustriaMap {
  lands: LandPath[]
  /** Länge/Breite → Bildpunkte [x, y]; null, falls außerhalb der Projektion */
  project: (lon: number, lat: number) => [number, number] | null
}

/**
 * Baut die Karte. Mercator-Projektion: Für ein so kleines Gebiet wie Österreich sind die
 * Verzerrungen unsichtbar, und Nord ist oben. fitExtent passt Österreich genau in die Fläche ein.
 */
export function buildAustriaMap(width = MAP_WIDTH, height = MAP_HEIGHT, band = 0): AustriaMap {
  const projection = geoMercator().fitExtent(
    [
      [PADDING, PADDING + band],
      [width - PADDING, height - PADDING - band],
    ],
    BUNDESLAENDER,
  )
  const path = geoPath(projection)
  const lands = BUNDESLAENDER.features.map((f) => ({
    id: f.properties.id,
    name: f.properties.name,
    hauptstadt: f.properties.hauptstadt,
    d: path(f) ?? '',
  }))
  return {
    lands,
    project: (lon, lat) => projection([lon, lat]),
  }
}
