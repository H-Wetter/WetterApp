import { ENSEMBLE_VARIABLES, type EnsembleData, type EnsembleMember, type EnsembleVariable } from '../types/ensemble'
import type { Series } from '../types/forecast'
import type { WeatherLocation } from '../types/location'
import { isPlausibleElevation } from './geocoding'
import { openMeteoError } from './errors'

const ENSEMBLE_URL = 'https://ensemble-api.open-meteo.com/v1/ensemble'

interface EnsembleResponse {
  utc_offset_seconds: number
  hourly: { time: string[] } & Record<string, Series | string[]>
}

/**
 * Holt alle Rechenläufe („Member“) mehrerer Ensembles in EINER Anfrage.
 * Die Felder heißen z. B. „temperature_2m_member07_ecmwf_ifs025_ensemble“,
 * der Kontrolllauf ohne „memberNN“: „temperature_2m_ecmwf_ifs025_ensemble“.
 * Es müssen mindestens zwei Ensembles angefragt werden (sonst fehlt das Modell-Suffix).
 */
export async function fetchEnsemble(
  location: WeatherLocation,
  modelIds: string[],
  days: number,
  signal?: AbortSignal,
): Promise<EnsembleData> {
  const params = new URLSearchParams({
    latitude: location.latitude.toFixed(4),
    longitude: location.longitude.toFixed(4),
    hourly: ENSEMBLE_VARIABLES.join(','),
    models: modelIds.join(','),
    forecast_days: String(days),
    timezone: 'auto',
  })
  // gleiche Regel wie in openMeteo.ts: GPS-Höhen sind oft ungenau
  if (isPlausibleElevation(location.elevation) && location.source !== 'gps') {
    params.set('elevation', String(Math.round(location.elevation)))
  }

  const response = await fetch(`${ENSEMBLE_URL}?${params.toString()}`, { signal })
  if (!response.ok) throw await openMeteoError(response, 'Ensemble-Daten konnten nicht geladen werden')

  const raw = (await response.json()) as EnsembleResponse
  const length = raw.hourly.time.length
  const byId = new Map<string, EnsembleMember>()

  for (const [key, values] of Object.entries(raw.hourly)) {
    if (key === 'time') continue
    const variable = ENSEMBLE_VARIABLES.find((v) => key.startsWith(`${v}_`)) as EnsembleVariable | undefined
    if (!variable) continue
    const memberId = key.slice(variable.length + 1)
    const model = modelIds.find((m) => memberId === m || memberId.endsWith(`_${m}`))
    if (!model) continue

    let member = byId.get(memberId)
    if (!member) {
      const empty = (): Series => new Array<number | null>(length).fill(null)
      member = { id: memberId, model, values: { temperature_2m: empty(), precipitation: empty() } }
      byId.set(memberId, member)
    }
    member.values[variable] = values as Series
  }

  return {
    // Ortszeit „als UTC gelesen“ – wie in openMeteo.ts
    times: raw.hourly.time.map((t) => Date.parse(`${t}:00Z`)),
    utcOffsetSeconds: raw.utc_offset_seconds,
    members: [...byId.values()],
  }
}
