import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'

/** Kürzel der Bundesländer, wie in src/data/bundeslaender.geo.json */
export type BundeslandId = 'W' | 'N' | 'O' | 'S' | 'T' | 'V' | 'St' | 'K' | 'B'

export interface BundeslandProps {
  id: BundeslandId
  name: string
  hauptstadt: string
}

export type BundeslandFeature = Feature<Polygon | MultiPolygon, BundeslandProps>

/** Inhalt von src/data/bundeslaender.geo.json (erzeugt von scripts/make-austria-map.mjs) */
export interface BundeslaenderDaten extends FeatureCollection<Polygon | MultiPolygon, BundeslandProps> {
  /** Pflicht-Quellenangabe (CC BY 4.0) */
  quelle: string
  stand: string
}
