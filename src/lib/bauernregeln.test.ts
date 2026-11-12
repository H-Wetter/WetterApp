import { describe, expect, it } from 'vitest'
import { BAUERNREGELN } from '../data/bauernregeln'
import type { DaySummary } from './daily'
import {
  datumText,
  lostagName,
  naechsterLostag,
  pruefeRegel,
  regelDesTages,
  regelnAmLostag,
  sucheRegeln,
  testdatumAusAdresse,
} from './bauernregeln'

const tag = (monat: number, t: number, jahr = 2026) => ({ jahr, monat, tag: t })
const regel = (id: string) => {
  const r = BAUERNREGELN.find((x) => x.id === id)
  if (!r) throw new Error(`Regel ${id} fehlt`)
  return r
}
const stats = (mean: number | null) => ({ mean, median: mean, min: mean, max: mean, count: 10 })

/** Tageszusammenfassung mit nur den Werten, die die Prüfung braucht */
function prognose(monat: number, t: number, werte: { wolken?: number; regen?: number; tmin?: number; tmax?: number; schnee?: number }): DaySummary {
  return {
    dayStart: Date.UTC(2026, monat - 1, t),
    cloudCover: werte.wolken ?? 50,
    precipSum: stats(werte.regen ?? 0),
    tempMin: stats(werte.tmin ?? 3),
    tempMax: stats(werte.tmax ?? 8),
    snowSum: werte.schnee ?? 0,
  } as DaySummary
}

describe('Daten', () => {
  it('jede Regel hat eine eindeutige id und gültige Monate/Tage', () => {
    const ids = BAUERNREGELN.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const r of BAUERNREGELN) {
      expect(r.monat).toBeGreaterThanOrEqual(1)
      expect(r.monat).toBeLessThanOrEqual(12)
      if (r.bisTag !== undefined) expect(r.bisTag).toBeGreaterThan(r.tag ?? 99)
      expect(r.erklaerung.length).toBeGreaterThan(10)
      expect(r.hintergrund.length).toBeGreaterThan(10)
    }
  })

  it('hat mindestens 3 Regeln pro Monat und die wichtigen Lostage', () => {
    for (let m = 1; m <= 12; m++) expect(BAUERNREGELN.filter((r) => r.monat === m).length).toBeGreaterThanOrEqual(3)
    for (const name of ['Mariä Lichtmess', 'Eisheilige', 'Siebenschläfer', 'Martini', 'Kathrein']) {
      expect(BAUERNREGELN.some((r) => r.lostag === name)).toBe(true)
    }
  })
})

describe('Lostage', () => {
  it('erkennt Martini am 11.11. und Siebenschläfer am 27.6.', () => {
    expect(lostagName(tag(11, 11))).toBe('Martini')
    expect(lostagName(tag(6, 27))).toBe('Siebenschläfer')
  })

  it('erkennt die Eisheiligen als Zeitraum (12.–15.5.)', () => {
    expect(regelnAmLostag(tag(5, 13)).map((r) => r.id)).toContain('eisheilige')
    expect(regelnAmLostag(tag(5, 16))).toEqual([])
  })

  it('kennt an einem gewöhnlichen Tag keinen Lostag', () => {
    expect(lostagName(tag(11, 12))).toBeNull()
  })

  it('findet den nächsten Lostag (vom 12.11. aus: Kathrein in 13 Tagen)', () => {
    const n = naechsterLostag(tag(11, 12))
    expect(n?.regel.lostag).toBe('Kathrein')
    expect(n?.inTagen).toBe(13)
  })
})

describe('regelDesTages', () => {
  it('bevorzugt am Lostag dessen Regel', () => {
    const r = regelDesTages(tag(11, 11))
    expect(r?.lostag).toBe(true)
    expect(r?.regel.id).toBe('martini-trueb')
  })

  it('nimmt sonst eine Monatsregel ohne festen Tag, am selben Tag immer dieselbe', () => {
    const a = regelDesTages(tag(11, 12))
    expect(a?.lostag).toBe(false)
    expect(a?.regel.monat).toBe(11)
    expect(regelDesTages(tag(11, 12))?.regel.id).toBe(a?.regel.id)
  })

  it('wechselt die Monatsregel von Tag zu Tag', () => {
    const ids = new Set([1, 2, 3, 4, 5].map((t) => regelDesTages(tag(1, t))?.regel.id))
    expect(ids.size).toBeGreaterThan(1)
  })
})

describe('pruefeRegel (Trifft die Regel heuer zu?)', () => {
  it('Martini trüb: 85 % Bewölkung → trifft zu', () => {
    const e = pruefeRegel(regel('martini-trueb'), [prognose(11, 10, {}), prognose(11, 11, { wolken: 85 })])
    expect(e?.trifftZu).toBe(true)
    expect(e?.messwerte).toBe('Bewölkung am 11.11.: 85 %')
    expect(e?.satz).toContain('wird der Winter nicht lieb')
  })

  it('Martini klar: 20 % Bewölkung → greift nicht', () => {
    expect(pruefeRegel(regel('martini-trueb'), [prognose(11, 11, { wolken: 20 })])?.trifftZu).toBe(false)
  })

  it('Eisheilige: ein Frosttag im Zeitraum genügt', () => {
    const tage = [12, 13, 14, 15].map((t) => prognose(5, t, { tmin: t === 14 ? -1 : 4 }))
    const e = pruefeRegel(regel('eisheilige'), tage)
    expect(e?.trifftZu).toBe(true)
    expect(e?.messwerte.split(' · ')).toHaveLength(4)
  })

  it('Siebenschläfer nass ab 1 mm', () => {
    expect(pruefeRegel(regel('siebenschlaefer'), [prognose(6, 27, { regen: 4.2 })])?.trifftZu).toBe(true)
    expect(pruefeRegel(regel('siebenschlaefer'), [prognose(6, 27, { regen: 0.3 })])?.trifftZu).toBe(false)
  })

  it('liefert nichts, wenn der Tag nicht in der Vorhersage liegt oder die Regel keine Prüfung hat', () => {
    expect(pruefeRegel(regel('martini-trueb'), [prognose(11, 12, { wolken: 90 })])).toBeNull()
    expect(pruefeRegel(regel('kathrein-tanz'), [prognose(11, 25, {})])).toBeNull()
  })
})

describe('Hilfen', () => {
  it('liest das Testdatum aus der Adresse', () => {
    expect(testdatumAusAdresse('?datum=2026-11-11')).toEqual(tag(11, 11))
    expect(testdatumAusAdresse('?datum=2026-02-30')).toBeNull()
    expect(testdatumAusAdresse('')).toBeNull()
  })

  it('sucht nach Lostag und Region und gruppiert nach Monaten', () => {
    expect(sucheRegeln('martini').map((g) => g.monat)).toEqual([11])
    expect(sucheRegeln('').length).toBe(12)
  })

  it('schreibt Datum und Zeitraum', () => {
    expect(datumText(regel('eisheilige'))).toBe('12.–15.5.')
    expect(datumText(regel('martini-trueb'))).toBe('11.11.')
    expect(datumText(regel('januar-gras'))).toBe('Jänner')
  })
})
