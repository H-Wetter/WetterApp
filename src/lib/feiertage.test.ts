import { describe, expect, it } from 'vitest'
import { FEIERTAGE } from '../data/feiertage'
import { datumIm, datumKurz, ersterAdvent, feiertageAm, naechsteFeiertage, ostersonntag } from './feiertage'

const tag = (jahr: number, monat: number, t: number) => ({ jahr, monat, tag: t })
const name = (id: string) => FEIERTAGE.find((f) => f.id === id)!

describe('ostersonntag', () => {
  it('stimmt mit dem Kalender überein', () => {
    expect(ostersonntag(2024)).toEqual(tag(2024, 3, 31))
    expect(ostersonntag(2025)).toEqual(tag(2025, 4, 20))
    expect(ostersonntag(2026)).toEqual(tag(2026, 4, 5))
    expect(ostersonntag(2027)).toEqual(tag(2027, 3, 28))
    // Grenzfälle: frühestes und spätestes Ostern
    expect(ostersonntag(2285)).toEqual(tag(2285, 3, 22))
    expect(ostersonntag(2038)).toEqual(tag(2038, 4, 25))
  })
})

describe('ersterAdvent', () => {
  it('ist der Sonntag zwischen 27.11. und 3.12.', () => {
    expect(ersterAdvent(2026)).toEqual(tag(2026, 11, 29))
    expect(ersterAdvent(2025)).toEqual(tag(2025, 11, 30))
    expect(ersterAdvent(2027)).toEqual(tag(2027, 11, 28))
    expect(ersterAdvent(2022)).toEqual(tag(2022, 11, 27))
  })
})

describe('bewegliche Feste 2026', () => {
  it('liegen richtig', () => {
    expect(datumIm(name('aschermittwoch'), 2026)).toEqual(tag(2026, 2, 18))
    expect(datumIm(name('karfreitag'), 2026)).toEqual(tag(2026, 4, 3))
    expect(datumIm(name('himmelfahrt'), 2026)).toEqual(tag(2026, 5, 14))
    expect(datumIm(name('pfingstmontag'), 2026)).toEqual(tag(2026, 5, 25))
    expect(datumIm(name('fronleichnam'), 2026)).toEqual(tag(2026, 6, 4))
    expect(datumIm(name('ewigkeitssonntag'), 2026)).toEqual(tag(2026, 11, 22))
  })

  it('Himmelfahrt und Fronleichnam sind Donnerstage, Aschermittwoch ein Mittwoch', () => {
    for (const jahr of [2025, 2026, 2027, 2028]) {
      expect(datumKurz(datumIm(name('himmelfahrt'), jahr))).toMatch(/^Do\./)
      expect(datumKurz(datumIm(name('fronleichnam'), jahr))).toMatch(/^Do\./)
      expect(datumKurz(datumIm(name('aschermittwoch'), jahr))).toMatch(/^Mi\./)
    }
  })
})

describe('Liste der Feiertage', () => {
  it('hat 13 gesetzliche Feiertage', () => {
    expect(FEIERTAGE.filter((f) => f.gesetzlich).length).toBe(13)
  })
  it('hat eindeutige ids', () => {
    expect(new Set(FEIERTAGE.map((f) => f.id)).size).toBe(FEIERTAGE.length)
  })
})

describe('feiertageAm und naechsteFeiertage', () => {
  it('findet am 22.11.2026 Christkönig (katholisch) und Ewigkeitssonntag (evangelisch)', () => {
    const ids = feiertageAm(tag(2026, 11, 22)).map((f) => f.id)
    expect(ids).toContain('christkoenig')
    expect(ids).toContain('ewigkeitssonntag')
  })
  it('nennt gesetzliche Feiertage zuerst (1.5.: Staatsfeiertag)', () => {
    expect(feiertageAm(tag(2026, 5, 1))[0].id).toBe('staatsfeiertag')
  })
  it('gewöhnlicher Tag: kein Fest', () => {
    expect(feiertageAm(tag(2026, 11, 18))).toEqual([])
  })
  it('zählt ab heute: am 18.11.2026 kommen Ewigkeitssonntag, 1. Advent, Nikolaus …', () => {
    const n = naechsteFeiertage(tag(2026, 11, 18), 3)
    expect(n.map((t) => t.inTagen)).toEqual([4, 11, 18])
    expect(n[1].feste[0].id).toBe('advent1')
    // 6.12.2026 ist ein Sonntag: 2. Advent und Nikolaus am selben Tag
    expect(n[2].feste.map((f) => f.id).sort()).toEqual(['advent2', 'nikolaus'])
  })
  it('geht über den Jahreswechsel', () => {
    const n = naechsteFeiertage(tag(2026, 12, 30), 1)
    expect(n[0].datum).toEqual(tag(2027, 1, 1))
  })
  it('heute zählt mit', () => {
    expect(naechsteFeiertage(tag(2026, 12, 25), 1)[0].inTagen).toBe(0)
  })
})
