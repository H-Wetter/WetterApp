import type { PlacedWebcam, Webcam } from '../types/webcam'
import { MIN_HEIGHT_DIFFERENCE, distanceKm, type HourInversion } from './inversion'
import { compassDirection } from './terrain'

/** Umkreis für die Webcam-Suche (km) */
export const WEBCAM_DEFAULT_RADIUS_KM = 15
export const WEBCAM_RADIUS_CHOICES = [5, 10, 15, 25, 50]

/**
 * Ab wie viel Metern über dem Tal eine Webcam als „Berglage“ gilt –
 * dieselbe Schwelle wie bei „Berg & Tal“ (300 m).
 */
export const MOUNTAIN_MIN_ABOVE_VALLEY_M = MIN_HEIGHT_DIFFERENCE

/** Webcams mit Entfernung, Richtung und Höhe versehen, Fernere aussortieren, nach Entfernung sortieren. */
export function placeWebcams(
  webcams: Webcam[],
  center: { lat: number; lon: number },
  radiusKm: number,
  elevations: (number | null)[],
): PlacedWebcam[] {
  return webcams
    .map((cam, i) => ({
      ...cam,
      elevation: elevations[i] ?? null,
      distanceKm: distanceKm(center.lat, center.lon, cam.lat, cam.lon),
      direction: compassDirection(center, cam),
    }))
    // kleine Zugabe, weil Windy etwas anders rechnet
    .filter((cam) => cam.distanceKm <= radiusKm + 0.5)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

export interface WebcamGroups {
  valley: PlacedWebcam[]
  mountain: PlacedWebcam[]
  /** Webcams ohne bekannte Höhe – können wir nicht zuordnen */
  unknown: PlacedWebcam[]
}

/**
 * In Tal- und Berglage einteilen.
 * Berglage = mindestens 300 m über der Höhe des Standorts (Tal), sonst Tallage.
 */
export function groupByLevel(webcams: PlacedWebcam[], valleyElevation: number): WebcamGroups {
  const groups: WebcamGroups = { valley: [], mountain: [], unknown: [] }
  for (const cam of webcams) {
    if (cam.elevation === null) groups.unknown.push(cam)
    else if (cam.elevation - valleyElevation >= MOUNTAIN_MIN_ABOVE_VALLEY_M) groups.mountain.push(cam)
    else groups.valley.push(cam)
  }
  return groups
}

/**
 * Liegt eine Webcam bei Hochnebel darüber oder darin?
 * Mit 100 m Sicherheitsabstand, weil die Nebelobergrenze nur geschätzt ist.
 */
export function fogPosition(elevation: number | null, fogTop: number | null): 'above' | 'inside' | null {
  if (elevation === null || fogTop === null) return null
  if (elevation > fogTop + 100) return 'above'
  if (elevation < fogTop - 100) return 'inside'
  return null
}

/**
 * Für den Inversions-Hinweis reichen wenige Modelle und ein Tag – das spart Open-Meteo-Aufrufe.
 * (Die genaue Auswertung mit allen Modellen gibt es unter „Berg & Tal“.)
 */
export const INVERSION_CHECK_MODELS = ['dwd_icon_seamless', 'ecmwf_ifs', 'gfs_seamless']

/** Die Stunde, die gerade läuft (Zeiten in Ortszeit wie in der Vorhersage). */
export function inversionNow(hours: HourInversion[], localNowMs: number): HourInversion | null {
  let current: HourInversion | null = null
  for (const h of hours) if (h.t <= localNowMs) current = h
  return current
}

/** „vor 5 Min.“, „vor 2 Std.“ – wie alt das Webcam-Bild ist */
export function ageText(updatedAt: number | undefined, now = Date.now()): string | null {
  if (updatedAt === undefined) return null
  const minutes = Math.round((now - updatedAt) / 60_000)
  if (minutes < 1) return 'gerade eben'
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `vor ${hours} Std.`
  return `vor ${Math.round(hours / 24)} Tagen`
}

// ---------- Ersatz-Links, falls Windy nichts liefert ----------

export interface WebcamLink {
  label: string
  url: string
  note: string
}

/**
 * Feste Links zu Webcam-Seiten in Österreich und den Alpen.
 * Diese Seiten haben keine Such-Adresse mit Ortsnamen – darum je eine Websuche, die auf die Seite
 * beschränkt ist (DuckDuckGo, ohne Werbe-Tracking), plus die Übersicht der Seite.
 */
export function fallbackLinks(placeName: string): WebcamLink[] {
  const search = (site: string) => `https://duckduckgo.com/?q=${encodeURIComponent(`site:${site} webcam ${placeName}`)}`
  return [
    { label: `foto-webcam.eu: „${placeName}“ suchen`, url: search('foto-webcam.eu'), note: 'hochauflösende Webcams, viele Berggipfel' },
    { label: 'foto-webcam.eu: Karte aller Webcams', url: 'https://www.foto-webcam.eu/webcam/map/', note: 'Alpenraum' },
    { label: `bergfex: „${placeName}“ suchen`, url: search('bergfex.at'), note: 'Österreich, Skigebiete und Orte' },
    { label: 'bergfex: Webcams Österreich', url: 'https://www.bergfex.at/oesterreich/webcams/', note: 'Übersicht nach Regionen' },
    { label: `panomax: „${placeName}“ suchen`, url: search('panomax.com'), note: '360°-Panorama-Webcams' },
    { label: 'panomax: alle Kameras', url: 'https://explore.panomax.com/', note: 'Übersicht' },
  ]
}
