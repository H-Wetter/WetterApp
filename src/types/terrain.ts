/** Ein Punkt im Gelände */
export interface TerrainPoint {
  lat: number
  lon: number
  /** Höhe über dem Meer in m (Höhenmodell, 90 m Auflösung) */
  elevation: number
}

/** Ein gefundener Punkt mit Lage zum Standort */
export interface FoundPoint extends TerrainPoint {
  /** Entfernung vom Standort in km */
  distanceKm: number
  /** Himmelsrichtung vom Standort aus, z. B. „NO“ */
  direction: string
}

/** Ergebnis der automatischen Suche */
export interface TerrainResult {
  /** tiefster Punkt im Umkreis von 5 km – oder der Standort selbst, wenn er (fast) so tief liegt */
  valley: FoundPoint
  /** Liegt das Tal am Standort selbst? */
  valleyIsLocation: boolean
  /** höchster Punkt im gewählten Umkreis */
  mountain: FoundPoint
  /** gewählter Umkreis in km */
  radiusKm: number
}
