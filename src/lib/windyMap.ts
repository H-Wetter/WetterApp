/**
 * Windy-Karte zum Einbetten (embed.windy.com) – kostenlos, ohne Schlüssel.
 * Bedingungen laut Windy: Das Windy-Logo in der Karte muss sichtbar bleiben und auf windy.com
 * verlinken (macht das Einbettungsfenster selbst). Nur für private, nichtkommerzielle Nutzung.
 * Alle Ebenen unten am 09.11.2026 im Einbettungsfenster ausprobiert.
 */

export interface WindyLayer {
  /** Name der Ebene bei Windy („overlay“) */
  id: string
  label: string
  /** Datenquelle bei Windy („product“): Messung (Radar/Satellit) oder Vorhersagemodell */
  product: string
  /** Kurze Erklärung unter der Karte */
  note: string
}

export const WINDY_LAYERS: WindyLayer[] = [
  { id: 'radar', label: 'Radar', product: 'radar', note: 'Gemessener Niederschlag der letzten Stunden – wo es gerade regnet oder schneit.' },
  { id: 'satellite', label: 'Satellit', product: 'satellite', note: 'Wolkenbild vom Satelliten (Messung). Hochnebel sieht man als glatte, helle Fläche in Tälern und Becken.' },
  { id: 'rain', label: 'Regen', product: 'ecmwf', note: 'Vorhergesagter Regen, Schnee und Gewitter (Modell ECMWF). Mit dem Zeitschieber in die Zukunft blättern.' },
  { id: 'wind', label: 'Wind', product: 'ecmwf', note: 'Vorhergesagter Wind in 10 m Höhe (ECMWF). Die Linien zeigen die Windrichtung.' },
  { id: 'gust', label: 'Böen', product: 'ecmwf', note: 'Vorhergesagte Windböen (ECMWF) – kurze, kräftige Windstöße.' },
  { id: 'temp', label: 'Temperatur', product: 'ecmwf', note: 'Vorhergesagte Temperatur in 2 m Höhe (ECMWF).' },
  { id: 'clouds', label: 'Wolken', product: 'ecmwf', note: 'Vorhergesagte Bewölkung (ECMWF).' },
  { id: 'snowAccu', label: 'Neuschnee', product: 'ecmwf', note: 'Vorhergesagter Neuschnee (ECMWF), aufsummiert.' },
  { id: 'cape', label: 'Gewitter', product: 'ecmwf', note: 'CAPE-Index (ECMWF): je höher, desto mehr Energie für Gewitter.' },
]

export const DEFAULT_WINDY_LAYER = 'radar'

/** Adresse des Einbettungsfensters für einen Ort und eine Ebene. */
export function windyEmbedUrl(lat: number, lon: number, layer: WindyLayer, zoom = 7): string {
  const params = new URLSearchParams({
    type: 'map',
    location: 'coordinates',
    metricRain: 'mm',
    metricTemp: '°C',
    metricWind: 'km/h',
    zoom: String(zoom),
    overlay: layer.id,
    product: layer.product,
    level: 'surface',
    lat: lat.toFixed(3),
    lon: lon.toFixed(3),
    detailLat: lat.toFixed(3),
    detailLon: lon.toFixed(3),
    marker: 'true',
    message: 'true',
  })
  return `https://embed.windy.com/embed.html?${params.toString()}`
}

/** Link, der dieselbe Karte groß auf windy.com öffnet. */
export function windyPageUrl(lat: number, lon: number, layer: WindyLayer, zoom = 7): string {
  return `https://www.windy.com/?${layer.id},${lat.toFixed(3)},${lon.toFixed(3)},${zoom}`
}
