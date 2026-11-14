/**
 * Hochs und Tiefs über Europa erkennen (Etappe 18a).
 *
 * Grundlage ist ein Raster des Luftdrucks auf Meereshöhe (alle 2,5°). Ein Rasterpunkt ist
 * - ein Tief (T), wenn kein Punkt in seiner Umgebung einen niedrigeren Druck hat,
 * - ein Hoch (H), wenn kein Punkt in seiner Umgebung einen höheren Druck hat.
 * Damit nicht jede kleine Delle zählt, muss sich der Kern deutlich von seiner Umgebung abheben.
 *
 * Die Schwellenwerte stehen gleich hier oben und lassen sich anpassen.
 */
import { EUROPA_REGIONEN, type EuropaRegion } from '../data/europa-regionen'
import type { EuropeGrid, PressureCenter } from '../types/grosswetterlage'

/** Umgebung in Rasterschritten: 2 Schritte = 5° (in Nord-Süd-Richtung ca. 550 km). */
export const SUCH_RADIUS = 2
/**
 * Mindest-Ausprägung in hPa: So viel muss der Kern unter (Tief) bzw. über (Hoch) dem
 * Mittel der Punkte am Rand seiner Umgebung liegen. Kleiner = mehr, auch schwache Gebilde.
 */
export const MIN_AUSPRAEGUNG_HPA = 2
/**
 * Am Rand des Rasters sieht man nur eine Seite eines Druckgebildes. Ein Randpunkt wirkt dann leicht
 * wie ein Hoch, nur weil daneben ein Tief liegt. Darum zählen am Rand nur eindeutige Fälle:
 * ein Tief mit höchstens RAND_TIEF_MAX_HPA, ein Hoch mit mindestens RAND_HOCH_MIN_HPA.
 */
export const RAND_TIEF_MAX_HPA = 1005
export const RAND_HOCH_MIN_HPA = 1025
/**
 * Normaldruck auf Meereshöhe. Ein Tief muss darunter liegen, ein Hoch darüber:
 * Sonst hieße eine flache Kuppe mit 1005 hPa zwischen zwei Tiefs „Hoch“.
 */
export const NORMALDRUCK_HPA = 1013
/** Mitte Österreichs, für die Entfernung der Druckgebilde */
export const OESTERREICH_MITTE = { lat: 47.6, lon: 14.1 } as const

/** Entfernung zweier Punkte auf der Erdkugel in km (Haversine-Formel). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(a))
}

/** Lage in Worten: das Gebiet, dessen Mittelpunkt am nächsten liegt, z. B. „über der Biskaya“. */
export function lageInWorten(lat: number, lon: number, regionen: EuropaRegion[] = EUROPA_REGIONEN): string {
  let best = regionen[0]
  let bestDist = Infinity
  for (const region of regionen) {
    const d = distanceKm(lat, lon, region.lat, region.lon)
    if (d < bestDist) {
      best = region
      bestDist = d
    }
  }
  return best.lage
}

/**
 * Welcher Zeitpunkt des Rasters steht für einen Tag? Wir nehmen 12 Uhr UTC (13 Uhr MEZ, 14 Uhr MESZ).
 * @param dayStart Mitternacht des Tages, wie in der übrigen App als „Ortszeit, als UTC gelesen“
 * @returns Index in `times` oder -1, wenn der Tag nicht im Raster liegt
 */
export function timeIndexForDay(times: number[], dayStart: number): number {
  const noon = dayStart + 12 * 3600 * 1000
  let best = -1
  for (let i = 0; i < times.length; i++) {
    if (best < 0 || Math.abs(times[i] - noon) < Math.abs(times[best] - noon)) best = i
  }
  // Mehr als 6 Stunden daneben: Der Tag liegt außerhalb der Vorhersage.
  return best >= 0 && Math.abs(times[best] - noon) <= 6 * 3600 * 1000 ? best : -1
}

/**
 * Findet alle Hochs und Tiefs zu einem Zeitpunkt.
 * Ergebnis sortiert nach Entfernung zu Österreich, das Nächste zuerst.
 */
export function findPressureCenters(grid: EuropeGrid, timeIndex: number): PressureCenter[] {
  const values = grid.pressure[timeIndex]
  if (!values) return []
  const cols = grid.lons.length
  const rows = grid.lats.length
  const centers: PressureCenter[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c
      const v = values[index]
      if (v === null) continue
      let isMin = true
      let isMax = true
      // Punkte am äußeren Rand der Umgebung, für die Ausprägung
      let ringSum = 0
      let ringCount = 0
      for (let dr = -SUCH_RADIUS; dr <= SUCH_RADIUS; dr++) {
        for (let dc = -SUCH_RADIUS; dc <= SUCH_RADIUS; dc++) {
          if (dr === 0 && dc === 0) continue
          const rr = r + dr
          const cc = c + dc
          if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue
          const other = rr * cols + cc
          const w = values[other]
          if (w === null) continue
          // Bei exakt gleichem Wert (flacher Kern) gewinnt der erste Punkt, sonst gäbe es zwei Kerne.
          if (w < v || (w === v && other < index)) isMin = false
          if (w > v || (w === v && other < index)) isMax = false
          if (Math.max(Math.abs(dr), Math.abs(dc)) === SUCH_RADIUS) {
            ringSum += w
            ringCount++
          }
        }
      }
      if ((!isMin && !isMax) || ringCount === 0) continue
      const auspraegung = isMin ? ringSum / ringCount - v : v - ringSum / ringCount
      if (auspraegung < MIN_AUSPRAEGUNG_HPA) continue
      const amRand = r === 0 || c === 0 || r === rows - 1 || c === cols - 1
      if (isMin ? v >= NORMALDRUCK_HPA : v <= NORMALDRUCK_HPA) continue
      if (amRand && (isMin ? v > RAND_TIEF_MAX_HPA : v < RAND_HOCH_MIN_HPA)) continue
      const lat = grid.lats[r]
      const lon = grid.lons[c]
      centers.push({
        kind: isMin ? 'T' : 'H',
        lat,
        lon,
        hPa: Math.round(v),
        lage: lageInWorten(lat, lon),
        auspraegung,
        distanzKm: distanceKm(lat, lon, OESTERREICH_MITTE.lat, OESTERREICH_MITTE.lon),
        amRand,
      })
    }
  }
  return centers.sort((a, b) => a.distanzKm - b.distanzKm)
}

/** „Tief über der Biskaya, 995 hPa“ */
export function centerText(center: PressureCenter): string {
  return `${center.kind === 'T' ? 'Tief' : 'Hoch'} ${center.lage}, ${center.hPa} hPa`
}
