import { describe, expect, it } from 'vitest'
import type { MultiModelForecast } from '../types/forecast'
import { dailyExtremes, middayTicks, nightSpans, type ChartRow } from './chartData'

const H = 3_600_000
const DAY = Date.parse('2026-11-09T00:00:00Z') // Ortszeit als UTC

/** 48 Stunden, Tag von 7 bis 17 Uhr, Temperatur: Sinuskurve mit Höchstwert um 14 Uhr */
const times = Array.from({ length: 48 }, (_, i) => DAY + i * H)
const isDay = times.map((t) => {
  const h = new Date(t).getUTCHours()
  return h >= 7 && h < 17 ? 1 : 0
})

describe('nightSpans', () => {
  it('fasst Nachtstunden zu Abschnitten zusammen (Mehrheit der Modelle)', () => {
    const fc = {
      times,
      availableModels: ['a', 'b', 'c'],
      // Modell c ist anderer Meinung – die Mehrheit zählt
      data: { is_day: { a: isDay, b: isDay, c: times.map(() => 1) } },
    } as unknown as MultiModelForecast
    expect(nightSpans(fc)).toEqual([
      [DAY, DAY + 7 * H],
      [DAY + 17 * H, DAY + 31 * H],
      [DAY + 41 * H, DAY + 48 * H],
    ])
  })
})

describe('middayTicks', () => {
  it('setzt die Tagesnamen auf 12 Uhr', () => {
    expect(middayTicks(DAY, DAY + 47 * H)).toEqual([DAY + 12 * H, DAY + 36 * H])
  })
})

describe('dailyExtremes', () => {
  const rows: ChartRow[] = times.map((t) => {
    const h = new Date(t).getUTCHours()
    return { t, mean: 10 * Math.sin(((h - 8) / 24) * 2 * Math.PI), median: null, band: null, count: 2 }
  })

  it('findet Höchst- und Tiefstwert je Tag', () => {
    const ex = dailyExtremes(rows)
    const firstMax = ex.find((e) => e.kind === 'max')
    expect(firstMax?.value).toBeCloseTo(10)
    expect(new Date(firstMax?.t ?? 0).getUTCHours()).toBe(14)
    expect(ex.filter((e) => e.kind === 'min')).toHaveLength(2)
  })

  it('beschriftet angebrochene Tage am Rand nicht', () => {
    expect(dailyExtremes(rows.slice(0, 30))).toHaveLength(2) // nur der volle erste Tag
  })
})
