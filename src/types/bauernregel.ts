/**
 * Prüfung „Trifft die Regel heuer zu?“ – nur für Regeln, die sich klar mit Prognosewerten
 * eines bestimmten Tages vergleichen lassen. Die Schwellen stehen in src/lib/bauernregeln.ts.
 * - trueb:   Bewölkung tagsüber ≥ 70 %
 * - heiter:  Bewölkung tagsüber < 35 % und trocken
 * - nass:    mindestens 1 mm Niederschlag
 * - frost:   Tiefstwert unter 0 °C
 * - schnee:  Neuschnee mindestens 0,5 cm
 * - mild:    Höchstwert mindestens 5 °C und kein Schnee („im Klee“)
 */
export type PruefArt = 'trueb' | 'heiter' | 'nass' | 'frost' | 'schnee' | 'mild'

export interface Pruefung {
  art: PruefArt
  /** Was die Regel aus diesem Wetter ableitet, z. B. „wird der Winter nicht lieb“ */
  dann: string
}

/** Gibt es eine meteorologische Grundlage? */
export type Grundlage = 'ja' | 'teilweise' | 'nein'

export interface Bauernregel {
  /** Kurzname, nur Kleinbuchstaben und Bindestriche, z. B. „martini-trueb“ */
  id: string
  /** Regel auf Hochdeutsch */
  text: string
  /** Mundart-Fassung, nur wenn sicher bekannt */
  mundart?: string
  /** Monat 1–12 */
  monat: number
  /** Lostag: fester Tag im Monat. Fehlt er, ist es eine Monatsregel. */
  tag?: number
  /** Zeitraum im selben Monat bis zu diesem Tag (z. B. Eisheilige 12.–15.5.) */
  bisTag?: number
  /** Name des Lostags, z. B. „Martini“ */
  lostag?: string
  /** Region, falls bekannt, z. B. „Steiermark“ oder „Österreich, Bayern“ */
  region?: string
  /** Was ist gemeint? 1–2 Sätze */
  erklaerung: string
  /** „Was steckt dahinter?“ */
  hintergrund: string
  grundlage: Grundlage
  /** optional: Vergleich mit der Prognose */
  pruefung?: Pruefung
  /** true = Wortlaut, Datum oder Region bitte kontrollieren */
  ungeprueft?: boolean
}
