import { describe, expect, it } from 'vitest'
import { ALPENPUNKTE, type Alpenpunkt } from '../data/alpenpunkte'
import type { AlpenDaten, AlpenVariable } from '../types/grosswetterlage'
import {
  analyseLuftmasse,
  analyseStroemung,
  findeFront,
  frontText,
  hoehenstroemung,
  luftmasseText,
  richtungName,
  stroemungText,
  tageszeit,
  winkelDifferenz,
} from './stroemung'

const H = 3600 * 1000
/** Freitag, 13.11.2026, Mitternacht */
const DAY = Date.UTC(2026, 10, 13)
/** alle 3 Stunden, von 2 Tagen davor bis 2 Tage danach */
const TIMES = Array.from({ length: 5 * 8 }, (_, i) => DAY - 48 * H + i * 3 * H)

type Feld = (punkt: Alpenpunkt, time: number) => number | null

/** Erfundene Daten: Jede Variable ist eine Funktion von Ort und Zeit, für alle Modelle gleich. */
function daten(felder: Partial<Record<AlpenVariable, Feld>>, models = ['a', 'b']): AlpenDaten {
  const werte: AlpenDaten['werte'] = {}
  for (const p of ALPENPUNKTE) {
    werte[p.id] = {}
    for (const m of models) {
      const perVariable = {} as Record<AlpenVariable, (number | null)[]>
      for (const [variable, feld] of Object.entries(felder) as [AlpenVariable, Feld][]) perVariable[variable] = TIMES.map((t) => feld(p, t))
      werte[p.id][m] = perVariable
    }
  }
  return { times: TIMES, models, werte }
}

describe('winkelDifferenz', () => {
  it('rechnet über Nord hinweg', () => {
    expect(winkelDifferenz(350, 10)).toBe(20)
    expect(winkelDifferenz(225, 315)).toBe(90)
  })
})

describe('hoehenstroemung', () => {
  const ti = TIMES.indexOf(DAY + 12 * H)

  it('fällt die 500-hPa-Fläche nach Norden ab, kommt die Luft aus Westen', () => {
    // 60 m tiefer je Breitengrad (111 km): kräftige Westströmung
    const s = hoehenstroemung(daten({ geopotential_height_500hPa: (p) => 5600 - 60 * (p.lat - 47) }), ALPENPUNKTE, ti)
    expect(s && richtungName(s.grad)).toBe('Westen')
    // 60 m auf 111 km ergeben bei 47° Breite rund 180 km/h
    expect(s?.kmh).toBeGreaterThan(150)
    expect(s?.kmh).toBeLessThan(210)
  })

  it('fällt sie nach Osten ab, kommt die Luft aus Norden', () => {
    const s = hoehenstroemung(daten({ geopotential_height_500hPa: (p) => 5600 - 20 * (p.lon - 13) }), ALPENPUNKTE, ti)
    expect(s && richtungName(s.grad)).toBe('Norden')
  })

  it('fällt sie nach Nordwesten ab, kommt die Luft aus Südwesten', () => {
    const s = hoehenstroemung(daten({ geopotential_height_500hPa: (p) => 5600 - 30 * (p.lat - 47) + 20 * (p.lon - 13) }), ALPENPUNKTE, ti)
    expect(s && richtungName(s.grad)).toBe('Südwesten')
  })

  it('liefert null ohne Daten', () => {
    expect(hoehenstroemung(daten({ geopotential_height_500hPa: () => null }), ALPENPUNKTE, ti)).toBeNull()
  })
})

describe('analyseStroemung', () => {
  it('beschreibt Höhenströmung und Wind in 3000 m', () => {
    const s = analyseStroemung(
      daten({
        geopotential_height_500hPa: (p) => 5600 - 30 * (p.lat - 47) - 20 * (p.lon - 13),
        wind_direction_700hPa: () => 290,
        wind_speed_700hPa: () => 62,
      }),
      ALPENPUNKTE,
      DAY,
    )
    expect(s?.schwach).toBe(false)
    expect(s && stroemungText(s)).toBe(
      'In der Höhe (rund 5500 m) strömt die Luft aus Nordwesten nach Österreich, in 3000 m weht der Wind aus Westen mit rund 60 km/h.',
    )
  })

  it('erkennt schwache Strömung', () => {
    const s = analyseStroemung(
      daten({ geopotential_height_500hPa: (p) => 5700 - 1 * (p.lat - 47), wind_direction_700hPa: () => 100, wind_speed_700hPa: () => 8 }),
      ALPENPUNKTE,
      DAY,
    )
    expect(s?.schwach).toBe(true)
    expect(s && stroemungText(s)).toContain('schwacher Wind')
  })

  it('liefert null für einen Tag außerhalb der Daten', () => {
    expect(analyseStroemung(daten({ wind_direction_700hPa: () => 270, wind_speed_700hPa: () => 40 }), ALPENPUNKTE, DAY + 10 * 24 * H)).toBeNull()
  })
})

describe('analyseLuftmasse', () => {
  it('meldet Kaltluftzufuhr, wenn es in 1500 m deutlich kälter ist als an den Vortagen', () => {
    // Vortage 6 °C, am Tag selbst −1 °C
    const l = analyseLuftmasse(daten({ temperature_850hPa: (_, t) => (t < DAY ? 6 : -1) }), ALPENPUNKTE, DAY)
    expect(l?.art).toBe('kalt')
    expect(l && luftmasseText(l)).toBe('In 1500 m Höhe hat es im Mittel −1 °C, das sind 7 Grad weniger als an den beiden Vortagen: Es strömt Kaltluft ein.')
  })

  it('meldet Warmluftzufuhr', () => {
    const l = analyseLuftmasse(daten({ temperature_850hPa: (_, t) => (t < DAY ? 2 : 8) }), ALPENPUNKTE, DAY)
    expect(l?.art).toBe('warm')
    expect(l && luftmasseText(l)).toContain('6 Grad mehr')
  })

  it('bleibt bei kleinen Unterschieden neutral', () => {
    const l = analyseLuftmasse(daten({ temperature_850hPa: (_, t) => (t < DAY ? 5 : 3) }), ALPENPUNKTE, DAY)
    expect(l?.art).toBe('gleich')
    expect(l && luftmasseText(l)).toContain('kaum anders')
  })

  it('kommt ohne Vortage aus', () => {
    // erster Tag der Daten: keine Vortage vorhanden
    const l = analyseLuftmasse(daten({ temperature_850hPa: () => 4 }), ALPENPUNKTE, DAY - 48 * H)
    expect(l?.diff).toBeNull()
    expect(l && luftmasseText(l)).toBe('In 1500 m Höhe hat es im Mittel 4 °C.')
  })
})

describe('findeFront', () => {
  /** Kaltfront um 13:30 UTC: vorher 6 °C und Südwestwind, nachher −1 °C und Nordwestwind */
  const kaltfront = daten({
    temperature_850hPa: (_, t) => (t < DAY + 13.5 * H ? 6 : -1),
    wind_direction_700hPa: (_, t) => (t < DAY + 13.5 * H ? 225 : 315),
    wind_speed_700hPa: () => 50,
  })

  it('erkennt eine Kaltfront am Nachmittag', () => {
    const f = findeFront(kaltfront, ALPENPUNKTE, DAY)
    expect(f?.art).toBe('Kaltfront')
    expect(f && tageszeit(f.zeit)).toBe('am Nachmittag')
    expect(f && frontText(f)).toBe(
      'Voraussichtlich zieht am Nachmittag eine Kaltfront durch: Die Temperatur in 1500 m sinkt binnen 12 Stunden um 7 Grad, der Wind in 3000 m dreht von Südwest auf Nordwest.',
    )
  })

  it('meldet am Folgetag keine Front mehr', () => {
    expect(findeFront(kaltfront, ALPENPUNKTE, DAY + 24 * H)).toBeNull()
  })

  it('findet auch eine Front am späten Abend, und zwar nur an diesem Tag', () => {
    const spaet = daten({
      temperature_850hPa: (_, t) => (t < DAY + 22.5 * H ? 6 : -1),
      wind_direction_700hPa: (_, t) => (t < DAY + 22.5 * H ? 225 : 315),
      wind_speed_700hPa: () => 50,
    })
    expect(findeFront(spaet, ALPENPUNKTE, DAY)?.art).toBe('Kaltfront')
    expect(findeFront(spaet, ALPENPUNKTE, DAY + 24 * H)).toBeNull()
  })

  it('meldet keine Front, wenn nur die Temperatur fällt und der Wind nicht dreht', () => {
    const f = findeFront(
      daten({ temperature_850hPa: (_, t) => (t < DAY + 13.5 * H ? 6 : -1), wind_direction_700hPa: () => 300, wind_speed_700hPa: () => 50 }),
      ALPENPUNKTE,
      DAY,
    )
    expect(f).toBeNull()
  })

  it('erkennt eine Warmfront', () => {
    const f = findeFront(
      daten({
        temperature_850hPa: (_, t) => (t < DAY + 7.5 * H ? -2 : 5),
        wind_direction_700hPa: (_, t) => (t < DAY + 7.5 * H ? 150 : 250),
        wind_speed_700hPa: () => 40,
      }),
      ALPENPUNKTE,
      DAY,
    )
    expect(f?.art).toBe('Warmfront')
  })
})

describe('findeFront bei schwachem Wind', () => {
  it('meldet keine Front, wenn der Wind in 3000 m schwach ist', () => {
    const f = findeFront(
      daten({
        temperature_850hPa: (_, t) => (t < DAY + 7.5 * H ? -2 : 5),
        wind_direction_700hPa: (_, t) => (t < DAY + 7.5 * H ? 315 : 225),
        wind_speed_700hPa: () => 12,
      }),
      ALPENPUNKTE,
      DAY,
    )
    expect(f).toBeNull()
  })
})
