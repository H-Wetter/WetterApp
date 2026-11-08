import { VALLEY_RADIUS_KM, VALLEY_TOLERANCE_M, circleGrid, describePoint, extremes, gridSpacingKm, refineGrid } from '../lib/terrain'
import type { TerrainPoint, TerrainResult } from '../types/terrain'
import type { WeatherLocation } from '../types/location'
import { distanceKm } from '../lib/inversion'
import { fetchElevations, type LatLon } from './elevation'

/** Gipfel, die höchstens so viel niedriger sind (m), gelten als gleich hoch. */
const PEAK_TIE_M = 20
/** So viele Gipfel-Kandidaten werden genauer untersucht – beim groben 4-km-Raster (großer Umkreis) mehr */
function candidateCount(spacingKm: number): number {
  return spacingKm >= 4 ? 8 : 6
}
/** Kleinste Schrittweite beim Bergaufsteigen (km) – das Höhenmodell hat 90 m Auflösung */
const MIN_STEP_KM = 0.25
/** Höchstens so viele Schritte je Schrittweite (begrenzt die Aufrufe) */
const MAX_MOVES = 4

async function withElevation(points: LatLon[], signal?: AbortSignal, onWait?: (s: number) => void): Promise<TerrainPoint[]> {
  const heights = await fetchElevations(points, signal, onWait)
  return points.map((p, i) => ({ ...p, elevation: heights[i] }))
}

/**
 * Sucht Tal und Berg rund um den Standort:
 * – Tal: tiefster Punkt im Umkreis von 5 km (Raster 1 km, dann um den tiefsten Punkt auf ca. 330 m nachgeschärft).
 *   Liegt der Standort höchstens 30 m darüber, gilt der Standort selbst als Tal.
 * – Berg: höchster Punkt im gewählten Umkreis (grobes Raster, von den 6–8 höchsten Rasterpunkten aus bergauf gestiegen;
 *   bei fast gleicher Höhe gewinnt der nähere).
 * Kostet beim ersten Mal ca. 300–450 Aufrufe, danach kommt alles aus dem Speicher (0 Aufrufe).
 */
export async function findValleyAndMountain(
  location: WeatherLocation,
  radiusKm: number,
  signal?: AbortSignal,
  onWait?: (seconds: number) => void,
): Promise<TerrainResult> {
  const center = { lat: location.latitude, lon: location.longitude }

  // ---------- Tal ----------
  const [here, ...valleyCoarse] = await withElevation([center, ...circleGrid(center, VALLEY_RADIUS_KM, 1)], signal, onWait)
  const lowCoarse = extremes([here, ...valleyCoarse], 'lowest', 1, 0)[0]
  const valleyFine = await withElevation(refineGrid(lowCoarse, 1 / 3), signal, onWait)
  const lowest = extremes(
    [lowCoarse, ...valleyFine.filter((p) => distanceKm(center.lat, center.lon, p.lat, p.lon) <= VALLEY_RADIUS_KM)],
    'lowest',
    1,
    0,
  )[0]
  const valleyIsLocation = here.elevation - lowest.elevation <= VALLEY_TOLERANCE_M

  // ---------- Berg ----------
  const spacing = gridSpacingKm(radiusKm)
  const coarse = await withElevation(circleGrid(center, radiusKm, spacing), signal, onWait)
  const inRadius = (p: LatLon) => distanceKm(center.lat, center.lon, p.lat, p.lon) <= radiusKm
  // Zwei Kandidaten auf verschiedenen Bergrücken – der grobe Rasterpunkt trifft den Gipfel selten genau
  // Die drei höchsten lokalen Gipfel des groben Rasters – von dort aus bergauf steigen
  // Die höchsten Rasterpunkte, die mehr als einen Rasterschritt auseinanderliegen. (Nur „lokale Gipfel“ zu nehmen
  // geht schief: Ein schmaler Gipfel wie der Schöckl wird vom groben Raster kaum getroffen und von einem Nachbarpunkt
  // eines anderen Bergs überragt.) Von jedem Kandidaten aus steigen wir bergauf.
  const candidates = extremes([here, ...coarse], 'highest', candidateCount(spacing), 1.2 * spacing)
  const peaks: TerrainPoint[] = []
  for (const c of candidates) {
    let peak = c
    // Schrittweite halbieren, bis ca. 250 m; auf jeder Stufe so lange weiter, wie es bergauf geht
    for (let step = spacing / 2; step >= MIN_STEP_KM; step /= 2) {
      for (let move = 0; move < MAX_MOVES; move++) {
        const around = await withElevation(refineGrid(peak, step, 3).filter(inRadius), signal, onWait)
        const higher = around.reduce((a, b) => (b.elevation > a.elevation ? b : a), peak)
        if (higher === peak) break
        peak = higher
      }
    }
    peaks.push(peak)
  }
  // Höchster Gipfel – bei fast gleicher Höhe (≤ 20 m) gewinnt der nähere, er passt besser zum Tal
  const top = Math.max(...peaks.map((p) => p.elevation))
  const best = peaks
    .filter((p) => p.elevation >= top - PEAK_TIE_M)
    .sort((a, b) => distanceKm(center.lat, center.lon, a.lat, a.lon) - distanceKm(center.lat, center.lon, b.lat, b.lon))[0]

  return {
    valley: describePoint(center, valleyIsLocation ? here : lowest),
    valleyIsLocation,
    mountain: describePoint(center, best),
    radiusKm,
  }
}
