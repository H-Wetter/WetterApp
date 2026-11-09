import { describe, expect, it } from 'vitest'
import type { HourlyVariable, MultiModelForecast, Series } from '../types/forecast'
import { describeDayCourse } from './tagesverlauf'

const DAY = Date.parse('2026-11-09T00:00:00Z') // Ortszeit „als UTC gelesen“
const HOUR = 60 * 60 * 1000

/**
 * Künstliche Vorhersage für einen Tag mit zwei gleichen Modellen:
 * sonnig, trocken, schwacher Wind, keine Nebel-Codes – die Modelle sehen also KEINEN Nebel.
 */
function sunnyDay(overrides: Partial<Record<HourlyVariable, number>> = {}): MultiModelForecast {
  const values: Record<HourlyVariable, number> = {
    temperature_2m: 5,
    precipitation: 0,
    wind_speed_10m: 5,
    wind_gusts_10m: 10,
    weather_code: 0,
    cloud_cover: 5,
    snowfall: 0,
    is_day: 1,
    apparent_temperature: 4,
    sunshine_duration: 3600,
    precipitation_probability: 0,
    wind_direction_10m: 180,
    ...overrides,
  }
  const models = ['a', 'b']
  const series = (v: number): Record<string, Series> => Object.fromEntries(models.map((m) => [m, Array<number>(24).fill(v)]))
  const data = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, series(v)])) as MultiModelForecast['data']
  return {
    times: Array.from({ length: 24 }, (_, i) => DAY + i * HOUR),
    utcOffsetSeconds: 3600,
    data,
    availableModels: models,
    lastIndex: { a: 23, b: 23 },
    sun: [],
    extra: {},
  }
}

describe('describeDayCourse – Tagesverlauf in Worten', () => {
  it('liefert vier Abschnitte mit je höchstens 3 Sätzen', () => {
    const periods = describeDayCourse({ forecast: sunnyDay(), startIndex: 0 })
    expect(periods.map((p) => p.label)).toEqual(['Vormittag', 'Mittag', 'Nachmittag', 'Abend'])
    for (const p of periods) expect(p.valley.length).toBeLessThanOrEqual(3)
  })

  it('beschreibt ohne Messung keinen Nebel, wenn die Modelle keinen sehen', () => {
    const vormittag = describeDayCourse({ forecast: sunnyDay(), startIndex: 0 })[0]
    expect(vormittag.valley.join(' ')).not.toMatch(/Nebel/)
  })

  it('beschreibt gemessenen Nebel im passenden Abschnitt – auch wenn die Modelle trocken sind', () => {
    // Nebel gemessen um 8 Uhr, gilt bis 11 Uhr → betrifft den Vormittag (6–11), nicht den Nachmittag
    const measuredFog = { from: DAY + 8 * HOUR, to: DAY + 11 * HOUR, humidity: 98 }
    const periods = describeDayCourse({ forecast: sunnyDay(), startIndex: 0, measuredFog })
    expect(periods[0].valley.join(' ')).toMatch(/Nebel.*98 %/)
    expect(periods[0].valley.length).toBeLessThanOrEqual(3)
    expect(periods[2].valley.join(' ')).not.toMatch(/Nebel/)
  })

  it('lässt bei Regen den gemessenen Nebel weg (Regen hat Vorrang)', () => {
    const measuredFog = { from: DAY + 8 * HOUR, to: DAY + 11 * HOUR, humidity: 98 }
    const vormittag = describeDayCourse({ forecast: sunnyDay({ precipitation: 1, cloud_cover: 100, weather_code: 61 }), startIndex: 0, measuredFog })[0]
    expect(vormittag.valley.join(' ')).not.toMatch(/98 %/)
  })
})
