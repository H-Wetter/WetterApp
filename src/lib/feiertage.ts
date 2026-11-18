import { FEIERTAGE, type Feiertag, type Konfession } from '../data/feiertage'
import type { Kalendertag } from './bauernregeln'

/**
 * Feiertage und kirchliche Feste: an welchem Datum liegt ein Fest in einem Jahr,
 * welches Fest ist heute, welches kommt als Nächstes.
 * Alle Daten als Kalendertag (ohne Uhrzeit), gerechnet in UTC, damit keine Zeitzone stört.
 */

const TAG_MS = 86_400_000

/** Kalendertag → Zahl (ms, Mitternacht UTC) zum Rechnen */
function ms(d: Kalendertag): number {
  return Date.UTC(d.jahr, d.monat - 1, d.tag)
}

function ausMs(t: number): Kalendertag {
  const d = new Date(t)
  return { jahr: d.getUTCFullYear(), monat: d.getUTCMonth() + 1, tag: d.getUTCDate() }
}

/**
 * Ostersonntag eines Jahres (gregorianischer Kalender, Formel nach Gauß in der Fassung von Meeus).
 * Ostern = erster Sonntag nach dem ersten Frühlingsvollmond; die Formel rechnet mit dem
 * „kirchlichen“ Vollmond, wie ihn die Kirchen festgelegt haben.
 */
export function ostersonntag(jahr: number): Kalendertag {
  const a = jahr % 19
  const b = Math.floor(jahr / 100)
  const c = jahr % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const monat = Math.floor((h + l - 7 * m + 114) / 31)
  const tag = ((h + l - 7 * m + 114) % 31) + 1
  return { jahr, monat, tag }
}

/** 1. Adventsonntag: der Sonntag zwischen 27. November und 3. Dezember (vierter Sonntag vor Weihnachten) */
export function ersterAdvent(jahr: number): Kalendertag {
  const start = Date.UTC(jahr, 10, 27) // 27. November
  const wochentag = new Date(start).getUTCDay() // 0 = Sonntag
  return ausMs(start + ((7 - wochentag) % 7) * TAG_MS)
}

/** Datum eines Festes in einem Jahr */
export function datumIm(f: Feiertag, jahr: number): Kalendertag {
  switch (f.datum.art) {
    case 'fest':
      return { jahr, monat: f.datum.monat, tag: f.datum.tag }
    case 'ostern':
      return ausMs(ms(ostersonntag(jahr)) + f.datum.tage * TAG_MS)
    case 'advent':
      return ausMs(ms(ersterAdvent(jahr)) + f.datum.tage * TAG_MS)
  }
}

const gleich = (a: Kalendertag, b: Kalendertag) => a.jahr === b.jahr && a.monat === b.monat && a.tag === b.tag

/** Alle Feste an diesem Tag (gesetzliche zuerst) */
export function feiertageAm(d: Kalendertag, liste: Feiertag[] = FEIERTAGE): Feiertag[] {
  return liste.filter((f) => gleich(datumIm(f, d.jahr), d)).sort((a, b) => Number(b.gesetzlich) - Number(a.gesetzlich))
}

export interface FeiertagTermin {
  datum: Kalendertag
  /** 0 = heute, 1 = morgen … */
  inTagen: number
  feste: Feiertag[]
}

/**
 * Die nächsten Tage mit Festen ab heute (heute eingeschlossen), höchstens `anzahl` Tage mit Festen
 * und höchstens `maxTage` voraus.
 */
export function naechsteFeiertage(heute: Kalendertag, anzahl = 4, maxTage = 60, liste: Feiertag[] = FEIERTAGE): FeiertagTermin[] {
  const out: FeiertagTermin[] = []
  const start = ms(heute)
  for (let i = 0; i <= maxTage && out.length < anzahl; i++) {
    const datum = ausMs(start + i * TAG_MS)
    const feste = feiertageAm(datum, liste)
    if (feste.length > 0) out.push({ datum, inTagen: i, feste })
  }
  return out
}

/** Kurze Bezeichnung für die Konfession */
export const KONFESSION_TEXT: Record<Konfession, string> = {
  beide: 'katholisch und evangelisch',
  katholisch: 'katholisch',
  evangelisch: 'evangelisch',
  staatlich: 'staatlich',
}

const WOCHENTAGE = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.']

/** „So., 22.11.“ */
export function datumKurz(d: Kalendertag): string {
  return `${WOCHENTAGE[new Date(ms(d)).getUTCDay()]}, ${d.tag}.${d.monat}.`
}

/** „heute“, „morgen“, „in 4 Tagen“ */
export function abstandText(inTagen: number): string {
  if (inTagen === 0) return 'heute'
  if (inTagen === 1) return 'morgen'
  return `in ${inTagen} Tagen`
}
