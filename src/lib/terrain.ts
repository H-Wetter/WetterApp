import type { FoundPoint, TerrainPoint } from '../types/terrain'
import { distanceKm } from './inversion'

/** Umkreis für die Bergsuche (km) */
export const DEFAULT_RADIUS_KM = 15
export const MIN_RADIUS_KM = 5
export const MAX_RADIUS_KM = 30
/** Umkreis für die Talsuche (km) */
export const VALLEY_RADIUS_KM = 5
/** Liegt der Standort höchstens so viel über dem tiefsten Punkt, gilt er selbst als Tal (m). */
export const VALLEY_TOLERANCE_M = 30

const KM_PER_DEG_LAT = 111.32

interface LatLon {
  lat: number
  lon: number
}

/**
 * Rasterabstand je Umkreis: grob genug, um die Aufrufe klein zu halten (ca. 80–180 Punkte),
 * fein genug, um Bergrücken nicht zu übersehen. Feste Stufen, damit sich Raster verschiedener
 * Umkreise überlappen und Höhen aus dem Speicher wiederverwendet werden können.
 */
export function gridSpacingKm(radiusKm: number): number {
  if (radiusKm <= 7) return 1
  if (radiusKm <= 15) return 2
  return 4
}

/**
 * Rasterpunkte im Kreis um den Mittelpunkt. Das Raster ist an festen Koordinaten ausgerichtet
 * (nicht am Standort), damit bei kleinen Ortswechseln dieselben Punkte wieder vorkommen.
 */
export function circleGrid(center: LatLon, radiusKm: number, spacingKm: number): LatLon[] {
  const dLat = spacingKm / KM_PER_DEG_LAT
  // Längengrad-Abstand mit auf 1° gerundeter Breite – gleich für benachbarte Orte
  const dLon = spacingKm / (KM_PER_DEG_LAT * Math.cos((Math.round(center.lat) * Math.PI) / 180))
  const latSpan = radiusKm / KM_PER_DEG_LAT
  const lonSpan = latSpan / Math.cos((center.lat * Math.PI) / 180)

  const points: LatLon[] = []
  for (let i = Math.floor((center.lat - latSpan) / dLat); i * dLat <= center.lat + latSpan; i++) {
    for (let j = Math.floor((center.lon - lonSpan) / dLon); j * dLon <= center.lon + lonSpan; j++) {
      const p = { lat: i * dLat, lon: j * dLon }
      if (distanceKm(center.lat, center.lon, p.lat, p.lon) <= radiusKm) points.push(p)
    }
  }
  return points
}

/** Feines Quadrat-Raster (size × size Punkte) um einen Punkt – zum Nachschärfen. */
export function refineGrid(center: LatLon, spacingKm: number, size = 5): LatLon[] {
  const dLat = spacingKm / KM_PER_DEG_LAT
  const dLon = dLat / Math.cos((center.lat * Math.PI) / 180)
  const half = Math.floor(size / 2)
  const points: LatLon[] = []
  for (let a = -half; a <= half; a++) {
    for (let b = -half; b <= half; b++) points.push({ lat: center.lat + a * dLat, lon: center.lon + b * dLon })
  }
  return points
}

/** Die `count` höchsten (oder tiefsten) Punkte, die mindestens `minApartKm` auseinanderliegen. */
export function extremes(points: TerrainPoint[], kind: 'highest' | 'lowest', count: number, minApartKm: number): TerrainPoint[] {
  const sorted = [...points].sort((a, b) => (kind === 'highest' ? b.elevation - a.elevation : a.elevation - b.elevation))
  const picked: TerrainPoint[] = []
  for (const p of sorted) {
    if (picked.every((q) => distanceKm(p.lat, p.lon, q.lat, q.lon) >= minApartKm)) picked.push(p)
    if (picked.length >= count) break
  }
  return picked
}

const DIRECTIONS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW']

/** Himmelsrichtung von a nach b, z. B. „NO“ */
export function compassDirection(a: LatLon, b: LatLon): string {
  const dy = b.lat - a.lat
  const dx = (b.lon - a.lon) * Math.cos((a.lat * Math.PI) / 180)
  const deg = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
  return DIRECTIONS[Math.round(deg / 45) % 8]
}

/** Punkt mit Entfernung und Richtung vom Standort */
export function describePoint(from: LatLon, p: TerrainPoint): FoundPoint {
  return { ...p, distanceKm: distanceKm(from.lat, from.lon, p.lat, p.lon), direction: compassDirection(from, p) }
}
