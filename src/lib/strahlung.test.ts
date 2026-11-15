import { describe, expect, it } from 'vitest'
import type { MultiModelForecast, Series } from '../types/forecast'
import type { DaySummary } from './daily'
import { PV_WIRKUNGSANTEIL, kwh, pvErtrag, strahlungStunden, strahlungTage } from './strahlung'

const H = 3600 * 1000
const DAY = Date.UTC(2026, 5, 21)
const day = { dayStart: DAY, startIndex: 0, endIndex: 24 } as DaySummary

/** 10 Stunden lang (7–17 Uhr) die angegebene Leistung in W/m², sonst 0 */
const taghell = (watt: number): Series => Array.from({ length: 24 }, (_, h) => (h >= 7 && h < 17 ? watt : 0))

function fc(extra: Record<string, Record<string, Series>>): MultiModelForecast {
  return { times: Array.from({ length: 24 }, (_, i) => DAY + i * H), extra } as unknown as MultiModelForecast
}

describe('strahlungTage', () => {
  it('rechnet W/m² je Stunde in kWh/m² am Tag um, mit Spanne der Modelle', () => {
    // Modell a: 10 h × 500 W/m² = 5 kWh/m², Modell b: 10 h × 700 W/m² = 7 kWh/m²
    const [tag] = strahlungTage(
      fc({
        shortwave_radiation: { a: taghell(500), b: taghell(700) },
        direct_radiation: { a: taghell(350), b: taghell(550) },
        diffuse_radiation: { a: taghell(150), b: taghell(150) },
      }),
      [day],
    )
    expect(tag.global).toBeCloseTo(6)
    expect(tag.globalMin).toBeCloseTo(5)
    expect(tag.globalMax).toBeCloseTo(7)
    expect(tag.direkt).toBeCloseTo(4.5)
    expect(tag.diffus).toBeCloseTo(1.5)
    expect(tag.spitze).toBeCloseTo(600)
    expect(tag.modelle).toBe(2)
    expect(tag.pvKwhJeKwp).toBeCloseTo(6 * PV_WIRKUNGSANTEIL)
  })

  it('lässt Modelle mit zu wenigen Stunden und Tage ohne Daten weg', () => {
    const kurz: Series = [...taghell(500).slice(0, 10), ...Array<null>(14).fill(null)]
    const tage = strahlungTage(fc({ shortwave_radiation: { a: taghell(400), kurz } }), [day])
    expect(tage[0].modelle).toBe(1)
    expect(tage[0].global).toBeCloseTo(4)
    expect(tage[0].direkt).toBeNull()
    expect(strahlungTage(fc({}), [day])).toEqual([])
  })
})

describe('strahlungStunden', () => {
  it('liefert je Stunde das Mittel der Modelle', () => {
    const stunden = strahlungStunden(fc({ shortwave_radiation: { a: taghell(500), b: taghell(700) } }), day)
    expect(stunden).toHaveLength(24)
    expect(stunden[12]).toEqual({ t: DAY + 12 * H, global: 600, direkt: null, diffus: null })
    expect(stunden[2].global).toBe(0)
  })
})

describe('Photovoltaik und Zahlenformat', () => {
  it('schätzt den Ertrag je kWp und schreibt Zahlen mit Komma', () => {
    expect(pvErtrag(3)).toBeCloseTo(2.4)
    expect(kwh(1.234)).toBe('1,2')
  })
})

describe('negative Werte', () => {
  it('zählt winzige negative Nachtwerte als 0', () => {
    const mitMinus: Series = taghell(500).map((v) => (v === 0 ? -3 : v))
    const f = fc({ shortwave_radiation: { a: mitMinus } })
    expect(strahlungTage(f, [day])[0].global).toBeCloseTo(5)
    expect(strahlungStunden(f, day)[2].global).toBe(0)
  })
})
