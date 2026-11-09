import type { OfficialWarning, OfficialWarningLevel, OfficialWarningType, OfficialWarnings } from '../types/officialWarning'
import { fetchJsonCached } from './cache'

/**
 * Amtliche Wetterwarnungen von GeoSphere Austria (dieselben wie auf https://warnungen.zamg.at),
 * für die Gemeinde, in der ein Punkt liegt. Kostenlos, ohne Schlüssel, CORS erlaubt, Lizenz CC BY 4.0.
 * Doku: https://openapi.hub.geosphere.at/warnapi/v1/ (am 09.11.2026 geprüft)
 */
const WARN_URL = 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords'
/** Warnungen werden „im Anlassfall“ aktualisiert → 15 Minuten merken reicht. */
const MAX_AGE_MS = 15 * 60 * 1000

interface RawWarning {
  properties: {
    warnid: number
    warntypid: number
    warnstufeid: number
    text?: string
    auswirkungen?: string | null
    empfehlungen?: string | null
    meteotext?: string | null
    /** Beginn/Ende als Sekunden seit 1970 (Text) – zuverlässiger als die Felder begin/end */
    rawinfo?: { start?: string; end?: string }
  }
}

interface RawResponse {
  properties?: {
    location?: { properties?: { name?: string } }
    warnings?: RawWarning[]
  }
}

/** Liegt der Punkt in keiner österreichischen Gemeinde, antwortet der Dienst mit 404. */
class NoMunicipalityError extends Error {}

async function warnError(response: Response, what: string): Promise<Error> {
  if (response.status === 404) return new NoMunicipalityError('keine Gemeinde')
  return new Error(`${what} (GeoSphere Austria, HTTP ${response.status}).`)
}

function seconds(text: string | undefined): number | null {
  const n = Number(text)
  return text && Number.isFinite(n) ? n * 1000 : null
}

function toWarning(raw: RawWarning): OfficialWarning | null {
  const p = raw.properties
  if (p.warntypid < 1 || p.warntypid > 7 || p.warnstufeid < 1 || p.warnstufeid > 3) return null
  return {
    id: p.warnid,
    type: p.warntypid as OfficialWarningType,
    level: p.warnstufeid as OfficialWarningLevel,
    start: seconds(p.rawinfo?.start),
    end: seconds(p.rawinfo?.end),
    text: p.text?.trim() ?? '',
    impacts: p.auswirkungen?.trim() ?? '',
    advice: p.empfehlungen?.trim() ?? '',
    meteo: p.meteotext?.trim() ?? '',
  }
}

/** Amtliche Warnungen für den Ort. Achtung: GeoSphere erwartet zuerst die Länge (lon), dann die Breite (lat). */
export async function fetchOfficialWarnings(lat: number, lon: number, signal?: AbortSignal): Promise<OfficialWarnings> {
  const params = new URLSearchParams({ lon: lon.toFixed(4), lat: lat.toFixed(4), lang: 'de' })
  try {
    const raw = await fetchJsonCached<RawResponse>(`${WARN_URL}?${params.toString()}`, 'Die amtlichen Warnungen konnten nicht geladen werden', signal, {
      maxAgeMs: MAX_AGE_MS,
      toError: warnError,
    })
    return {
      municipality: raw.properties?.location?.properties?.name ?? null,
      warnings: (raw.properties?.warnings ?? []).map(toWarning).filter((w): w is OfficialWarning => w !== null),
    }
  } catch (err) {
    if (err instanceof NoMunicipalityError) return { municipality: null, warnings: [] }
    throw err
  }
}
