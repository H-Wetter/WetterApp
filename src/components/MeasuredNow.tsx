import { useEffect, useMemo, useState } from 'react'
import { fetchMeasurements, fetchStations } from '../api/geosphere'
import { friendlyError } from '../api/errors'
import {
  MAX_HEIGHT_DIFF_M,
  MAX_STATION_DISTANCE_KM,
  STALE_AFTER_MS,
  firstWithData,
  isNearAustria,
  modelValuesAt,
  nearbyStations,
  prettyStationName,
  sunshineText,
} from '../lib/stations'
import { compassName } from '../lib/wind'
import type { MultiModelForecast } from '../types/forecast'
import type { WeatherLocation } from '../types/location'
import type { Measurement, StationCandidate } from '../types/station'
import { ErrorMessage } from './ErrorMessage'
import { Loading } from './Loading'

type Result =
  | { key: string; status: 'none' }
  | { key: string; status: 'error'; message: string }
  | { key: string; status: 'ok'; candidate: StationCandidate; measurement: Measurement; stale: boolean }

/** Zahl mit Komma, z. B. −1,7 */
function num(v: number, digits = 1): string {
  return v.toFixed(digits).replace('.', ',').replace('-', '−')
}

/** Uhrzeit in Österreich, z. B. „08:20“ (die Stationen liegen alle in Österreich) */
function clock(utcMs: number): string {
  return new Date(utcMs).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' })
}

/**
 * Karte „Jetzt gemessen“: echte Messwerte der nächsten Station von GeoSphere Austria,
 * daneben der Mittelwert der Modelle für dieselbe Stunde. Nur in Österreich.
 */
export function MeasuredNow({ location, forecast }: { location: WeatherLocation; forecast: MultiModelForecast }) {
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const inAustria = isNearAustria(location.latitude, location.longitude)
  const key = `${location.latitude},${location.longitude},${location.elevation ?? ''},${reload}`

  useEffect(() => {
    if (!inAustria) return
    const controller = new AbortController()
    fetchStations(controller.signal)
      .then(async (stations) => {
        const candidates = nearbyStations(stations, location.latitude, location.longitude, location.elevation)
        if (candidates.length === 0) {
          setResult({ key, status: 'none' })
          return
        }
        const measurements = await fetchMeasurements(
          candidates.map((c) => c.station.id),
          controller.signal,
        )
        const found = firstWithData(candidates, measurements)
        // „veraltet“ hier beim Laden prüfen (nicht beim Zeichnen – dort soll die Uhr keine Rolle spielen)
        setResult(found ? { key, status: 'ok', ...found, stale: Date.now() - found.measurement.time > STALE_AFTER_MS } : { key, status: 'none' })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setResult({ key, status: 'error', message: friendlyError(err) })
      })
    return () => controller.abort()
  }, [key, inAustria, location.latitude, location.longitude, location.elevation])

  const current = result && result.key === key ? result : null
  const model = useMemo(
    () => (current?.status === 'ok' ? modelValuesAt(forecast, current.measurement.time) : null),
    [current, forecast],
  )

  // Außerhalb Österreichs gibt es keine GeoSphere-Stationen – dann zeigen wir die Karte gar nicht.
  if (!inAustria) return null

  return (
    <section className="card measured">
      <h2 className="measured-title">Jetzt gemessen</h2>
      {!current && <Loading small>Messwerte der nächsten Station werden geladen …</Loading>}
      {current?.status === 'error' && <ErrorMessage small message={current.message} onRetry={() => setReload((r) => r + 1)} />}
      {current?.status === 'none' && (
        <p className="muted small">
          Keine Messstation von GeoSphere Austria in der Nähe (bis {MAX_STATION_DISTANCE_KM} km) liefert gerade Daten.
        </p>
      )}
      {current?.status === 'ok' && <MeasuredBody candidate={current.candidate} m={current.measurement} stale={current.stale} model={model} />}
      <p className="muted small measured-source">
        Datenquelle:{' '}
        <a href="https://data.hub.geosphere.at/" target="_blank" rel="noopener noreferrer">
          GeoSphere Austria
        </a>{' '}
        (Messnetz TAWES, CC BY 4.0). Messungen alle 10 Minuten.
      </p>
    </section>
  )
}

function MeasuredBody({
  candidate,
  m,
  stale,
  model,
}: {
  candidate: StationCandidate
  m: Measurement
  stale: boolean
  model: ReturnType<typeof modelValuesAt>
}) {
  const { station, distanceKm, heightDiff } = candidate
  const farInHeight = heightDiff !== null && Math.abs(heightDiff) > MAX_HEIGHT_DIFF_M
  const sun = sunshineText(m.sunshine)

  return (
    <>
      <p className="small">
        <strong>{prettyStationName(station.name)}</strong> · {num(distanceKm, distanceKm < 10 ? 1 : 0)} km entfernt ·{' '}
        {Math.round(station.altitude)} m · Messung {clock(m.time)} Uhr
      </p>
      {stale && <p className="notice small">Diese Messung ist älter als eine Stunde – die Station sendet gerade nichts Neues.</p>}
      {farInHeight && heightDiff !== null && (
        <p className="notice small">
          Die Station liegt {Math.abs(Math.round(heightDiff))} m {heightDiff > 0 ? 'höher' : 'tiefer'} als dein Ort – die Werte
          können darum spürbar abweichen.
        </p>
      )}

      <dl className="measured-grid">
        <div>
          <dt>Temperatur</dt>
          <dd>
            <strong className="measured-big">{m.temp !== null ? `${num(m.temp)} °C` : '–'}</strong>
            {model && model.temp !== null && <span className="muted small">Modelle: {num(model.temp)} °C</span>}
          </dd>
        </div>
        <div>
          <dt>Feuchte</dt>
          <dd>
            {m.humidity !== null ? `${Math.round(m.humidity)} %` : '–'}
            {m.dewPoint !== null && <span className="muted small">Taupunkt {num(m.dewPoint)} °C</span>}
          </dd>
        </div>
        <div>
          <dt>Wind</dt>
          <dd>
            {m.wind !== null ? `${Math.round(m.wind)} km/h` : '–'}
            {m.windDirection !== null && m.wind !== null && m.wind >= 3 && ` aus ${compassName(m.windDirection)}`}
            {m.gust !== null && <span className="muted small">Böen {Math.round(m.gust)} km/h</span>}
            {model && model.wind !== null && (
              <span className="muted small">
                Modelle: {Math.round(model.wind)}
                {model.gust !== null && `, Böen ${Math.round(model.gust)}`} km/h
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Niederschlag</dt>
          <dd>
            {m.precipitation === null ? '–' : m.precipitation > 0 ? `${num(m.precipitation)} mm` : 'trocken'}
            <span className="muted small">letzte 10 Min.</span>
          </dd>
        </div>
        {sun && (
          <div>
            <dt>Sonne</dt>
            <dd>
              {sun}
              <span className="muted small">letzte 10 Min.</span>
            </dd>
          </div>
        )}
        {m.snowDepth !== null && m.snowDepth > 0 && (
          <div>
            <dt>Schneehöhe</dt>
            <dd>{Math.round(m.snowDepth)} cm</dd>
          </div>
        )}
      </dl>
    </>
  )
}
