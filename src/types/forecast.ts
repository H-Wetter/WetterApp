/** Stündliche Größen, die wir im Modellvergleich abfragen (Namen exakt wie bei Open-Meteo). */
export type HourlyVariable =
  | 'temperature_2m'
  | 'precipitation'
  | 'wind_speed_10m'
  | 'wind_gusts_10m'
  | 'weather_code'
  | 'cloud_cover'
  | 'snowfall'
  | 'is_day'
  | 'apparent_temperature'
  | 'sunshine_duration'
  | 'precipitation_probability'

/** Sonnenauf- und -untergang eines Tages (Ortszeit, gleiches Format wie MultiModelForecast.times). */
export interface SunTimes {
  dayStart: number
  sunrise: number | null
  sunset: number | null
}

/** Eine Zeitreihe: ein Wert pro Stunde, `null` = Modell liefert für diese Stunde nichts. */
export type Series = (number | null)[]

/** Beschreibung eines Wettermodells für die Anzeige. */
export interface ModelInfo {
  /** API-Name, z. B. „ecmwf_ifs“ */
  id: string
  /** Kurzer Anzeigename, z. B. „ECMWF IFS“ */
  label: string
  /** Wetterdienst / Land */
  provider: string
  /** Linienfarbe im Diagramm */
  color: string
}

/** Ergebnis der Multi-Modell-Abfrage. */
export interface MultiModelForecast {
  /** Ortszeit des Standorts als Zahl (ms), so behandelt, als wäre es UTC – damit die Anzeige nie von der Zeitzone des Browsers abhängt. */
  times: number[]
  /** Verschiebung Ortszeit ↔ UTC in Sekunden (für die „Jetzt“-Linie). */
  utcOffsetSeconds: number
  /** Werte je Größe und Modell: data[variable][modelId] */
  data: Record<HourlyVariable, Record<string, Series>>
  /** Modelle, die für diesen Ort mindestens einen Wert geliefert haben. */
  availableModels: string[]
  /** Letzte Stunde mit Daten je Modell (Index in `times`), für „Reichweite“. */
  lastIndex: Record<string, number>
  /** Sonnenauf-/-untergang je Tag */
  sun: SunTimes[]
}

/** Statistik über alle (sichtbaren) Modelle für eine Stunde. */
export interface HourStats {
  mean: number | null
  median: number | null
  min: number | null
  max: number | null
  /** Wie viele Modelle hatten für diese Stunde einen Wert? */
  count: number
}
