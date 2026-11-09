import type { MultiModelForecast } from '../types/forecast'
import type { Measurement, Station, StationCandidate } from '../types/station'
import { MIN_HEIGHT_DIFFERENCE, distanceKm } from './inversion'
import { statsForValues } from './statistics'

/**
 * Auswahl der passenden Messstation (GeoSphere Austria) und Vergleich mit der Vorhersage.
 */

/** Stationen weiter weg als das zählen nicht mehr als „hier gemessen“ (km). */
export const MAX_STATION_DISTANCE_KM = 25
/**
 * Höchstens so viel Höhenunterschied zum Ort (m). Sonst misst die Station „anderes Wetter“:
 * Bei Inversion ist es z. B. am Schöckl 6 °C wärmer als in Graz, obwohl beide nah beisammen liegen.
 */
export const MAX_HEIGHT_DIFF_M = 250
/**
 * So viele Stationen fragen wir auf einmal ab (kostet trotzdem nur EINEN Abruf) – falls die nächste
 * gerade nichts sendet oder nicht alles misst. In Graz z. B. misst „Lendplatz“ keinen Wind und
 * der „Feuerwehrturm“ keine Temperatur.
 */
const CANDIDATE_COUNT = 8
/** Eine vollständige Station darf so weit weg sein (km), bevor wir lieber eine nähere unvollständige nehmen. */
const COMPLETE_MAX_KM = 10
/** Ältere Messungen bekommen einen Hinweis (ms). */
export const STALE_AFTER_MS = 60 * 60 * 1000

/**
 * Grober Rahmen um Österreich (mit etwas Rand). Liegt der Ort außerhalb, fragen wir GeoSphere
 * gar nicht erst – das spart Abrufe, denn es gibt dort keine Stationen.
 */
const AUSTRIA_BOX = { south: 46.1, north: 49.3, west: 9.2, east: 17.4 }

export function isNearAustria(lat: number, lon: number): boolean {
  return lat >= AUSTRIA_BOX.south && lat <= AUSTRIA_BOX.north && lon >= AUSTRIA_BOX.west && lon <= AUSTRIA_BOX.east
}

/**
 * Die nächsten Stationen mit ähnlicher Höhe, nächste zuerst.
 * Ist die Höhe des Orts unbekannt (z. B. GPS), zählt nur die Entfernung.
 * Gibt es keine mit ähnlicher Höhe, nehmen wir notfalls die nächsten überhaupt –
 * der Höhenunterschied wird dann in der Anzeige genannt.
 */
export function nearbyStations(stations: Station[], lat: number, lon: number, elevation: number | undefined): StationCandidate[] {
  const all = stations
    .map((station) => ({
      station,
      distanceKm: distanceKm(lat, lon, station.lat, station.lon),
      heightDiff: elevation === undefined ? null : station.altitude - elevation,
    }))
    .filter((c) => c.distanceKm <= MAX_STATION_DISTANCE_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm)

  const similar = all.filter((c) => c.heightDiff === null || Math.abs(c.heightDiff) <= MAX_HEIGHT_DIFF_M)
  return (similar.length > 0 ? similar : all).slice(0, CANDIDATE_COUNT)
}

/** Misst die Station alles Wichtige? Manche Stadtstationen (z. B. „Graz Lendplatz“) haben keinen Wind- oder Regenmesser. */
function isComplete(m: Measurement): boolean {
  return m.temp !== null && m.humidity !== null && m.wind !== null && m.precipitation !== null
}

/**
 * Wählt die Station für die Anzeige (Kandidaten sind schon nach Eignung sortiert):
 * zuerst die nächste, die alle Hauptwerte liefert (bis COMPLETE_MAX_KM entfernt);
 * gibt es keine, die nächste mit Temperatur.
 * @param preferComplete false = nur die Temperatur zählt (für den Berg: Die Gipfelstation ist wichtiger
 *   als ein Regenmesser – der Schöckl z. B. liefert nicht alle Werte, eine Talstation daneben schon)
 */
export function firstWithData(
  candidates: StationCandidate[],
  measurements: Measurement[],
  preferComplete = true,
): { candidate: StationCandidate; measurement: Measurement } | null {
  const pairs = candidates.flatMap((candidate) => {
    const measurement = measurements.find((m) => m.stationId === candidate.station.id)
    return measurement && measurement.temp !== null ? [{ candidate, measurement }] : []
  })
  if (!preferComplete) return pairs[0] ?? null
  return pairs.find((p) => isComplete(p.measurement) && p.candidate.distanceKm <= COMPLETE_MAX_KM) ?? pairs[0] ?? null
}

/** Mittelwert aller Modelle zur Stunde der Messung – für „Modelle: … · gemessen: …“. */
export interface ModelNow {
  temp: number | null
  wind: number | null
  gust: number | null
  /** Anzahl Modelle mit Temperaturwert */
  count: number
}

/**
 * Sucht in der Vorhersage die Stunde, die der Messung am nächsten liegt, und mittelt alle Modelle.
 * Achtung Zeiten: Messungen sind echte UTC-Zeit, die Vorhersage „Ortszeit als UTC“ –
 * darum wird die Zeitverschiebung des Orts dazugerechnet.
 */
export function modelValuesAt(forecast: MultiModelForecast, utcTime: number): ModelNow | null {
  const local = utcTime + forecast.utcOffsetSeconds * 1000
  let best = -1
  let bestDiff = Infinity
  forecast.times.forEach((t, i) => {
    const diff = Math.abs(t - local)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  })
  // mehr als eine Stunde daneben → die Vorhersage deckt den Zeitpunkt nicht ab
  if (best < 0 || bestDiff > 60 * 60 * 1000) return null

  const at = (variable: 'temperature_2m' | 'wind_speed_10m' | 'wind_gusts_10m') =>
    statsForValues(forecast.availableModels.map((id) => forecast.data[variable][id]?.[best]))
  const temp = at('temperature_2m')
  return { temp: temp.mean, wind: at('wind_speed_10m').mean, gust: at('wind_gusts_10m').mean, count: temp.count }
}

/**
 * Stationsnamen lesbarer machen: „GRAZ-THALERHOF-FLUGHAFEN“ → „Graz-Thalerhof-Flughafen“.
 * Umlaute schreibt GeoSphere als AE/OE/UE („SCHOECKL“) – die lassen wir, wie sie sind,
 * weil man nicht sicher erkennen kann, ob ein echtes „ue“ gemeint ist (z. B. „Kufstein“ vs. „Mueller“).
 */
export function prettyStationName(name: string): string {
  return name.toLowerCase().replace(/(^|[\s\-/(])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

/** Kurzer Text zum Sonnenschein der letzten 10 Minuten (0–600 s). */
export function sunshineText(seconds: number | null): string | null {
  if (seconds === null) return null
  if (seconds >= 420) return 'sonnig'
  if (seconds >= 120) return 'zeitweise Sonne'
  return 'keine Sonne'
}

// ---------- Berg & Tal (Etappe 14b) ----------

/** Eine Bergstation darf so weit vom gefundenen Berg entfernt sein (km). */
export const MOUNTAIN_STATION_MAX_KM = 15
/** Übliche Temperaturabnahme mit der Höhe (°C pro 100 m) – Standardatmosphäre */
const LAPSE_PER_100M = 0.65

/**
 * Stationen für den Berg: nahe beim gefundenen Gipfel und mindestens MIN_HEIGHT_DIFFERENCE (300 m)
 * höher als die Talstation. Am besten passt eine Station, die nah ist UND ungefähr auf Gipfelhöhe liegt:
 * Wertung = Entfernung (km) + Höhenunterschied zum Gipfel / 100 (also 100 m zählen wie 1 km).
 */
export function mountainStations(
  stations: Station[],
  lat: number,
  lon: number,
  summitElevation: number,
  valleyStationAltitude: number,
): StationCandidate[] {
  return stations
    .filter((s) => s.altitude >= valleyStationAltitude + MIN_HEIGHT_DIFFERENCE)
    .map((station) => ({
      station,
      distanceKm: distanceKm(lat, lon, station.lat, station.lon),
      heightDiff: station.altitude - summitElevation,
    }))
    .filter((c) => c.distanceKm <= MOUNTAIN_STATION_MAX_KM)
    .sort((a, b) => a.distanceKm + Math.abs(a.heightDiff) / 100 - (b.distanceKm + Math.abs(b.heightDiff) / 100))
    .slice(0, CANDIDATE_COUNT)
}

export interface MeasuredInversion {
  /** Temperatur Berg − Tal (°C): positiv = oben wärmer */
  diff: number
  /** So viel kälter wäre es oben „normalerweise“ (°C, positiv) */
  expectedDrop: number
  /** Höhenunterschied der beiden Stationen (m) */
  heightDiff: number
  /**
   * 'inversion' – oben wärmer als unten
   * 'stable'    – oben kälter, aber deutlich weniger als üblich (Luft geschichtet, Inversion in der Nähe)
   * 'normal'    – übliche Abnahme oder mehr
   */
  kind: 'inversion' | 'stable' | 'normal'
}

/** Vergleicht die gemessenen Temperaturen von Tal- und Bergstation. */
export function measuredInversion(valleyTemp: number, valleyAltitude: number, mountainTemp: number, mountainAltitude: number): MeasuredInversion {
  const diff = mountainTemp - valleyTemp
  const heightDiff = mountainAltitude - valleyAltitude
  const expectedDrop = (heightDiff / 100) * LAPSE_PER_100M
  // „stabil“: weniger als die Hälfte der üblichen Abnahme
  const kind = diff > 0 ? 'inversion' : -diff < expectedDrop / 2 ? 'stable' : 'normal'
  return { diff, expectedDrop, heightDiff, kind }
}

// ---------- Anzeige-Hilfen ----------

/** Zahl mit Komma und echtem Minuszeichen, z. B. „−1,7“ */
export function formatNum(v: number, digits = 1): string {
  return v.toFixed(digits).replace('.', ',').replace('-', '−')
}

/** Uhrzeit in Österreich, z. B. „08:20“ (alle GeoSphere-Stationen liegen in Österreich) */
export function formatViennaClock(utcMs: number): string {
  return new Date(utcMs).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' })
}
