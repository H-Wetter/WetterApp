import { describe, expect, it } from 'vitest'
import { ALPENPUNKTE, type Alpenpunkt } from '../data/alpenpunkte'
import type { AlpenDaten, AlpenVariable, PressureCenter } from '../types/grosswetterlage'
import { einschaetzungSicherheit, type Wetterlage } from './grosswetterlage'
import { MAX_SAETZE, druckSatz, grosswetterlageAbsatz, satzZahl } from './grosswetterlageText'
import { frontText, type Front } from './stroemung'

const H = 3600 * 1000
const DAY = Date.UTC(2026, 10, 13)

function center(kind: 'H' | 'T', lage: string, hPa: number, distanzKm: number): PressureCenter {
  return { kind, lat: 0, lon: 0, hPa, lage, auspraegung: 5, distanzKm, amRand: false }
}

/** Lage vom 13.11.2026 (echte Werte aus der App) */
const GENUA = center('T', 'über dem Golf von Genua', 999, 650)
const SCHWEDEN = center('T', 'über Südschweden', 980, 1450)
const IRLAND = center('H', 'über Irland', 1019, 1650)
const KALTFRONT: Front = { art: 'Kaltfront', zeit: DAY + 2 * H, diffGrad: -8, windVorher: 225, windNachher: 315 }

describe('satzZahl', () => {
  it('zählt Sätze, Doppelpunkte und Zahlen mit Komma trennen nicht', () => {
    expect(satzZahl('Ein Satz.')).toBe(1)
    expect(satzZahl('Kräftiges Druckgefälle (2,4 hPa je 100 km): starker Wind. Schnee fällt bis 500 m herab.')).toBe(2)
  })
})

describe('druckSatz', () => {
  it('nennt das nächste Tief und das nächste Hoch, das Nähere zuerst', () => {
    expect(druckSatz([GENUA, SCHWEDEN, IRLAND])).toBe(
      'Am nächsten zu Österreich liegen ein Tief über dem Golf von Genua (999 hPa) und ein Hoch über Irland (1019 hPa).',
    )
  })

  it('kommt mit nur einem Gebilde und mit keinem zurecht', () => {
    expect(druckSatz([IRLAND])).toBe('Am nächsten zu Österreich liegt ein Hoch über Irland (1019 hPa).')
    expect(druckSatz([])).toContain('kein ausgeprägtes Hoch oder Tief')
  })
})

describe('frontText', () => {
  it('schreibt eine Front, die schon durch ist, in der Vergangenheit', () => {
    expect(frontText(KALTFRONT, DAY + 20 * H)).toBe(
      'In der Nacht ist eine Kaltfront durchgezogen: Die Temperatur in 1500 m ist binnen 12 Stunden um 8 Grad gesunken, der Wind in 3000 m hat von Südwest auf Nordwest gedreht.',
    )
    expect(frontText(KALTFRONT, DAY - 20 * H)).toContain('Voraussichtlich zieht in der Nacht eine Kaltfront durch')
  })
})

describe('grosswetterlageAbsatz', () => {
  const lagen: Wetterlage[] = [
    { id: 'italientief', name: 'Genuatief', gruende: [] },
    { id: 'kaltluftausbruch', name: 'Kaltluftausbruch aus Norden', gruende: [] },
  ]

  it('baut den Absatz für den 13.11.2026', () => {
    const saetze = grosswetterlageAbsatz({
      centers: [GENUA, SCHWEDEN, IRLAND],
      lagen,
      stroemung: { hoehe: { grad: 270, kmh: 60 }, wind700: { grad: 315, kmh: 35 }, schwach: false },
      luftmasse: { t850: -1, diff: -8, art: 'kalt' },
      front: KALTFRONT,
      sturm: { stufe: 1, gefaelle: 2.4, windAus: 62 },
      grenzeNord: { start: 2000, ende: 800, mittel: 1200, schneefall: 500 },
      grenzeSued: { start: 2700, ende: 1200, mittel: 1700, schneefall: 900 },
      gewitter: { stufe: 0, regionen: [] },
      staub: { stufe: 0, maxDust: 0, maxAod: 0.1, orte: [] },
      now: DAY + 20 * H,
    })
    expect(saetze[0]).toContain('Tief über dem Golf von Genua (999 hPa)')
    expect(saetze[1]).toBe('Das kräftigste Tief liegt über Südschweden (980 hPa).')
    expect(saetze[2]).toBe('Wetterlage für Österreich: Genuatief und Kaltluftausbruch aus Norden.')
    // Die Abkühlung steht schon im Namen der Lage: kein eigener Luftmassen-Satz
    expect(saetze.join(' ')).not.toContain('Es strömt Kaltluft ein')
    // Kein Gewitter, kein Staub: Diese Sätze fehlen
    expect(saetze.join(' ')).not.toContain('Gewitter')
    expect(saetze.join(' ')).not.toContain('Saharastaub')
    expect(saetze.join(' ')).toContain('ist eine Kaltfront durchgezogen')
    const anzahl = saetze.reduce((sum, s) => sum + satzZahl(s), 0)
    expect(anzahl).toBeGreaterThanOrEqual(4)
    expect(anzahl).toBeLessThanOrEqual(MAX_SAETZE)
  })

  it('kürzt auf 8 Sätze und behält dabei die Vb-Warnung', () => {
    const saetze = grosswetterlageAbsatz({
      centers: [GENUA, SCHWEDEN, IRLAND],
      lagen: [
        { id: 'italientief', name: 'Genuatief', gruende: [], hinweis: 'Mögliche Vb-Lage: Das Tief zieht nach Nordosten. Dabei kann es lange regnen.', warnung: true },
        { id: 'suedfoehn', name: 'Südföhn', gruende: [], hinweis: 'An der Alpennordseite sind föhnige Aufhellungen möglich.' },
        { id: 'suedstau', name: 'Südstau', gruende: [] },
      ],
      stroemung: { hoehe: { grad: 200, kmh: 90 }, wind700: { grad: 190, kmh: 70 }, schwach: false },
      luftmasse: { t850: 8, diff: 6, art: 'warm' },
      front: KALTFRONT,
      sturm: { stufe: 2, gefaelle: 3.5, windAus: 190 },
      grenzeNord: { start: 2500, ende: 2500, mittel: 2500, schneefall: null },
      grenzeSued: { start: 2200, ende: 2200, mittel: 2200, schneefall: 1900 },
      gewitter: { stufe: 2, regionen: [{ name: 'im Süden', stufe: 2, cape: 1200 }] },
      staub: { stufe: 2, maxDust: 70, maxAod: 0.6, orte: ['Bregenz'] },
    })
    expect(saetze.reduce((sum, s) => sum + satzZahl(s), 0)).toBeLessThanOrEqual(MAX_SAETZE)
    expect(saetze.join(' ')).toContain('Mögliche Vb-Lage')
    expect(saetze.join(' ')).toContain('Wetterlage für Österreich: Genuatief, Südföhn und Südstau.')
    // Das Unwichtigste fällt weg
    expect(saetze.join(' ')).not.toContain('Das kräftigste Tief')
  })

  it('schreibt ehrlich, wenn keine Lage eindeutig ist', () => {
    const saetze = grosswetterlageAbsatz({ centers: [], lagen: [] })
    expect(saetze).toEqual([
      'Über Europa gibt es kein ausgeprägtes Hoch oder Tief, der Luftdruck ist überall ähnlich.',
      'Für Österreich ist keine der typischen Alpen-Wetterlagen deutlich ausgeprägt.',
    ])
  })
})

// ---------- Sicherheit: Übereinstimmung der Modelle ----------

const TIMES = Array.from({ length: 5 * 8 }, (_, i) => DAY - 48 * H + i * 3 * H)
type Feld = (punkt: Alpenpunkt, model: string) => number

/** Erfundene Daten für drei Modelle; jede Variable hängt von Ort und Modell ab, nicht von der Zeit. */
function daten(felder: Partial<Record<AlpenVariable, Feld>>): AlpenDaten {
  const models = ['ecmwf_ifs025', 'dwd_icon_seamless', 'gfs_seamless']
  const werte: AlpenDaten['werte'] = {}
  for (const p of ALPENPUNKTE) {
    werte[p.id] = {}
    for (const m of models) {
      const perVariable = {} as Record<AlpenVariable, (number | null)[]>
      for (const [variable, feld] of Object.entries(felder) as [AlpenVariable, Feld][]) perVariable[variable] = TIMES.map(() => feld(p, m))
      werte[p.id][m] = perVariable
    }
  }
  return { times: TIMES, models, werte }
}

describe('einschaetzungSicherheit', () => {
  /**
   * Hochdrucklage bei allen Modellen außer denen in `nass`: Dort fallen 2,4 mm am Tag (0,3 mm je 3 Stunden).
   * Ist nur EIN Modell nass, bleibt das Mittel mit 0,8 mm unter der Trocken-Schwelle von 1 mm.
   */
  const hochdruck = (nass: string[]) =>
    daten({
      pressure_msl: () => 1028,
      precipitation: (_, m) => (nass.includes(m) ? 0.3 : 0),
      wind_direction_700hPa: () => 200,
      wind_speed_700hPa: () => 10,
      temperature_850hPa: () => 5,
    })

  it('sicher, wenn alle drei Modelle dieselbe Lage ergeben', () => {
    const s = einschaetzungSicherheit(hochdruck([]), ALPENPUNKTE, DAY)
    expect(s?.stufe).toBe('sicher')
    expect(s?.text).toBe('Recht sicher: ECMWF, ICON und GFS kommen einzeln zum selben Ergebnis.')
  })

  it('eher sicher, wenn ein Modell abweicht, und nennt es', () => {
    const s = einschaetzungSicherheit(hochdruck(['gfs_seamless']), ALPENPUNKTE, DAY)
    expect(s?.stufe).toBe('eher sicher')
    expect(s?.text).toBe('Eher sicher: 2 von 3 Modellen kommen zum selben Ergebnis, GFS sieht stattdessen: keine eindeutige Lage.')
  })

  it('nicht sicher, wenn die Modelle auseinandergehen, mit Zusatz ab dem 6. Tag', () => {
    // Zwei Modelle nass: Das Mittel (1,6 mm) ergibt keine Hochdrucklage mehr, ECMWF allein aber schon.
    const s = einschaetzungSicherheit(hochdruck(['gfs_seamless', 'dwd_icon_seamless']), ALPENPUNKTE, DAY, [], 6)
    expect(s?.stufe).not.toBe('sicher')
    expect(s?.text).toContain('So weit im Voraus')
  })

  it('liefert null ohne Daten', () => {
    expect(einschaetzungSicherheit(daten({}), ALPENPUNKTE, DAY)).toBeNull()
  })
})
