/** Woher ein Standort stammt – wichtig für die Anzeige in der App. */
export type LocationSource = 'gps' | 'search' | 'default'

/** Ein Ort, für den wir später das Wetter abfragen. */
export interface WeatherLocation {
  name: string
  latitude: number
  longitude: number
  /** Höhe über dem Meer in Metern (nicht immer bekannt, z. B. bei GPS). */
  elevation?: number
  country?: string
  /** Bundesland / Region, z. B. „Steiermark“. */
  region?: string
  source: LocationSource
}
