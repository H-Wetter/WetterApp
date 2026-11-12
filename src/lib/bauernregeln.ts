import { BAUERNREGELN } from '../data/bauernregeln'
import type { Bauernregel, PruefArt } from '../types/bauernregel'
import type { DaySummary } from './daily'

/**
 * Bauernregeln: welcher Lostag ist heute, welche Regel zeigen wir an,
 * und „Trifft die Regel heuer zu?“ (Vergleich mit der Prognose).
 */

/** Ein Kalendertag ohne Uhrzeit und Zeitzone */
export interface Kalendertag {
  jahr: number
  monat: number
  tag: number
}

const MONATE = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

export function monatsname(monat: number): string {
  return MONATE[monat - 1] ?? ''
}

/** Zeitpunkt aus der Vorhersage („Ortszeit als UTC“, ms) → Kalendertag */
export function kalendertag(ms: number): Kalendertag {
  const d = new Date(ms)
  return { jahr: d.getUTCFullYear(), monat: d.getUTCMonth() + 1, tag: d.getUTCDate() }
}

/**
 * Testdatum aus der Adresse, z. B. „?datum=2026-11-11“. So lassen sich Lostage ausprobieren,
 * ohne die Uhr des Computers zu verstellen. Ungültige Angaben werden ignoriert.
 */
export function testdatumAusAdresse(search: string): Kalendertag | null {
  const wert = new URLSearchParams(search).get('datum')
  const m = wert?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const [jahr, monat, tag] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const probe = new Date(Date.UTC(jahr, monat - 1, tag))
  if (probe.getUTCMonth() !== monat - 1 || probe.getUTCDate() !== tag) return null
  return { jahr, monat, tag }
}

/** Fällt der Tag auf den Lostag bzw. in den Zeitraum der Regel? */
function giltAm(r: Bauernregel, d: Kalendertag): boolean {
  if (r.tag === undefined || r.monat !== d.monat) return false
  return d.tag >= r.tag && d.tag <= (r.bisTag ?? r.tag)
}

/** Alle Lostag-Regeln, die an diesem Tag gelten */
export function regelnAmLostag(d: Kalendertag, regeln: Bauernregel[] = BAUERNREGELN): Bauernregel[] {
  return regeln.filter((r) => giltAm(r, d))
}

/** Name des Lostags an diesem Tag (für die Markierung in der Tagesliste) oder null */
export function lostagName(d: Kalendertag, regeln: Bauernregel[] = BAUERNREGELN): string | null {
  return regelnAmLostag(d, regeln)[0]?.lostag ?? null
}

/** Laufende Nummer des Tages im Jahr – damit wechselt die Monatsregel täglich, bleibt aber am selben Tag gleich */
function tagImJahr(d: Kalendertag): number {
  return Math.round((Date.UTC(d.jahr, d.monat - 1, d.tag) - Date.UTC(d.jahr, 0, 1)) / 86_400_000)
}

/**
 * Regel des Tages: Ist heute ein Lostag, dessen Regel (bei mehreren eine davon).
 * Sonst eine Monatsregel (ohne festen Tag), sonst irgendeine Regel des Monats.
 */
export function regelDesTages(d: Kalendertag, regeln: Bauernregel[] = BAUERNREGELN): { regel: Bauernregel; lostag: boolean } | null {
  const seed = tagImJahr(d)
  const lostag = regelnAmLostag(d, regeln)
  if (lostag.length > 0) return { regel: lostag[seed % lostag.length], lostag: true }
  const monat = regeln.filter((r) => r.monat === d.monat)
  const monatsregeln = monat.filter((r) => r.tag === undefined)
  const auswahl = monatsregeln.length > 0 ? monatsregeln : monat
  if (auswahl.length === 0) return null
  return { regel: auswahl[seed % auswahl.length], lostag: false }
}

/**
 * Nächster Lostag nach dem angegebenen Tag (höchstens `maxTage` voraus), z. B. für
 * „Nächster Lostag: Kathrein in 13 Tagen“.
 */
export function naechsterLostag(
  d: Kalendertag,
  maxTage = 30,
  regeln: Bauernregel[] = BAUERNREGELN,
): { regel: Bauernregel; inTagen: number; datum: Kalendertag } | null {
  const start = Date.UTC(d.jahr, d.monat - 1, d.tag)
  for (let i = 1; i <= maxTage; i++) {
    const t = new Date(start + i * 86_400_000)
    const k = { jahr: t.getUTCFullYear(), monat: t.getUTCMonth() + 1, tag: t.getUTCDate() }
    // nur den ersten Tag eines Zeitraums melden (Eisheilige ab 12.5., nicht jeden Tag einzeln)
    const r = regelnAmLostag(k, regeln).find((x) => x.tag === k.tag)
    if (r) return { regel: r, inTagen: i, datum: k }
  }
  return null
}

// ---------- „Trifft die Regel heuer zu?“ ----------

/** Wie die Bedingung in Worten heißt – erfüllt / nicht erfüllt */
const ZUSTAND: Record<PruefArt, [string, string]> = {
  trueb: ['trüb', 'nicht trüb'],
  heiter: ['heiter und trocken', 'nicht heiter'],
  nass: ['nass', 'trocken'],
  frost: ['frostig', 'frostfrei'],
  schnee: ['Schnee', 'kein Schnee'],
  mild: ['mild und ohne Schnee („im Klee“)', 'nicht mild genug'],
}

function zahl(v: number, stellen = 0): string {
  return v.toFixed(stellen).replace('.', ',').replace('-', '−')
}

/** Ist die Bedingung an diesem Tag erfüllt? Dazu der Messwert in Worten. `null` = Prognose fehlt. */
function bewerteTag(art: PruefArt, d: DaySummary): { erfuellt: boolean; wert: string } | null {
  const datum = `${new Date(d.dayStart).getUTCDate()}.${new Date(d.dayStart).getUTCMonth() + 1}.`
  const wolken = d.cloudCover
  const regen = d.precipSum.mean
  const schnee = d.snowSum ?? 0
  switch (art) {
    case 'trueb':
      if (wolken === null) return null
      return { erfuellt: wolken >= 70, wert: `Bewölkung am ${datum}: ${zahl(wolken)} %` }
    case 'heiter':
      if (wolken === null || regen === null) return null
      return { erfuellt: wolken < 35 && regen < 1, wert: `Bewölkung am ${datum}: ${zahl(wolken)} %, Niederschlag ${zahl(regen, 1)} mm` }
    case 'nass':
      if (regen === null) return null
      return { erfuellt: regen >= 1, wert: `Niederschlag am ${datum}: ${zahl(regen, 1)} mm` }
    case 'frost':
      if (d.tempMin.mean === null) return null
      return { erfuellt: d.tempMin.mean < 0, wert: `Tiefstwert am ${datum}: ${zahl(d.tempMin.mean)} °C` }
    case 'schnee':
      return { erfuellt: schnee >= 0.5, wert: `Neuschnee am ${datum}: ${zahl(schnee, 1)} cm` }
    case 'mild':
      if (d.tempMax.mean === null) return null
      return { erfuellt: d.tempMax.mean >= 5 && schnee < 0.5, wert: `Höchstwert am ${datum}: ${zahl(d.tempMax.mean)} °C` }
  }
}

export interface Pruefergebnis {
  trifftZu: boolean
  /** z. B. „Bewölkung am 11.11.: 85 %“ (bei Zeiträumen mehrere, durch „ · “ getrennt) */
  messwerte: string
  /** z. B. „Laut Prognose wird es trüb. Nach der Regel wird der Winter nicht lieb.“ */
  satz: string
}

/**
 * Vergleicht eine Regel mit der Prognose (Mittelwert der Modelle) an ihrem Lostag im Jahr der Vorhersage.
 * Bei Zeiträumen (Eisheilige) reicht ein Tag, an dem die Bedingung erfüllt ist.
 * `null`, wenn die Regel keine Prüfung hat oder der Tag nicht in der Vorhersage liegt.
 */
export function pruefeRegel(r: Bauernregel, tage: DaySummary[]): Pruefergebnis | null {
  const p = r.pruefung
  if (!p || r.tag === undefined) return null
  const passend = tage.filter((d) => giltAm(r, kalendertag(d.dayStart)))
  const bewertungen = passend.map((d) => bewerteTag(p.art, d)).filter((b): b is NonNullable<typeof b> => b !== null)
  if (bewertungen.length === 0) return null
  const trifftZu = bewertungen.some((b) => b.erfuellt)
  const [ja, nein] = ZUSTAND[p.art]
  return {
    trifftZu,
    messwerte: bewertungen.map((b) => b.wert).join(' · '),
    satz: trifftZu
      ? `Laut Prognose wird es ${ja}. Nach der Regel ${p.dann}.`
      : `Laut Prognose wird es ${nein}. Die Regel greift diesmal nicht.`,
  }
}

/** Regeln nach Monaten gruppiert und gesucht (für das Lexikon) */
export function sucheRegeln(suche: string, regeln: Bauernregel[] = BAUERNREGELN): { monat: number; regeln: Bauernregel[] }[] {
  const q = suche.trim().toLowerCase()
  const treffer = q
    ? regeln.filter((r) =>
        [r.text, r.mundart, r.lostag, r.region, r.erklaerung, monatsname(r.monat)].some((f) => f?.toLowerCase().includes(q)),
      )
    : regeln
  return Array.from({ length: 12 }, (_, i) => i + 1)
    .map((monat) => ({
      monat,
      regeln: treffer.filter((r) => r.monat === monat).sort((a, b) => (a.tag ?? 0) - (b.tag ?? 0)),
    }))
    .filter((g) => g.regeln.length > 0)
}

/** „11.11.“ oder „12.–15.5.“ bzw. Monatsname bei Monatsregeln */
export function datumText(r: Bauernregel): string {
  if (r.tag === undefined) return monatsname(r.monat)
  return r.bisTag ? `${r.tag}.–${r.bisTag}.${r.monat}.` : `${r.tag}.${r.monat}.`
}
