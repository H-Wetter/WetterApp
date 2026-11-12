import { describe, expect, it } from 'vitest'
import type { DaySummary } from './daily'
import { dayConfidence, precipRange, temperatureHue } from './dayDisplay'

const stats = (mean: number | null, min: number | null, max: number | null, count = 15) => ({ mean, median: mean, min, max, count })

/** Tag mit nur den Werten, die die Funktionen brauchen */
function day(overrides: Partial<DaySummary>): DaySummary {
  return {
    tempMax: stats(10, 9, 11),
    precipSum: stats(0, 0, 0),
    precipShare: 0,
    modelCount: 15,
    ...overrides,
  } as DaySummary
}

describe('temperatureHue', () => {
  it('geht von violett (kalt) über grün bis rot (heiß)', () => {
    expect(temperatureHue(-20)).toBe(270)
    expect(temperatureHue(35)).toBe(0)
    expect(temperatureHue(10)).toBeGreaterThan(temperatureHue(20))
  })
})

describe('dayConfidence', () => {
  it('gibt 4 Punkte, wenn sich die Modelle einig sind', () => {
    expect(dayConfidence(day({}))).toBe(4)
  })

  it('zieht Punkte ab für große Temperaturspanne, Regen-Uneinigkeit und wenige Modelle', () => {
    expect(dayConfidence(day({ tempMax: stats(10, 6, 12) }))).toBe(2)
    expect(dayConfidence(day({ tempMax: stats(10, 6, 12), precipShare: 0.5, modelCount: 3 }))).toBe(1)
  })
})

describe('precipRange', () => {
  it('zeigt trockene Tage als null', () => {
    expect(precipRange(day({}))).toBeNull()
  })

  it('zeigt die Spanne der Modelle', () => {
    expect(precipRange(day({ precipSum: stats(3.4, 1.6, 5.2) }))).toBe('2–5 mm')
  })

  it('zeigt bei Einigkeit nur den Mittelwert', () => {
    expect(precipRange(day({ precipSum: stats(0.8, 0.5, 1.1) }))).toBe('0,8 mm')
  })
})
