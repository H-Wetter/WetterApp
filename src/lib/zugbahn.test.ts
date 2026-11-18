import { describe, expect, it } from 'vitest'
import type { EuropeGrid } from '../types/grosswetterlage'
import { findPressureCenters } from './druckgebilde'
import { richtungGrad, zugbahn, zugText } from './zugbahn'

const H = 3600 * 1000
const DAY = Date.UTC(2026, 10, 18)
const LATS = Array.from({ length: 13 }, (_, i) => 65 - i * 2.5)
const LONS = Array.from({ length: 21 }, (_, i) => -15 + i * 2.5)

/** Raster alle 6 Stunden; je Zeitpunkt ein Kern (Tief: −18 hPa, Hoch: +15 hPa) an der Stelle oder keiner */
function raster(bahn: ([number, number] | null)[], art: 'T' | 'H' = 'T'): EuropeGrid {
  const times = bahn.map((_, i) => DAY + i * 6 * H)
  const amp = art === 'T' ? -18 : 15
  const pressure = bahn.map((pos) =>
    LATS.flatMap((lat) => LONS.map((lon) => (pos ? 1013 + amp * Math.exp(-((lat - pos[0]) ** 2 + (lon - pos[1]) ** 2) / 32) : 1013))),
  )
  return { lats: LATS, lons: LONS, times, pressure, z500: pressure.map((row) => row.map(() => null)), fetchedAt: 0 }
}

function erster(grid: EuropeGrid) {
  const c = findPressureCenters(grid, 0)[0]
  if (!c) throw new Error('kein Kern im Testraster')
  return c
}

describe('richtungGrad', () => {
  it('kennt die Himmelsrichtungen', () => {
    expect(richtungGrad(50, 10, 55, 10)).toBeCloseTo(0, 0)
    expect(richtungGrad(0, 10, 0, 20)).toBeCloseTo(90, 0)
    expect(richtungGrad(50, 10, 45, 10)).toBeCloseTo(180, 0)
  })
})

describe('zugbahn', () => {
  it('Tief zieht von der Nordsee nach Osten über die Ostsee', () => {
    const grid = raster([[55, 5], [55, 7.5], [55, 10], [55, 12.5], [55, 15], [55, 17.5]])
    const z = zugbahn(grid, 0, erster(grid))!
    expect(z.punkte.length).toBe(5) // Start + 4 Schritte in 24 Stunden
    expect(z.stunden).toBe(24)
    expect(z.ortsfest).toBe(false)
    expect(z.richtungGrad!).toBeGreaterThan(70)
    expect(z.richtungGrad!).toBeLessThan(100)
    // 10° Länge bei 55° Nord sind rund 640 km → rund 25 km/h
    expect(zugText(z)).toBe('zieht nach Osten (rund 25 km/h)')
  })

  it('Hoch, das liegen bleibt, ist ortsfest', () => {
    const grid = raster([[50, 0], [50, 0], [50, 2.5], [50, 2.5], [50, 2.5]], 'H')
    const z = zugbahn(grid, 0, erster(grid))!
    expect(z.ortsfest).toBe(true)
    expect(zugText(z)).toBe('liegt fast still')
  })

  it('verfolgt keinen anderen Kern, der weit weg auftaucht', () => {
    // Tief über Irland, danach nur noch ein Tief über dem Schwarzen Meer
    const grid = raster([[52.5, -7.5], [42.5, 32.5], [42.5, 32.5]])
    const z = zugbahn(grid, 0, erster(grid))!
    expect(z.verloren).toBe(true)
    expect(zugText(z)).toBe('schwächt sich ab oder zieht aus dem Ausschnitt')
  })

  it('Tief über Oberitalien zieht nach Nordosten (Vb)', () => {
    const grid = raster([[45, 10], [45, 12.5], [47.5, 15], [47.5, 17.5], [50, 20]])
    const z = zugbahn(grid, 0, erster(grid))!
    expect(zugText(z)).toMatch(/^zieht nach Nordosten/)
  })

  it('am letzten Zeitpunkt des Rasters gibt es keine Zugbahn', () => {
    const grid = raster([[55, 5], [55, 7.5]])
    expect(zugbahn(grid, 1, findPressureCenters(grid, 1)[0])).toBeNull()
  })
})
