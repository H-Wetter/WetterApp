import { describe, expect, it } from 'vitest'
import { ORTE_OESTERREICH } from '../data/orte-oesterreich'
import type { MultiModelForecast } from '../types/forecast'
import { dailyWeatherCode, dayOverview, hauptstadtVon, ortAlsStandort, labelSize, leaderEnd, modeHigher, placeLabels, type LabelBox, type PlaceDay } from './austria'
import { MAP_HEIGHT, MAP_WIDTH, MOBILE_BAND, MOBILE_HEIGHT, buildAustriaMap } from './austriaMap'

describe('modeHigher', () => {
  it('nimmt den häufigsten Wert, bei Gleichstand den größeren', () => {
    expect(modeHigher([1, 1, 3])).toBe(1)
    expect(modeHigher([2, 61, 2, 61])).toBe(61)
    expect(modeHigher([])).toBeNull()
  })
})

describe('dailyWeatherCode', () => {
  /** 24 Stunden je Modell; Codes tagsüber wie angegeben, nachts Nebel (45) */
  function fc(byModel: Record<string, number>): MultiModelForecast {
    const weather_code = Object.fromEntries(
      Object.entries(byModel).map(([id, code]) => [id, Array.from({ length: 24 }, (_, h) => (h >= 6 && h < 18 ? code : 45))]),
    )
    return { availableModels: Object.keys(byModel), data: { weather_code } } as unknown as MultiModelForecast
  }

  it('zählt nur die Stunden 6–18 Uhr (nächtlicher Nebel bleibt außen vor)', () => {
    expect(dailyWeatherCode(fc({ a: 1, b: 1 }), 0)).toBe(1)
  })

  it('nimmt über die Modelle den häufigsten Code', () => {
    expect(dailyWeatherCode(fc({ a: 3, b: 3, c: 61 }), 0)).toBe(3)
  })

  it('nimmt bei Gleichstand den schwereren Code', () => {
    expect(dailyWeatherCode(fc({ a: 3, b: 61 }), 0)).toBe(61)
  })

  it('macht aus einem einzelnen Schauer am Abend keinen Regentag', () => {
    const f = fc({ a: 2 })
    f.data.weather_code.a[17] = 80
    expect(dailyWeatherCode(f, 0)).toBe(2)
  })
})

describe('placeLabels (keine Überlappung)', () => {
  /** Marker wie in der App: „12°/3°“ über dem Symbol, bei gegebener Schriftgröße (SVG-Einheiten) */
  function boxes(font: number, height: number, band: number): LabelBox[] {
    const map = buildAustriaMap(MAP_WIDTH, height, band)
    return ORTE_OESTERREICH.map((o) => {
      const p = map.project(o.longitude, o.latitude)
      if (!p) throw new Error(`${o.name} liegt außerhalb der Karte`)
      // ungünstigster Fall bei den Temperaturen: „−12°/−13°“
      const { w, h, anchorY } = labelSize('−12°/−13°', font)
      return { id: o.id, x: p[0], y: p[1], w, h, anchorY }
    })
  }

  function check(font: number, height = MAP_HEIGHT, band = 0) {
    const items = boxes(font, height, band)
    const placed = placeLabels(items, MAP_WIDTH, height)
    for (let i = 0; i < placed.length; i++) {
      const a = placed[i]
      expect(a.left).toBeGreaterThanOrEqual(0)
      expect(a.top).toBeGreaterThanOrEqual(0)
      expect(a.left + a.w).toBeLessThanOrEqual(MAP_WIDTH)
      expect(a.top + a.h).toBeLessThanOrEqual(height)
      for (let j = i + 1; j < placed.length; j++) {
        const b = placed[j]
        const apart = a.left + a.w <= b.left || b.left + b.w <= a.left || a.top + a.h <= b.top || b.top + b.h <= a.top
        expect(apart, `${a.id} und ${b.id} überlappen`).toBe(true)
      }
      // Linien kurz halten: höchstens gut zwei Markergrößen vom Ort entfernt
      const ort = items.find((x) => x.id === a.id) as LabelBox
      const dist = Math.hypot(a.left + a.w / 2 - ort.x, a.top + a.h / 2 - ort.y)
      expect(dist, `${a.id} ist zu weit vom Ort weg`).toBeLessThanOrEqual(2.2 * Math.max(a.w, a.h) + 1)
      // Verbindungslinie darf durch keine andere Beschriftung laufen
      if (a.leader) {
        const it = items.find((x) => x.id === a.id) as LabelBox
        const [ex, ey] = leaderEnd(a, it.x, it.y)
        for (const b of placed) {
          if (b === a) continue
          for (let k = 1; k < 16; k++) {
            const x = it.x + ((ex - it.x) * k) / 16
            const y = it.y + ((ey - it.y) * k) / 16
            const inside = x > b.left && x < b.left + b.w && y > b.top && y < b.top + b.h
            expect(inside, `Linie von ${a.id} läuft durch ${b.id}`).toBe(false)
          }
        }
      }
    }
  }

  it('Computer (Karte ca. 700 px breit, Schrift 16 px)', () => check(16 * (MAP_WIDTH / 700)))

  it('setzt am Computer die meisten Marker direkt auf den Ort', () => {
    const placed = placeLabels(boxes(16 * (MAP_WIDTH / 700), MAP_HEIGHT, 0), MAP_WIDTH, MAP_HEIGHT)
    // im Osten (Wien, St. Pölten, Eisenstadt) müssen einige wegrücken
    expect(placed.filter((p) => p.onPoint).length).toBeGreaterThanOrEqual(6)
  })
  it('Handy (Karte ca. 340 px breit, Schrift 13 px)', () => check(13 * (MAP_WIDTH / 340), MOBILE_HEIGHT, MOBILE_BAND))
  it('kleines Handy (Karte ca. 290 px breit, Schrift 12 px)', () => check(12 * (MAP_WIDTH / 290), MOBILE_HEIGHT, MOBILE_BAND))

  // Alle schmalen Breiten wie in der App (unter 330 px Schrift 12, sonst 13), damit es nicht nur zufällig passt
  for (let px = 290; px < 560; px += 10) {
    it(`Handy ${px} px breit`, () => check((px < 330 ? 12 : 13) * (MAP_WIDTH / px), MOBILE_HEIGHT, MOBILE_BAND))
  }
  for (let px = 560; px <= 1000; px += 40) {
    it(`Computer ${px} px breit`, () => check(16 * (MAP_WIDTH / px)))
  }
})

describe('dayOverview (Symbol der Tagesauswahl)', () => {
  const d = (dayStart: number, code: number | null): PlaceDay => ({ dayStart, code, max: 10, min: 2 })
  it('nimmt je Tag das häufigste Symbol über alle Orte, bei Gleichstand das schwerere', () => {
    const perPlace = [
      [d(0, 3), d(1, 0)],
      [d(0, 3), d(1, 61)],
      [d(0, 61), d(1, null)],
    ]
    expect(dayOverview(perPlace, 7)).toEqual([
      { dayStart: 0, code: 3 },
      { dayStart: 1, code: 61 },
    ])
  })
})

describe('Bundesland → Ort und „Mehr Details“', () => {
  it('findet zur Steiermark Graz (nicht Ramsau)', () => {
    expect(hauptstadtVon('St', ORTE_OESTERREICH)?.id).toBe('graz')
    expect(hauptstadtVon('W', ORTE_OESTERREICH)?.name).toBe('Wien')
  })

  it('macht aus Ramsau einen Standort für „Lokal“ mit Höhe und Bundesland', () => {
    const ramsau = ORTE_OESTERREICH.find((o) => o.id === 'ramsau')
    if (!ramsau) throw new Error('Ramsau fehlt')
    expect(ortAlsStandort(ramsau)).toMatchObject({ name: 'Ramsau am Dachstein', elevation: 1123, region: 'Steiermark', source: 'search' })
  })
})
