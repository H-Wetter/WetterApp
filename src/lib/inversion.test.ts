import { describe, expect, it } from 'vitest'
import { FOG_RH, analyzeProfile, distanceKm, type ProfilePoint } from './inversion'
import { statsForValues } from './statistics'
import { compassName, meanWindDirection } from './wind'

describe('analyzeProfile (Inversion aus dem Temperaturprofil)', () => {
  it('erkennt keine Inversion, wenn es nach oben normal kälter wird', () => {
    const profile: ProfilePoint[] = [
      { height: 360, temp: 10, rh: 60 },
      { height: 800, temp: 7, rh: 55 },
      { height: 1500, temp: 2, rh: 50 },
    ]
    expect(analyzeProfile(profile)).toBeNull()
  })

  it('erkennt eine Inversion mit Nebel vom Boden weg', () => {
    const profile: ProfilePoint[] = [
      { height: 362, temp: -2, rh: 98 },
      { height: 450, temp: -1.5, rh: 96 },
      { height: 700, temp: 3, rh: 60 },
      { height: 1500, temp: 4, rh: 40 },
    ]
    const r = analyzeProfile(profile)
    expect(r).not.toBeNull()
    expect(r?.strength).toBeCloseTo(6)
    expect(r?.fogFromGround).toBe(true)
    // Nebelobergrenze zwischen 450 m (96 %) und 700 m (60 %)
    expect(r?.fogTop).toBeGreaterThan(450)
    expect(r?.fogTop).toBeLessThan(700)
  })

  it('zählt Feuchte ab FOG_RH (90 %) als Nebel – auch wenn die Modelle die Feuchte unterschätzen', () => {
    expect(FOG_RH).toBe(90)
    const profile: ProfilePoint[] = [
      { height: 362, temp: -1, rh: 91 },
      { height: 700, temp: 3, rh: 50 },
    ]
    expect(analyzeProfile(profile)?.fogTop).not.toBeNull()
  })

  it('ignoriert winzige Erwärmungen (Rauschen unter 0,5 °C)', () => {
    const profile: ProfilePoint[] = [
      { height: 362, temp: 5, rh: 70 },
      { height: 500, temp: 5.3, rh: 70 },
      { height: 1500, temp: -1, rh: 60 },
    ]
    expect(analyzeProfile(profile)).toBeNull()
  })
})

describe('distanceKm', () => {
  it('rechnet Graz – Schöckl richtig (rund 15 km)', () => {
    expect(distanceKm(47.07, 15.44, 47.2, 15.47)).toBeCloseTo(14.6, 0)
  })
})

describe('statsForValues (Modellstatistik)', () => {
  it('ignoriert null und rechnet Mittelwert, Median, Min/Max', () => {
    const s = statsForValues([2, null, 4, 9, undefined])
    expect(s).toEqual({ mean: 5, median: 4, min: 2, max: 9, count: 3 })
  })

  it('liefert nur null, wenn kein Modell einen Wert hat', () => {
    expect(statsForValues([null, null]).count).toBe(0)
  })
})

describe('Wind', () => {
  it('benennt Richtungen', () => {
    expect(compassName(225)).toBe('SW')
    expect(compassName(359)).toBe('N')
  })

  it('mittelt Richtungen über 0° hinweg richtig (350° und 10° → Nord)', () => {
    const r = meanWindDirection([
      { direction: 350, speed: 10 },
      { direction: 10, speed: 10 },
    ])
    expect(r.name).toBe('N')
  })

  it('meldet „still“ bei sehr schwachem Wind', () => {
    expect(meanWindDirection([{ direction: 90, speed: 1 }]).name).toBe('still')
  })
})
