import { describe, expect, it } from 'vitest'
import { ALPENPUNKTE, type Alpenpunkt } from '../data/alpenpunkte'
import type { AlpenDaten, AlpenVariable, EuropeGrid, StaubDaten } from '../types/grosswetterlage'
import {
  analyseGewitter,
  analyseHoehengrenze,
  analyseStaub,
  analyseSturm,
  gewitterText,
  hoehengrenzeText,
  staubText,
  sturmText,
} from './einfluesse'

const H = 3600 * 1000
const DAY = Date.UTC(2026, 10, 13)
/** alle 3 Stunden, 2 Tage ab DAY */
const TIMES = Array.from({ length: 16 }, (_, i) => DAY + i * 3 * H)
const INLAND = ALPENPUNKTE.filter((p) => p.inOesterreich)

type Feld = (punkt: Alpenpunkt, time: number) => number | null

function daten(felder: Partial<Record<AlpenVariable, Feld>>): AlpenDaten {
  const werte: AlpenDaten['werte'] = {}
  for (const p of ALPENPUNKTE) {
    const perVariable = {} as Record<AlpenVariable, (number | null)[]>
    for (const [variable, feld] of Object.entries(felder) as [AlpenVariable, Feld][]) perVariable[variable] = TIMES.map((t) => feld(p, t))
    werte[p.id] = { a: perVariable }
  }
  return { times: TIMES, models: ['a'], werte }
}

function staub(dust: (p: Alpenpunkt, t: number) => number | null, aod = 0.1): StaubDaten {
  const times = Array.from({ length: 48 }, (_, i) => DAY + i * H)
  return {
    times,
    dust: Object.fromEntries(INLAND.map((p) => [p.id, times.map((t) => dust(p, t))])),
    aod: Object.fromEntries(INLAND.map((p) => [p.id, times.map(() => aod)])),
  }
}

describe('Saharastaub', () => {
  it('meldet keinen Staub bei kleinen Werten', () => {
    const s = analyseStaub(staub(() => 3), INLAND, DAY)
    expect(s?.stufe).toBe(0)
    expect(s && staubText(s)).toBe('Kein nennenswerter Saharastaub in der Luft.')
  })

  it('nennt bei deutlichem Staub die Folgen und die betroffenen Orte', () => {
    const s = analyseStaub(staub((p) => (p.id === 'bregenz' || p.id === 'innsbruck' ? 72 : 5)), INLAND, DAY)
    expect(s?.stufe).toBe(2)
    expect(s && staubText(s)).toBe(
      'Deutlich Saharastaub in der Luft (bis 70 µg/m³, vor allem bei Bregenz und Innsbruck): Der Himmel ist trüb, und wenn Regen oder Schnee fällt, bleibt gelblicher Staub auf Autos und Schneeflächen zurück.',
    )
  })

  it('leichter Staub: milchiger Himmel', () => {
    const s = analyseStaub(staub(() => 30), INLAND, DAY)
    expect(s?.stufe).toBe(1)
    expect(s && staubText(s)).toContain('milchig')
  })

  it('liefert null, wenn die Staub-Vorhersage nicht so weit reicht', () => {
    expect(analyseStaub(staub(() => null), INLAND, DAY)).toBeNull()
    expect(analyseStaub(staub(() => 30), INLAND, DAY + 6 * 24 * H)).toBeNull()
  })
})

describe('Gewitterneigung', () => {
  it('nennt die Regionen, stärkste zuerst', () => {
    const g = analyseGewitter(daten({ cape: (p) => (p.id === 'graz' || p.id === 'klagenfurt' ? 1230 : p.id === 'wien' ? 600 : 100) }), DAY)
    expect(g?.stufe).toBe(2)
    expect(g && gewitterText(g)).toBe('Gewitterneigung im Süden deutlich und im Osten leicht, sonst gering (CAPE bis 1250 J/kg).')
  })

  it('meldet keine Neigung bei wenig CAPE und null ohne Daten', () => {
    const g = analyseGewitter(daten({ cape: () => 50 }), DAY)
    expect(g && gewitterText(g)).toBe('Keine nennenswerte Gewitterneigung.')
    expect(analyseGewitter(daten({ cape: () => null }), DAY)).toBeNull()
  })
})

describe('Nullgradgrenze und Schneefallgrenze', () => {
  it('Norden sinkend mit Schneefall, Süden gleichbleibend und trocken', () => {
    const d = daten({
      // Norden: sinkt im Lauf des Tages von 2000 auf 1300 m, Süden bleibt bei 2400 m
      freezing_level_height: (p, t) => (p.seite === 'nord' ? 2000 - (700 * Math.min(t - DAY, 21 * H)) / (21 * H) : 2400),
      precipitation: (p) => (p.seite === 'nord' ? 2 : 0),
    })
    const nord = analyseHoehengrenze(d, ALPENPUNKTE, 'nord', DAY)
    const sued = analyseHoehengrenze(d, ALPENPUNKTE, 'sued', DAY)
    expect(nord?.schneefall).toBe(1000)
    expect(sued?.schneefall).toBeNull()
    expect(hoehengrenzeText(nord, sued)).toBe(
      'Nullgradgrenze: in den Nordalpen sinkt sie von 2000 auf 1300 m, in den Südalpen liegt sie um 2400 m. Schnee fällt im Norden bis etwa 1000 m herab.',
    )
  })

  it('liefert null ohne Daten', () => {
    expect(analyseHoehengrenze(daten({ precipitation: () => 0 }), ALPENPUNKTE, 'nord', DAY)).toBeNull()
    expect(hoehengrenzeText(null, null)).toBeNull()
  })
})

describe('Sturm', () => {
  const LATS = Array.from({ length: 13 }, (_, i) => 65 - i * 2.5)
  const LONS = Array.from({ length: 21 }, (_, i) => -15 + i * 2.5)
  /** Europa-Raster mit einem erfundenen Druckfeld, 4 Zeitpunkte am Tag */
  function raster(druck: (lat: number, lon: number) => number): EuropeGrid {
    const times = [0, 6, 12, 18].map((h) => DAY + h * H)
    const feld = LATS.flatMap((lat) => LONS.map((lon) => druck(lat, lon)))
    return { lats: LATS, lons: LONS, times, pressure: times.map(() => feld), z500: times.map(() => feld.map(() => null)), fetchedAt: 0 }
  }

  it('ruhig bei gleichem Druck überall', () => {
    const s = analyseSturm(raster(() => 1015), DAY)
    expect(s?.stufe).toBe(0)
    expect(s && sturmText(s)).toContain('Kein großräumiger Sturm')
  })

  it('Druck fällt nach Norden um 3,5 hPa je 100 km: Sturm aus Westen', () => {
    // 1 Breitengrad = 111 km → 3,9 hPa je Grad
    const s = analyseSturm(raster((lat) => 1010 - 3.9 * (lat - 47)), DAY)
    expect(s?.stufe).toBe(2)
    expect(s?.gefaelle).toBeCloseTo(3.5, 1)
    expect(s && sturmText(s)).toBe(
      'Sehr starkes Druckgefälle über Österreich (3,5 hPa je 100 km): Sturm aus Westen ist möglich, vor allem auf den Bergen und im Flachland.',
    )
  })

  it('Druck fällt nach Westen um gut 2 hPa je 100 km: starker Wind aus Süden', () => {
    // 1 Längengrad sind bei 47,5° Breite rund 75 km → 1,7 hPa je Grad ≈ 2,3 hPa je 100 km
    const s = analyseSturm(raster((_, lon) => 1010 + 1.7 * (lon - 13)), DAY)
    expect(s?.stufe).toBe(1)
    expect(s && sturmText(s)).toContain('aus Süden')
  })

  it('liefert null für einen Tag außerhalb des Rasters', () => {
    expect(analyseSturm(raster(() => 1015), DAY + 9 * 24 * H)).toBeNull()
  })
})
