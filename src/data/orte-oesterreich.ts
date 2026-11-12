import type { BundeslandId } from '../types/austria'

/** Ein Ort auf der Österreich-Karte */
export interface OrtOesterreich {
  /** Kurzname für die App, z. B. „graz“ */
  id: string
  /** Name wie in der Ortssuche */
  name: string
  /** kurzer Name für die Karte (wenig Platz) */
  kurz: string
  /** Bundesland, dessen Landeshauptstadt der Ort ist (bzw. in dem er liegt) */
  bundesland: BundeslandId
  /** 'hauptstadt' oder 'berg' (Ramsau am Dachstein) */
  art: 'hauptstadt' | 'berg'
  latitude: number
  longitude: number
  /** Höhe über dem Meer (m) */
  elevation: number
}

/**
 * Die 9 Landeshauptstädte und Ramsau am Dachstein (Berglage).
 * Koordinaten und Höhe aus der Open-Meteo Geocoding API (abgefragt am 12.11.2026,
 * language=de, countryCode=AT, jeweils der Treffer mit feature_code PPLC/PPLA bzw. Ramsau PPL).
 * Nicht von Hand ändern, sondern bei Bedarf neu abfragen.
 */
export const ORTE_OESTERREICH: OrtOesterreich[] = [
  { id: 'wien', name: 'Wien', kurz: 'Wien', bundesland: 'W', art: 'hauptstadt', latitude: 48.20849, longitude: 16.37208, elevation: 171 },
  { id: 'st-poelten', name: 'St. Pölten', kurz: 'St. Pölten', bundesland: 'N', art: 'hauptstadt', latitude: 48.20762, longitude: 15.63725, elevation: 265 },
  { id: 'linz', name: 'Linz', kurz: 'Linz', bundesland: 'O', art: 'hauptstadt', latitude: 48.30639, longitude: 14.28611, elevation: 266 },
  { id: 'salzburg', name: 'Salzburg', kurz: 'Salzburg', bundesland: 'S', art: 'hauptstadt', latitude: 47.79941, longitude: 13.04399, elevation: 424 },
  { id: 'innsbruck', name: 'Innsbruck', kurz: 'Innsbruck', bundesland: 'T', art: 'hauptstadt', latitude: 47.26266, longitude: 11.39454, elevation: 570 },
  { id: 'bregenz', name: 'Bregenz', kurz: 'Bregenz', bundesland: 'V', art: 'hauptstadt', latitude: 47.50311, longitude: 9.7471, elevation: 405 },
  { id: 'graz', name: 'Graz', kurz: 'Graz', bundesland: 'St', art: 'hauptstadt', latitude: 47.06733, longitude: 15.44197, elevation: 362 },
  {
    id: 'klagenfurt',
    name: 'Klagenfurt am Wörthersee',
    kurz: 'Klagenfurt',
    bundesland: 'K',
    art: 'hauptstadt',
    latitude: 46.62472,
    longitude: 14.30528,
    elevation: 450,
  },
  { id: 'eisenstadt', name: 'Eisenstadt', kurz: 'Eisenstadt', bundesland: 'B', art: 'hauptstadt', latitude: 47.84565, longitude: 16.52327, elevation: 182 },
  {
    id: 'ramsau',
    name: 'Ramsau am Dachstein',
    kurz: 'Ramsau',
    bundesland: 'St',
    art: 'berg',
    latitude: 47.4215,
    longitude: 13.65545,
    elevation: 1123,
  },
]
