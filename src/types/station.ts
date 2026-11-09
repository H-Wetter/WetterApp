/** Eine Messstation von GeoSphere Austria (TAWES-Netz). */
export interface Station {
  /** Stationsnummer, z. B. „11240“ (Graz-Thalerhof) */
  id: string
  /** Name wie bei GeoSphere, meist in Großbuchstaben, z. B. „GRAZ-THALERHOF-FLUGHAFEN“ */
  name: string
  /** Bundesland */
  state: string
  lat: number
  lon: number
  /** Höhe über dem Meer (m) */
  altitude: number
}

/** Messwerte einer Station zu einem Zeitpunkt. Fehlt ein Wert, ist er `null`. */
export interface Measurement {
  stationId: string
  /** Messzeitpunkt (echte UTC-Zeit in ms – NICHT „Ortszeit als UTC“ wie bei Open-Meteo) */
  time: number
  /** Lufttemperatur (°C) */
  temp: number | null
  /** relative Feuchte (%) */
  humidity: number | null
  /** Taupunkt (°C) */
  dewPoint: number | null
  /** mittlerer Wind (km/h) */
  wind: number | null
  /** stärkste Böe der letzten 10 Minuten (km/h) */
  gust: number | null
  /** Windrichtung (Grad, woher der Wind kommt) */
  windDirection: number | null
  /** Niederschlag der letzten 10 Minuten (mm) */
  precipitation: number | null
  /** Sonnenschein in den letzten 10 Minuten (Sekunden, 0–600) */
  sunshine: number | null
  /** Schneehöhe (cm) */
  snowDepth: number | null
}

/** Eine Station samt Entfernung zum gewählten Ort. */
export interface StationCandidate {
  station: Station
  /** Entfernung (km) */
  distanceKm: number
  /** Höhenunterschied Station − Ort (m), `null` wenn die Höhe des Orts unbekannt ist */
  heightDiff: number | null
}
