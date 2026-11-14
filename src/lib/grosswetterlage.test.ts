import { describe, expect, it } from 'vitest'
import { ALPENPUNKTE, type Alpenpunkt } from '../data/alpenpunkte'
import type { AlpenDaten, AlpenVariable, EuropeGrid, PressureCenter } from '../types/grosswetterlage'
import { erkenneWetterlagen, findeItalientief, imSektor, kennzahlen, type LageKennzahlen } from './grosswetterlage'

const H = 3600 * 1000
/** Freitag, 13.11.2026, Mitternacht */
const DAY = Date.UTC(2026, 10, 13)

/** Ein ruhiger Tag ohne besondere Merkmale: Davon weichen die Tests jeweils in wenigen Punkten ab. */
function k(changes: Partial<LageKennzahlen>): LageKennzahlen {
  return {
    monat: 11,
    druck: 1015,
    regenNord: 0.5,
    regenSued: 0.5,
    foehnDiff: 0,
    wind700: { grad: 200, kmh: 10 },
    hoehe: { grad: 200, kmh: 15 },
    luftmasseDiff: 0,
    ...changes,
  }
}

const ids = (changes: Partial<LageKennzahlen>) => erkenneWetterlagen(k(changes)).map((l) => l.id)

describe('imSektor', () => {
  it('kommt mit Sektoren über Nord zurecht', () => {
    expect(imSektor(350, [290, 30])).toBe(true)
    expect(imSektor(10, [290, 30])).toBe(true)
    expect(imSektor(180, [290, 30])).toBe(false)
    expect(imSektor(200, [135, 245])).toBe(true)
  })
})

describe('erkenneWetterlagen', () => {
  it('erzwingt keine Lage, wenn nichts deutlich ist', () => {
    expect(ids({})).toEqual([])
  })

  it('Hochdrucklage: hoher Druck und trocken, im November mit Hochnebel-Hinweis', () => {
    const hoch: PressureCenter = { kind: 'H', lat: 52.5, lon: 20, hPa: 1034, lage: 'über Polen', auspraegung: 8, distanzKm: 700, amRand: false }
    const lagen = erkenneWetterlagen(k({ druck: 1028, regenNord: 0, regenSued: 0 }), [hoch])
    expect(lagen.map((l) => l.id)).toEqual(['hochdruck'])
    expect(lagen[0].gruende).toContain('Hoch über Polen mit 1034 hPa')
    expect(lagen[0].hinweis).toContain('Hochnebel')
  })

  it('Hochdrucklage im Juli ohne Hochnebel-Hinweis, bei Regen gar keine', () => {
    expect(erkenneWetterlagen(k({ monat: 7, druck: 1024, regenNord: 0, regenSued: 0 }))[0].hinweis).toBeUndefined()
    expect(ids({ druck: 1028, regenNord: 4, regenSued: 2 })).toEqual([])
  })

  it('Nordstau: Nordwestwind, Regen im Norden, Süden fast trocken', () => {
    const lagen = erkenneWetterlagen(k({ wind700: { grad: 330, kmh: 55 }, hoehe: { grad: 320, kmh: 80 }, regenNord: 12, regenSued: 0.4 }))
    expect(lagen.map((l) => l.id)).toEqual(['nordstau'])
    expect(lagen[0].gruende[0]).toBe('nördlich des Alpenhauptkamms rund 12 mm Niederschlag, südlich nur 0,4 mm')
  })

  it('kein Nordstau, wenn es auf beiden Seiten ähnlich viel regnet', () => {
    expect(ids({ wind700: { grad: 330, kmh: 55 }, hoehe: { grad: 320, kmh: 80 }, regenNord: 12, regenSued: 8 })).toEqual([])
  })

  it('Südstau und Südföhn treten gemeinsam auf', () => {
    expect(ids({ wind700: { grad: 190, kmh: 70 }, hoehe: { grad: 210, kmh: 90 }, regenNord: 0.2, regenSued: 25, foehnDiff: 7 })).toEqual([
      'suedfoehn',
      'suedstau',
    ])
  })

  it('Südföhn braucht Südwind: Druckdifferenz allein reicht nicht', () => {
    expect(ids({ foehnDiff: 7, wind700: { grad: 300, kmh: 50 }, hoehe: { grad: 200, kmh: 20 } })).toEqual([])
    expect(ids({ foehnDiff: 2, wind700: { grad: 190, kmh: 50 } })).toEqual([])
  })

  it('Westlage und Ostlage', () => {
    expect(ids({ hoehe: { grad: 270, kmh: 90 }, wind700: { grad: 265, kmh: 60 }, regenNord: 3, regenSued: 2 })).toEqual(['westlage'])
    expect(ids({ wind700: { grad: 90, kmh: 25 }, hoehe: { grad: 110, kmh: 30 } })).toEqual(['ostlage'])
  })

  it('nennt die Westlage nicht zusätzlich zu einer anderen Lage', () => {
    expect(ids({ luftmasseDiff: -8, wind700: { grad: 320, kmh: 35 }, hoehe: { grad: 270, kmh: 60 } })).toEqual(['kaltluftausbruch'])
  })

  it('Kaltluftausbruch: deutlich kälter und Strömung aus Norden', () => {
    expect(ids({ luftmasseDiff: -8, wind700: { grad: 350, kmh: 20 }, hoehe: { grad: 340, kmh: 60 } })).toEqual(['kaltluftausbruch'])
    // kälter, aber mit Westwind: kein Ausbruch aus Norden
    expect(ids({ luftmasseDiff: -8, wind700: { grad: 260, kmh: 20 }, hoehe: { grad: 200, kmh: 20 } })).toEqual([])
  })

  it('Genuatief mit Vb-Warnung steht an erster Stelle', () => {
    const center: PressureCenter = { kind: 'T', lat: 45, lon: 10, hPa: 998, lage: 'über Oberitalien', auspraegung: 6, distanzKm: 420, amRand: false }
    const lagen = erkenneWetterlagen(k({ regenSued: 30, regenNord: 2, wind700: { grad: 180, kmh: 40 } }), [], {
      center,
      zeit: DAY + 12 * H,
      vb: true,
      vbZiel: 'über Ungarn',
    })
    expect(lagen.map((l) => l.id)).toEqual(['italientief', 'suedstau'])
    expect(lagen[0].name).toBe('Genuatief')
    expect(lagen[0].warnung).toBe(true)
    expect(lagen[0].hinweis).toContain('über Ungarn')
  })

  it('Tief über der Adria heißt Adriatief, ohne Zug nach Nordosten keine Warnung', () => {
    const center: PressureCenter = { kind: 'T', lat: 42.5, lon: 15, hPa: 1002, lage: 'über der Adria', auspraegung: 4, distanzKm: 570, amRand: false }
    const lagen = erkenneWetterlagen(k({}), [], { center, zeit: DAY, vb: false })
    expect(lagen[0].name).toBe('Adriatief')
    expect(lagen[0].warnung).toBeUndefined()
  })
})

// ---------- Kennzahlen aus den Alpenpunkten ----------

/** alle 3 Stunden, von 2 Tagen davor bis 2 Tage danach */
const TIMES = Array.from({ length: 5 * 8 }, (_, i) => DAY - 48 * H + i * 3 * H)
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

describe('kennzahlen', () => {
  it('rechnet Regen je Alpenseite, Föhn-Differenz und Druck aus', () => {
    const z = kennzahlen(
      daten({
        // 1 mm je 3 Stunden südlich des Alpenhauptkamms, im Norden trocken
        precipitation: (p) => (p.seite === 'sued' ? 1 : 0),
        // Bozen 6 hPa höher als alle anderen
        pressure_msl: (p) => (p.id === 'bozen' ? 1016 : 1010),
        wind_direction_700hPa: () => 180,
        wind_speed_700hPa: () => 60,
        temperature_850hPa: () => 5,
      }),
      ALPENPUNKTE,
      DAY,
    )
    expect(z?.regenSued).toBe(8)
    expect(z?.regenNord).toBe(0)
    expect(z?.foehnDiff).toBe(6)
    expect(z?.druck).toBe(1010)
    expect(z?.monat).toBe(11)
    expect(z && erkenneWetterlagen(z).map((l) => l.id)).toEqual(['suedfoehn', 'suedstau'])
  })

  it('liefert null für einen Tag außerhalb der Daten', () => {
    expect(kennzahlen(daten({ pressure_msl: () => 1010 }), ALPENPUNKTE, DAY + 20 * 24 * H)).toBeNull()
  })
})

// ---------- Tief über Italien und Vb-Zugbahn ----------

const LATS = Array.from({ length: 13 }, (_, i) => 65 - i * 2.5)
const LONS = Array.from({ length: 21 }, (_, i) => -15 + i * 2.5)

/** Raster alle 6 Stunden ab DAY; je Zeitpunkt ein Tief an der angegebenen Stelle (oder keines) */
function rasterMitTief(bahn: ([number, number] | null)[]): EuropeGrid {
  const times = bahn.map((_, i) => DAY + i * 6 * H)
  const pressure = bahn.map((pos) =>
    LATS.flatMap((lat) => LONS.map((lon) => (pos ? 1015 - 18 * Math.exp(-((lat - pos[0]) ** 2 + (lon - pos[1]) ** 2) / 32) : 1015))),
  )
  return { lats: LATS, lons: LONS, times, pressure, z500: pressure.map((row) => row.map(() => null)), fetchedAt: 0 }
}

describe('findeItalientief', () => {
  it('erkennt die Vb-Zugbahn von Oberitalien nach Polen', () => {
    // 12 Uhr über Oberitalien, dann Adria/Slowenien, Ungarn, Slowakei, Polen
    const grid = rasterMitTief([null, null, [45, 10], [45, 12.5], [45, 15], [47.5, 17.5], [47.5, 20], [50, 20], [52.5, 20]])
    const tief = findeItalientief(grid, DAY)
    expect(tief?.center.lage).toBe('über Oberitalien')
    expect(tief?.vb).toBe(true)
    expect(tief?.vbZiel).toBe('über Polen')
  })

  it('meldet kein Vb, wenn das Tief über Italien liegen bleibt oder nach Süden abzieht', () => {
    expect(findeItalientief(rasterMitTief([[45, 10], [45, 10], [45, 10], [45, 10], [45, 10], [45, 10]]), DAY)?.vb).toBe(false)
    expect(findeItalientief(rasterMitTief([[45, 10], [42.5, 12.5], [40, 15], [40, 17.5], [37.5, 20]]), DAY)?.vb).toBe(false)
  })

  it('findet nichts, wenn das Tief woanders liegt', () => {
    expect(findeItalientief(rasterMitTief([[55, 0], [55, 2.5], [55, 5], [55, 7.5]]), DAY)).toBeNull()
  })
})
