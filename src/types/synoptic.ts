/** Raster für die Großwetterlage (Europa). */
export interface SynopticGrid {
  /** Breitengrade der Zeilen, von Nord nach Süd */
  lats: number[]
  /** Längengrade der Spalten, von West nach Ost */
  lons: number[]
  /** Zeitpunkte in ms (echte UTC-Zeit, nicht Ortszeit!) */
  times: number[]
  /** Luftdruck auf Meereshöhe in hPa: pressure[zeit][zeile * Spaltenzahl + spalte] */
  pressure: number[][]
  /** Höhe der 500-hPa-Fläche in Dekametern (gpdm), gleiche Anordnung */
  z500: number[][]
  /** Wann wurden die Daten geholt? (ms, UTC) */
  fetchedAt: number
}

/** Eine Isolinie (z. B. Isobare 1015 hPa) als Liste von Linienzügen aus [Breite, Länge]. */
export interface Isoline {
  value: number
  lines: [number, number][][]
}

/** Eine Farbfläche (alles ≥ value) als Polygone aus [Breite, Länge]. */
export interface IsoBand {
  value: number
  polygons: [number, number][][][]
}

/** Hoch- oder Tiefdruckzentrum. */
export interface PressureCenter {
  kind: 'H' | 'T'
  lat: number
  lon: number
  value: number
}
