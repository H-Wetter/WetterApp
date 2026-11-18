import { geoConicConformal, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import daten from '../data/europa-laender.geo.json'

/**
 * Europa-Karte als SVG (Reiter „Europa“ und Skizze der Großwetterlage).
 * Ländergrenzen: src/data/europa-laender.geo.json (Natural Earth, gemeinfrei;
 * erzeugt mit scripts/make-europa-laender.mjs). Feste Ansicht, kein Zoom.
 */

export interface LandProps {
  /** Kürzel, z. B. „AUT“ */
  id: string
  /** deutscher Name */
  name: string
}

interface LaenderDaten extends FeatureCollection<Polygon | MultiPolygon, LandProps> {
  quelle: string
  stand: string
}

export const EUROPA_LAENDER = daten as unknown as LaenderDaten

/** Ausschnitt in Grad */
export interface Ausschnitt {
  west: number
  east: number
  south: number
  north: number
}

/** Ausschnitt des Reiters „Europa“: alle 21 Hauptstädte mit etwas Rand */
export const EUROPA_AUSSCHNITT: Ausschnitt = { west: -11, east: 33, south: 35, north: 62 }

/**
 * Projektion: winkeltreue Kegelprojektion (Lambert), wie sie viele Wetterkarten für Europa nehmen.
 * Längengrade laufen zum Nordpol hin zusammen, so wirkt Skandinavien nicht aufgebläht wie bei Mercator.
 * Mitte bei 10° Ost, Bezugsbreiten 40° und 60° Nord.
 */
function projection() {
  return geoConicConformal().rotate([-10, 0]).parallels([40, 60])
}

/** Der Ausschnitt als Fläche (Kanten fein unterteilt, weil Breitenkreise in der Projektion gebogen sind) */
function ausschnittFlaeche(a: Ausschnitt): Feature<Polygon> {
  const ring: [number, number][] = []
  const n = 20
  for (let i = 0; i <= n; i++) ring.push([a.west + ((a.east - a.west) * i) / n, a.south])
  for (let i = 0; i <= n; i++) ring.push([a.east, a.south + ((a.north - a.south) * i) / n])
  for (let i = 0; i <= n; i++) ring.push([a.east - ((a.east - a.west) * i) / n, a.north])
  for (let i = 0; i <= n; i++) ring.push([a.west, a.north - ((a.north - a.south) * i) / n])
  // d3-geo will den Außenring im Uhrzeigersinn: oben links → oben rechts → unten rechts …
  ring.reverse()
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }
}

/** Höhe der Zeichenfläche, damit der Ausschnitt bei gegebener Breite unverzerrt hineinpasst */
export function europaHoehe(width: number, a: Ausschnitt = EUROPA_AUSSCHNITT): number {
  const p = projection().fitWidth(width, ausschnittFlaeche(a))
  const [[, y0], [, y1]] = geoPath(p).bounds(ausschnittFlaeche(a))
  return Math.round(y1 - y0)
}

export interface LandPfad {
  id: string
  name: string
  /** SVG-Pfad (Attribut d) */
  d: string
}

export interface EuropaKarte {
  laender: LandPfad[]
  /** Länge/Breite → Bildpunkte [x, y]; null, falls außerhalb der Projektion */
  project: (lon: number, lat: number) => [number, number] | null
}

/**
 * Baut die Karte: Der Ausschnitt füllt die Fläche (abzüglich Rand und Streifen oben/unten),
 * Länder, die über den Rand reichen, werden am Bildrand abgeschnitten.
 * @param band freier Streifen oben und unten (Handy, für Beschriftungen wie bei der Österreich-Karte)
 */
export function buildEuropaKarte(width: number, height: number, band = 0, a: Ausschnitt = EUROPA_AUSSCHNITT, padding = 0): EuropaKarte {
  const p = projection()
    .fitExtent(
      [
        [padding, padding + band],
        [width - padding, height - padding - band],
      ],
      ausschnittFlaeche(a),
    )
    .clipExtent([
      [0, 0],
      [width, height],
    ])
  const path = geoPath(p)
  return {
    laender: EUROPA_LAENDER.features.map((f) => ({ id: f.properties.id, name: f.properties.name, d: path(f) ?? '' })),
    project: (lon, lat) => p([lon, lat]),
  }
}
