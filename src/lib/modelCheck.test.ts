import { describe, expect, it } from 'vitest'
import type { PreviousDayForecast } from '../types/forecast'
import { MEAN_ID, MIN_HOURS, biasText, scoreModels } from './modelCheck'

const HOUR = 3_600_000
const START = Date.parse('2026-11-06T00:00:00Z') // Ortszeit als UTC (Graz, UTC+1)
const OFFSET = 3600

/** 48 Stunden: gemessen immer 2 °C; Modell „gut“ sagt 2,5 °C, „kalt“ sagt 0 °C, „kurz“ hat nur 10 Stunden. */
function setup() {
  const n = 48
  const times = Array.from({ length: n }, (_, i) => START + i * HOUR)
  const prev: PreviousDayForecast = {
    times,
    utcOffsetSeconds: OFFSET,
    temps: {
      gut: times.map(() => 2.5),
      kalt: times.map(() => 0),
      kurz: times.map((_, i) => (i < 10 ? 2 : null)),
    },
  }
  // Messung in echter UTC-Zeit: Ortszeit − 1 Stunde
  const measured = new Map(times.map((t) => [t - OFFSET * 1000, 2]))
  return { prev, measured }
}

describe('scoreModels (Modell-Check)', () => {
  it('sortiert das genaueste Modell nach vorne und rechnet die Abweichung richtig', () => {
    const { prev, measured } = setup()
    const scores = scoreModels(prev, measured)
    expect(scores[0].modelId).toBe('gut')
    expect(scores[0].mae).toBeCloseTo(0.5)
    expect(scores[0].bias).toBeCloseTo(0.5)
    const kalt = scores.find((s) => s.modelId === 'kalt')
    expect(kalt?.bias).toBeCloseTo(-2)
    expect(kalt?.hours).toBe(48)
  })

  it(`bewertet Modelle mit weniger als ${MIN_HOURS} Stunden nicht`, () => {
    const { prev, measured } = setup()
    expect(scoreModels(prev, measured).some((s) => s.modelId === 'kurz')).toBe(false)
  })

  it('bewertet auch den Mittelwert aller Modelle', () => {
    const { prev, measured } = setup()
    const mean = scoreModels(prev, measured).find((s) => s.modelId === MEAN_ID)
    // Stunden mit allen drei Modellen: Mittel (2,5+0+2)/3 = 1,5; danach (2,5+0)/2 = 1,25
    expect(mean).toBeDefined()
    expect(mean?.bias).toBeLessThan(0)
  })

  it('gleicht die Zeitzone richtig ab (ohne Umrechnung gäbe es keine Paare)', () => {
    const { prev } = setup()
    const wrong = new Map(prev.times.map((t) => [t + 30 * 60 * 1000, 2])) // halbe Stunde daneben
    expect(scoreModels(prev, wrong)).toEqual([])
  })
})

describe('biasText', () => {
  it('beschreibt die Tendenz', () => {
    expect(biasText(0.2)).toBe('ausgeglichen')
    expect(biasText(1.24)).toBe('zu warm (+1,2 °C)')
    expect(biasText(-2)).toBe('zu kalt (−2,0 °C)')
  })
})
