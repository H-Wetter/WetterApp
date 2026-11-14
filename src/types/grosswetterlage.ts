/** Europa-Raster für die Großwetterlage (Etappe 18). */
export interface EuropeGrid {
  /** Breitengrade der Zeilen, von Nord nach Süd */
  lats: number[]
  /** Längengrade der Spalten, von West nach Ost */
  lons: number[]
  /** Zeitpunkte in ms (echte UTC-Zeit, alle 6 Stunden) */
  times: number[]
  /** Luftdruck auf Meereshöhe in hPa: pressure[zeit][zeile * Spaltenzahl + spalte], Lücken als null */
  pressure: (number | null)[][]
  /** Höhe der 500-hPa-Fläche in Metern, gleiche Anordnung */
  z500: (number | null)[][]
  /** Wann wurden die Daten geholt? (ms) */
  fetchedAt: number
}

/** Ein erkanntes Hoch (H) oder Tief (T). */
export interface PressureCenter {
  kind: 'H' | 'T'
  lat: number
  lon: number
  /** Kerndruck in hPa (Wert am Rasterpunkt, der echte Kern kann etwas tiefer bzw. höher sein) */
  hPa: number
  /** Lage in Worten, z. B. „über der Biskaya“ */
  lage: string
  /** Wie deutlich hebt sich der Kern von seiner Umgebung ab? (hPa) */
  auspraegung: number
  /** Entfernung zur Mitte Österreichs in km */
  distanzKm: number
  /** Kern liegt am Rand des Rasters: Das eigentliche Zentrum kann außerhalb liegen. */
  amRand: boolean
}

/** Werte, die die App an den Alpenpunkten holt (Namen wie bei Open-Meteo). */
export type AlpenVariable =
  | 'pressure_msl'
  | 'geopotential_height_500hPa'
  | 'wind_speed_700hPa'
  | 'wind_direction_700hPa'
  | 'temperature_850hPa'
  | 'cape'
  | 'freezing_level_height'
  | 'precipitation'

/** Zeitreihen an den Alpenpunkten, je Punkt und Modell (Etappe 18b). */
export interface AlpenDaten {
  /** Zeitpunkte in ms (echte UTC-Zeit, alle 3 Stunden, beginnt 2 Tage vor heute) */
  times: number[]
  /** Modelle, z. B. „ecmwf_ifs025“ */
  models: string[]
  /** werte[Punkt-ID][Modell][Variable][Zeit]; Regen ist die Summe der 3 Stunden davor */
  werte: Record<string, Record<string, Record<AlpenVariable, (number | null)[]>>>
}

/** Saharastaub an den österreichischen Alpenpunkten (Etappe 18d), stündlich, reicht ca. 5 Tage. */
export interface StaubDaten {
  /** Zeitpunkte in ms (echte UTC-Zeit) */
  times: number[]
  /** Staub in µg/m³ je Punkt-ID */
  dust: Record<string, (number | null)[]>
  /** Trübung der Luft (Aerosol-optische Dicke, ohne Einheit) je Punkt-ID */
  aod: Record<string, (number | null)[]>
}
