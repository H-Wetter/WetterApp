import type { OrtOesterreich } from '../data/orte-oesterreich'
import type { MultiModelForecast } from '../types/forecast'
import { fetchJsonCached } from './cache'
import { FORECAST_VARIABLES, parseMultiModel, type ForecastResponse } from './openMeteo'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

/**
 * Modelle für die Österreich-Karte: 6 globale Modelle statt aller 15. Jeder Ort und jedes Modell
 * zählt bei Open-Meteo vermutlich als eigener Abruf (die genaue Regel ist nicht veröffentlicht);
 * so bleibt ein Laden der Karte bei grob 30–40 gezählten Abrufen. Alle Modelle gibt es über
 * „Mehr Details“ in der Ansicht „Lokal“.
 */
export const AUSTRIA_MODELS = ['dwd_icon_seamless', 'ecmwf_ifs', 'gfs_seamless', 'meteofrance_seamless', 'ukmo_seamless', 'gem_seamless']

/** Zusätzliche stündliche Werte: Nullgradgrenze für den Detailbereich */
export const AUSTRIA_EXTRA_VARIABLES = ['freezing_level_height']

/**
 * Vorhersage für alle Orte in EINEM Abruf: Open-Meteo nimmt mehrere Koordinaten kommagetrennt
 * und antwortet dann mit einer Liste, ein Eintrag je Ort in derselben Reihenfolge.
 * Ergebnis 30 Minuten im Zwischenspeicher (Standard von fetchJsonCached).
 */
export async function fetchAustriaForecast(orte: OrtOesterreich[], days: number, signal?: AbortSignal): Promise<Map<string, MultiModelForecast>> {
  const params = new URLSearchParams({
    latitude: orte.map((o) => o.latitude.toFixed(4)).join(','),
    longitude: orte.map((o) => o.longitude.toFixed(4)).join(','),
    elevation: orte.map((o) => String(Math.round(o.elevation))).join(','),
    hourly: [...FORECAST_VARIABLES, ...AUSTRIA_EXTRA_VARIABLES].join(','),
    daily: 'sunrise,sunset',
    models: AUSTRIA_MODELS.join(','),
    forecast_days: String(days),
    timezone: 'auto',
  })
  const raw = await fetchJsonCached<ForecastResponse | ForecastResponse[]>(
    `${FORECAST_URL}?${params.toString()}`,
    'Wetterdaten für Österreich konnten nicht geladen werden',
    signal,
  )
  // Bei nur einem Ort antwortet Open-Meteo ohne Liste
  const list = Array.isArray(raw) ? raw : [raw]
  if (list.length !== orte.length) throw new Error(`Open-Meteo hat ${list.length} statt ${orte.length} Orte geliefert.`)
  return new Map(orte.map((o, i) => [o.id, parseMultiModel(list[i], AUSTRIA_MODELS, AUSTRIA_EXTRA_VARIABLES)]))
}
