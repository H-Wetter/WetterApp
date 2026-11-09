import type { MultiModelForecast } from '../types/forecast'
import type { Measurement, Station, StationCandidate } from '../types/station'
import { distanceKm } from './inversion'
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
 * Wählt die Station für die Anzeige (Kandidaten sind nach Entfernung sortiert):
 * zuerst die nächste, die alle Hauptwerte liefert (bis COMPLETE_MAX_KM entfernt);
 * gibt es keine, die nächste mit Temperatur.
 */
export function firstWithData(
  candidates: StationCandidate[],
  measurements: Measurement[],
): { candidate: StationCandidate; measurement: Measurement } | null {
  const pairs = candidates.flatMap((candidate) => {
    const measurement = measurements.find((m) => m.stationId === candidate.station.id)
    return measurement && measurement.temp !== null ? [{ candidate, measurement }] : []
  })
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
