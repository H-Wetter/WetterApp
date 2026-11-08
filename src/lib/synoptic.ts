import { contours } from 'd3-contour'
import type { IsoBand, Isoline, PressureCenter, SynopticGrid } from '../types/synoptic'

/** Feinheit: zwischen zwei Rasterpunkten werden so viele Zwischenschritte gerechnet (glattere Linien). */
const REFINE = 4
/** Abstand der Isobaren in hPa (wie beim DWD) */
export const ISOBAR_STEP = 5
/** Abstand der Farbstufen für das 500-hPa-Geopotential in gpdm */
export const Z500_STEP = 4

interface FineGrid {
  cols: number
  rows: number
  values: number[]
  /** Gitter-Koordinate (x, y wie von d3-contour) → [Breite, Länge] */
  toLatLon: (x: number, y: number) => [number, number]
}

/**
 * Verfeinert das grobe Raster durch lineare Zwischenwerte (bilinear).
 * Ohne diesen Schritt hätten die Isolinien sichtbare Ecken alle 2,5°.
 */
function refine(grid: SynopticGrid, values: number[]): FineGrid {
  const cCols = grid.lons.length
  const cRows = grid.lats.length
  const cols = (cCols - 1) * REFINE + 1
  const rows = (cRows - 1) * REFINE + 1
  const out = new Array<number>(cols * rows)

  for (let r = 0; r < rows; r++) {
    const fr = r / REFINE
    const r0 = Math.min(Math.floor(fr), cRows - 2)
    const dy = fr - r0
    for (let c = 0; c < cols; c++) {
      const fc = c / REFINE
      const c0 = Math.min(Math.floor(fc), cCols - 2)
      const dx = fc - c0
      const v00 = values[r0 * cCols + c0]
      const v01 = values[r0 * cCols + c0 + 1]
      const v10 = values[(r0 + 1) * cCols + c0]
      const v11 = values[(r0 + 1) * cCols + c0 + 1]
      out[r * cols + c] = v00 * (1 - dx) * (1 - dy) + v01 * dx * (1 - dy) + v10 * (1 - dx) * dy + v11 * dx * dy
    }
  }

  const north = grid.lats[0]
  const south = grid.lats[cRows - 1]
  const west = grid.lons[0]
  const east = grid.lons[cCols - 1]
  const step = (grid.lats[0] - grid.lats[1]) / REFINE
  return {
    cols,
    rows,
    values: out,
    // d3-contour legt den Wert von Gitterpunkt i bei x = i + 0,5 ab
    toLatLon: (x, y) => [
      Math.min(north, Math.max(south, north - (y - 0.5) * step)),
      Math.min(east, Math.max(west, west + (x - 0.5) * step)),
    ],
  }
}

function thresholds(values: number[], step: number): number[] {
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const out: number[] = []
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) out.push(t)
  return out
}

/**
 * Isolinien (z. B. Isobaren). d3-contour liefert geschlossene Flächen, die am Kartenrand entlanglaufen.
 * Diese Randstücke schneiden wir ab – übrig bleiben die echten Linien.
 */
export function isolines(grid: SynopticGrid, values: number[], step: number): Isoline[] {
  const fine = refine(grid, values)
  const onBorder = (x: number, y: number) => x <= 0 || y <= 0 || x >= fine.cols || y >= fine.rows

  return contours()
    .size([fine.cols, fine.rows])
    .thresholds(thresholds(fine.values, step))(fine.values)
    .map((mp) => {
      const lines: [number, number][][] = []
      for (const polygon of mp.coordinates) {
        for (const ring of polygon) {
          let current: [number, number][] = []
          for (const [x, y] of ring) {
            if (onBorder(x, y)) {
              if (current.length > 1) lines.push(current)
              current = []
            } else {
              current.push(fine.toLatLon(x, y))
            }
          }
          if (current.length > 1) lines.push(current)
        }
      }
      return { value: mp.value, lines }
    })
    .filter((l) => l.lines.length > 0)
}

/** Farbflächen: für jede Stufe die Fläche, in der der Wert mindestens so hoch ist (aufsteigend sortiert). */
export function isobands(grid: SynopticGrid, values: number[], step: number): IsoBand[] {
  const fine = refine(grid, values)
  const all = thresholds(fine.values, step)
  // unterste Stufe eine Stufe tiefer, damit die ganze Karte eingefärbt ist
  const levels = all.length > 0 ? [all[0] - step, ...all] : all
  return contours()
    .size([fine.cols, fine.rows])
    .thresholds(levels)(fine.values)
    .map((mp) => ({
      value: mp.value,
      polygons: mp.coordinates.map((polygon) => polygon.map((ring) => ring.map(([x, y]) => fine.toLatLon(x, y)))),
    }))
}

/**
 * Hoch- und Tiefdruckzentren: ein Rasterpunkt, der in seiner Umgebung (± 3 Punkte = ± 7,5°)
 * den höchsten bzw. tiefsten Druck hat. Ganz am Rand nicht – dort könnte das Zentrum außerhalb liegen.
 * Flache Gebilde (weniger als 3 hPa Unterschied in der Umgebung) zählen nicht.
 */
export function pressureCenters(grid: SynopticGrid, values: number[]): PressureCenter[] {
  const cols = grid.lons.length
  const rows = grid.lats.length
  const R = 3
  const centers: PressureCenter[] = []

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const v = values[r * cols + c]
      let isMax = true
      let isMin = true
      let lo = v
      let hi = v
      for (let dr = -R; dr <= R; dr++) {
        for (let dc = -R; dc <= R; dc++) {
          if (dr === 0 && dc === 0) continue
          const rr = r + dr
          const cc = c + dc
          if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue
          const w = values[rr * cols + cc]
          if (w >= v) isMax = false
          if (w <= v) isMin = false
          lo = Math.min(lo, w)
          hi = Math.max(hi, w)
        }
      }
      if (isMax && v - lo >= 3) centers.push({ kind: 'H', lat: grid.lats[r], lon: grid.lons[c], value: v })
      if (isMin && hi - v >= 3) centers.push({ kind: 'T', lat: grid.lats[r], lon: grid.lons[c], value: v })
    }
  }
  return centers
}

/** Farbe für das 500-hPa-Geopotential: tief (kalt) = blau, hoch (warm) = rot. */
export function z500Color(dam: number): string {
  const t = Math.min(1, Math.max(0, (dam - 516) / (588 - 516)))
  return `hsl(${Math.round(240 * (1 - t))}, 75%, 55%)`
}

/** Werte für die Farblegende */
export const Z500_LEGEND = [520, 536, 552, 568, 584]

/** Index des Zeitpunkts, der „jetzt“ am nächsten liegt. */
export function nearestTimeIndex(times: number[], now: number): number {
  let best = 0
  times.forEach((t, i) => {
    if (Math.abs(t - now) < Math.abs(times[best] - now)) best = i
  })
  return best
}

/** Kurze Beschreibung der Lage über dem gewählten Ort (regelbasiert). */
export function describeSynoptic(grid: SynopticGrid, timeIndex: number, lat: number, lon: number): string | null {
  const cols = grid.lons.length
  const r = Math.round((grid.lats[0] - lat) / (grid.lats[0] - grid.lats[1]))
  const c = Math.round((lon - grid.lons[0]) / (grid.lons[1] - grid.lons[0]))
  if (r < 0 || c < 0 || r >= grid.lats.length || c >= cols) return null

  const p = grid.pressure[timeIndex][r * cols + c]
  const z = grid.z500[timeIndex][r * cols + c]
  const pText =
    p >= 1025 ? 'kräftiger Hochdruckeinfluss' : p >= 1015 ? 'Hochdruckeinfluss' : p >= 1005 ? 'flache Druckverteilung' : 'Tiefdruckeinfluss'
  const zText =
    z >= 576
      ? 'in der Höhe sehr warme Luft (Hochkeil) – meist stabil'
      : z >= 560
        ? 'in der Höhe eher milde Luft'
        : z >= 544
          ? 'in der Höhe eher kühle Luft'
          : 'in der Höhe kalte Luft (Trog) – eher unbeständig, Schauer möglich'
  return `Am Ort: ${Math.round(p)} hPa, ${pText}; 500 hPa in ${Math.round(z)} gpdm, ${zText}.`
}
