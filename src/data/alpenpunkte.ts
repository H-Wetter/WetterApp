/**
 * Feste Punkte für die Großwetterlage (Etappe 18): An diesen Orten holt die App Höhenwind,
 * Temperatur in 1500 m, Luftdruck und Regen. `seite` sagt, wo der Ort zum Alpenhauptkamm liegt.
 * Bozen liegt in Südtirol und dient als Gegenstück zu Innsbruck (Föhn-Erkennung).
 */
export interface Alpenpunkt {
  id: string
  name: string
  lat: number
  lon: number
  /** Lage zum Alpenhauptkamm */
  seite: 'nord' | 'sued' | 'ost'
  /** false = liegt außerhalb Österreichs (zählt nicht zum Österreich-Mittel) */
  inOesterreich: boolean
}

export const ALPENPUNKTE: Alpenpunkt[] = [
  { id: 'bregenz', name: 'Bregenz', lat: 47.5, lon: 9.75, seite: 'nord', inOesterreich: true },
  { id: 'innsbruck', name: 'Innsbruck', lat: 47.26, lon: 11.39, seite: 'nord', inOesterreich: true },
  { id: 'bozen', name: 'Bozen', lat: 46.5, lon: 11.35, seite: 'sued', inOesterreich: false },
  { id: 'salzburg', name: 'Salzburg', lat: 47.8, lon: 13.04, seite: 'nord', inOesterreich: true },
  { id: 'linz', name: 'Linz', lat: 48.31, lon: 14.29, seite: 'nord', inOesterreich: true },
  { id: 'wien', name: 'Wien', lat: 48.21, lon: 16.37, seite: 'ost', inOesterreich: true },
  { id: 'graz', name: 'Graz', lat: 47.07, lon: 15.44, seite: 'sued', inOesterreich: true },
  { id: 'klagenfurt', name: 'Klagenfurt', lat: 46.62, lon: 14.31, seite: 'sued', inOesterreich: true },
]
