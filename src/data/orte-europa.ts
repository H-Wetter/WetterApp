/** Ein Ort auf der Europa-Karte */
export interface OrtEuropa {
  /** Kurzname für die App, z. B. „paris“ */
  id: string
  name: string
  /** Kürzel des Landes wie in src/data/europa-laender.geo.json (ISO-ähnlich, z. B. „FRA“) */
  land: string
  latitude: number
  longitude: number
  /** Höhe über dem Meer (m) */
  elevation: number
  /** true = nur auf breiten Karten (am Handy ist Mitteleuropa für alle 21 zu eng) */
  nurBreit?: boolean
}

/**
 * 21 Hauptstädte, verteilt über Europa (nicht alle, sonst wird es in Mitteleuropa zu eng).
 * Am Handy nur 14 davon (die mit nurBreit fehlen dort).
 * Koordinaten und Höhe aus der Open-Meteo Geocoding API (abgefragt am 18.11.2026,
 * language=de, mit Ländercode, jeweils der Treffer mit feature_code PPLC = Hauptstadt).
 * Kiew heißt dort „Kyjiw“; in der App steht die in Österreich übliche Form „Kiew“.
 */
export const ORTE_EUROPA: OrtEuropa[] = [
  { id: 'lissabon', name: 'Lissabon', land: 'PRT', latitude: 38.72509, longitude: -9.1498, elevation: 68 },
  { id: 'madrid', name: 'Madrid', land: 'ESP', latitude: 40.4165, longitude: -3.70256, elevation: 665 },
  { id: 'dublin', name: 'Dublin', land: 'IRL', latitude: 53.33306, longitude: -6.24889, elevation: 17, nurBreit: true },
  { id: 'london', name: 'London', land: 'GBR', latitude: 51.50853, longitude: -0.12574, elevation: 25 },
  { id: 'paris', name: 'Paris', land: 'FRA', latitude: 48.85341, longitude: 2.3488, elevation: 42 },
  { id: 'amsterdam', name: 'Amsterdam', land: 'NLD', latitude: 52.37403, longitude: 4.88969, elevation: 13, nurBreit: true },
  { id: 'bern', name: 'Bern', land: 'CHE', latitude: 46.94809, longitude: 7.44744, elevation: 549, nurBreit: true },
  { id: 'rom', name: 'Rom', land: 'ITA', latitude: 41.89193, longitude: 12.51133, elevation: 20 },
  { id: 'berlin', name: 'Berlin', land: 'DEU', latitude: 52.52437, longitude: 13.41053, elevation: 74 },
  { id: 'kopenhagen', name: 'Kopenhagen', land: 'DNK', latitude: 55.67594, longitude: 12.56553, elevation: 14, nurBreit: true },
  { id: 'oslo', name: 'Oslo', land: 'NOR', latitude: 59.91273, longitude: 10.74609, elevation: 26 },
  { id: 'stockholm', name: 'Stockholm', land: 'SWE', latitude: 59.32938, longitude: 18.06871, elevation: 17 },
  { id: 'helsinki', name: 'Helsinki', land: 'FIN', latitude: 60.16952, longitude: 24.93545, elevation: 26 },
  { id: 'warschau', name: 'Warschau', land: 'POL', latitude: 52.22977, longitude: 21.01178, elevation: 113 },
  { id: 'prag', name: 'Prag', land: 'CZE', latitude: 50.08804, longitude: 14.42076, elevation: 202, nurBreit: true },
  { id: 'wien', name: 'Wien', land: 'AUT', latitude: 48.20849, longitude: 16.37208, elevation: 171 },
  { id: 'budapest', name: 'Budapest', land: 'HUN', latitude: 47.49835, longitude: 19.04045, elevation: 104, nurBreit: true },
  { id: 'belgrad', name: 'Belgrad', land: 'SRB', latitude: 44.80401, longitude: 20.46513, elevation: 120, nurBreit: true },
  { id: 'bukarest', name: 'Bukarest', land: 'ROU', latitude: 44.43225, longitude: 26.10626, elevation: 83 },
  { id: 'athen', name: 'Athen', land: 'GRC', latitude: 37.98376, longitude: 23.72784, elevation: 70 },
  { id: 'kiew', name: 'Kiew', land: 'UKR', latitude: 50.45466, longitude: 30.5238, elevation: 187 },
]
