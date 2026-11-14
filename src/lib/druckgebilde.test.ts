import { describe, expect, it } from 'vitest'
import type { EuropeGrid } from '../types/grosswetterlage'
import { centerText, distanceKm, findPressureCenters, lageInWorten, timeIndexForDay } from './druckgebilde'

/** Raster wie in der App: 65–35° N, 15° W–35° O, alle 2,5° */
const LATS = Array.from({ length: 13 }, (_, i) => 65 - i * 2.5)
const LONS = Array.from({ length: 21 }, (_, i) => -15 + i * 2.5)

interface Bump {
  lat: number
  lon: number
  /** Abweichung im Kern in hPa (negativ = Tief) */
  hPa: number
  /** Breite der Glocke in Grad */
  width?: number
}

/** Erfundenes Druckfeld: überall 1015 hPa, dazu glockenförmige Hochs und Tiefs. */
function grid(bumps: Bump[]): EuropeGrid {
  const pressure = LATS.flatMap((lat) =>
    LONS.map((lon) => bumps.reduce((p, b) => p + b.hPa * Math.exp(-((lat - b.lat) ** 2 + (lon - b.lon) ** 2) / (2 * (b.width ?? 5) ** 2)), 1015)),
  )
  return { lats: LATS, lons: LONS, times: [0], pressure: [pressure], z500: [pressure.map(() => null)], fetchedAt: 0 }
}

describe('distanceKm', () => {
  it('Graz–Wien sind rund 145 km', () => {
    expect(distanceKm(47.07, 15.44, 48.21, 16.37)).toBeGreaterThan(135)
    expect(distanceKm(47.07, 15.44, 48.21, 16.37)).toBeLessThan(155)
  })
})

describe('lageInWorten', () => {
  it('benennt bekannte Gebiete', () => {
    expect(lageInWorten(45, -5)).toBe('über der Biskaya')
    expect(lageInWorten(52.5, 20)).toBe('über Polen')
    expect(lageInWorten(45, 10)).toBe('über Oberitalien')
    expect(lageInWorten(42.5, 15)).toBe('über der Adria')
    expect(lageInWorten(65, -15)).toBe('bei Island')
    expect(lageInWorten(57.5, 2.5)).toBe('über der Nordsee')
  })
})

describe('findPressureCenters', () => {
  it('findet ein Tief über der Biskaya und ein Hoch über Polen', () => {
    const centers = findPressureCenters(
      grid([
        { lat: 45, lon: -5, hPa: -20 },
        { lat: 52.5, lon: 20, hPa: 15 },
      ]),
      0,
    )
    expect(centers).toHaveLength(2)
    const tief = centers.find((c) => c.kind === 'T')
    const hoch = centers.find((c) => c.kind === 'H')
    expect(tief && centerText(tief)).toBe('Tief über der Biskaya, 995 hPa')
    expect(hoch && centerText(hoch)).toBe('Hoch über Polen, 1030 hPa')
    // Polen liegt näher an Österreich als die Biskaya: Das Hoch steht zuerst.
    expect(centers[0].kind).toBe('H')
  })

  it('übergeht schwache Dellen', () => {
    expect(findPressureCenters(grid([{ lat: 50, lon: 10, hPa: -1.5 }]), 0)).toHaveLength(0)
  })

  it('macht aus einem flachen Kern (zwei gleiche Nachbarpunkte) nur ein Tief', () => {
    // Kern genau zwischen zwei Rasterpunkten: beide haben denselben Druck
    const centers = findPressureCenters(grid([{ lat: 50, lon: 8.75, hPa: -15 }]), 0)
    expect(centers).toHaveLength(1)
    expect(centers[0].kind).toBe('T')
  })

  it('kennzeichnet Kerne am Rand des Rasters', () => {
    const centers = findPressureCenters(grid([{ lat: 65, lon: -15, hPa: -30 }]), 0)
    expect(centers).toHaveLength(1)
    expect(centers[0].amRand).toBe(true)
    expect(centers[0].lage).toBe('bei Island')
  })

  it('hält einen Randpunkt neben einem Tief nicht für ein Hoch', () => {
    // Die Ecke im Südwesten ist hier der höchste Punkt weit und breit, aber mit 1015 hPa kein Hoch.
    const centers = findPressureCenters(grid([{ lat: 45, lon: -5, hPa: -20 }]), 0)
    expect(centers.map((c) => c.kind)).toEqual(['T'])
  })

  it('kommt mit Lücken und fehlendem Zeitpunkt zurecht', () => {
    const g = grid([{ lat: 45, lon: -5, hPa: -20 }])
    g.pressure[0][0] = null
    expect(findPressureCenters(g, 0)).toHaveLength(1)
    expect(findPressureCenters(g, 5)).toEqual([])
  })
})

describe('timeIndexForDay', () => {
  const H = 3600 * 1000
  const day = Date.UTC(2026, 10, 13)
  // alle 6 Stunden ab Mitternacht, 2 Tage
  const times = Array.from({ length: 8 }, (_, i) => day + i * 6 * H)

  it('nimmt 12 Uhr UTC des Tages', () => {
    expect(timeIndexForDay(times, day)).toBe(2)
    expect(timeIndexForDay(times, day + 24 * H)).toBe(6)
  })

  it('meldet -1 für einen Tag außerhalb des Rasters', () => {
    expect(timeIndexForDay(times, day + 5 * 24 * H)).toBe(-1)
    expect(timeIndexForDay([], day)).toBe(-1)
  })
})

describe('Normaldruck als Grenze', () => {
  it('nennt eine Kuppe unter 1013 hPa nicht Hoch und eine Delle darüber nicht Tief', () => {
    // Überall 1000 hPa, in der Mitte eine Kuppe mit 1006 hPa
    const kuppe = grid([{ lat: 50, lon: 10, hPa: 6 }])
    kuppe.pressure[0] = kuppe.pressure[0].map((p) => (p === null ? null : p - 15))
    expect(findPressureCenters(kuppe, 0)).toHaveLength(0)
    // Überall 1030 hPa, in der Mitte eine Delle mit 1022 hPa
    const delle = grid([{ lat: 50, lon: 10, hPa: -8 }])
    delle.pressure[0] = delle.pressure[0].map((p) => (p === null ? null : p + 15))
    expect(findPressureCenters(delle, 0)).toHaveLength(0)
  })
})
