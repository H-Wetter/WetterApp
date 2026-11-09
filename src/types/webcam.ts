/** Eine Webcam, so wie die App sie anzeigt (aus der Windy-Antwort zusammengestellt). */
export interface Webcam {
  id: string
  /** Name der Webcam, z. B. „Graz – Schlossberg“ */
  title: string
  /** Ort / Gemeinde, falls bekannt */
  city?: string
  region?: string
  country?: string
  lat: number
  lon: number
  /**
   * Vorschaubild (Adresse von Windy). Läuft nach ca. 10 Minuten ab – nie speichern,
   * sondern bei Bedarf neu abfragen.
   */
  previewUrl?: string
  /** Seite der Webcam bei Windy – hierhin muss jedes Bild verlinken (Bedingung von Windy). */
  detailUrl: string
  /** Zeitpunkt der letzten Aktualisierung des Bilds (ms), falls bekannt */
  updatedAt?: number
}

/** Webcam mit Lage zum Standort */
export interface PlacedWebcam extends Webcam {
  /** Höhe über dem Meer in m (aus dem Höhenmodell, Windy liefert keine) */
  elevation: number | null
  /** Entfernung vom Standort in km */
  distanceKm: number
  /** Himmelsrichtung vom Standort, z. B. „NO“ */
  direction: string
}
