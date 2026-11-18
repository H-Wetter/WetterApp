import { describe, expect, it } from 'vitest'
import { ORTE_EUROPA } from '../data/orte-europa'
import { labelSize, placeLabels, type LabelBox } from './austria'
import { EUROPA_NARROW_PX, EUROPA_MAP_HEIGHT, EUROPA_MAP_WIDTH, EUROPA_MOBILE_BAND, EUROPA_MOBILE_HEIGHT, hauptstadtVonLand, landName, ortEuropaAlsStandort } from './europa'
import { EUROPA_LAENDER, buildEuropaKarte } from './europaMap'

describe('Europa-Karte', () => {
  it('hat jedes Land der Hauptstädte in der Kartendatei', () => {
    for (const o of ORTE_EUROPA) expect(landName(o.land), o.name).toBeDefined()
  })

  it('zeichnet die Krim als Teil der Ukraine', () => {
    const map = buildEuropaKarte(EUROPA_MAP_WIDTH, EUROPA_MAP_HEIGHT)
    const ukr = EUROPA_LAENDER.features.find((f) => f.properties.id === 'UKR')
    const rus = EUROPA_LAENDER.features.find((f) => f.properties.id === 'RUS')
    const rings = (f: typeof ukr) =>
      f ? (f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map((p) => p[0])) : []
    const has = (f: typeof ukr) => rings(f).some((r) => r.some(([lon, lat]) => lon > 33 && lon < 34 && lat > 44.3 && lat < 44.7))
    expect(has(ukr)).toBe(true)
    expect(has(rus)).toBe(false)
    expect(map.laender.length).toBe(EUROPA_LAENDER.features.length)
  })

  it('findet die Hauptstadt eines Landes und macht daraus einen Standort', () => {
    const paris = hauptstadtVonLand('FRA', ORTE_EUROPA)
    expect(paris?.name).toBe('Paris')
    expect(hauptstadtVonLand('LUX', ORTE_EUROPA)).toBeUndefined()
    expect(ortEuropaAlsStandort(paris!).country).toBe('Frankreich')
  })
})

describe('Europa-Karte: Beschriftungen ohne Überlappung', () => {
  function check(font: number, height: number, band: number, narrow: boolean) {
    const map = buildEuropaKarte(EUROPA_MAP_WIDTH, height, band)
    const orte = narrow ? ORTE_EUROPA.filter((o) => !o.nurBreit) : ORTE_EUROPA
    const items: LabelBox[] = orte.map((o) => {
      const p = map.project(o.longitude, o.latitude)
      if (!p) throw new Error(`${o.name} liegt außerhalb der Karte`)
      expect(p[0], o.name).toBeGreaterThan(0)
      expect(p[0], o.name).toBeLessThan(EUROPA_MAP_WIDTH)
      expect(p[1], o.name).toBeGreaterThan(band)
      expect(p[1], o.name).toBeLessThan(height - band)
      const { w, h, anchorY } = labelSize('−12°/−13°', font)
      return { id: o.id, x: p[0], y: p[1], w, h, anchorY }
    })
    const placed = placeLabels(items, EUROPA_MAP_WIDTH, height)
    for (let i = 0; i < placed.length; i++) {
      const a = placed[i]
      expect(a.left).toBeGreaterThanOrEqual(0)
      expect(a.top).toBeGreaterThanOrEqual(0)
      expect(a.left + a.w).toBeLessThanOrEqual(EUROPA_MAP_WIDTH)
      expect(a.top + a.h).toBeLessThanOrEqual(height)
      for (let j = i + 1; j < placed.length; j++) {
        const b = placed[j]
        const apart = a.left + a.w <= b.left || b.left + b.w <= a.left || a.top + a.h <= b.top || b.top + b.h <= a.top
        expect(apart, `${a.id} und ${b.id} überlappen`).toBe(true)
      }
    }
  }

  it('zeigt am Handy 14 Hauptstädte', () => expect(ORTE_EUROPA.filter((o) => !o.nurBreit).length).toBe(14))
  // gleiche Schriftgrößen wie in der Karte: schmal 12 bzw. 13 px, breit 16 px
  for (let px = 290; px < EUROPA_NARROW_PX; px += 20) {
    it(`schmal ${px} px breit`, () => check((px < 330 ? 12 : 13) * (EUROPA_MAP_WIDTH / px), EUROPA_MOBILE_HEIGHT, EUROPA_MOBILE_BAND, true))
  }
  for (let px = EUROPA_NARROW_PX; px <= 1100; px += 20) {
    it(`breit ${px} px`, () => check(16 * (EUROPA_MAP_WIDTH / px), EUROPA_MAP_HEIGHT, 0, false))
  }
})
