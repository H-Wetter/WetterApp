import { useEffect, useState } from 'react'
import { fetchMeasurements, fetchStations } from '../api/geosphere'
import { friendlyError } from '../api/errors'
import { MIN_HEIGHT_DIFFERENCE } from '../lib/inversion'
import {
  MOUNTAIN_STATION_MAX_KM,
  STALE_AFTER_MS,
  firstWithData,
  formatNum,
  formatViennaClock,
  isNearAustria,
  measuredInversion,
  mountainStations,
  nearbyStations,
  prettyStationName,
} from '../lib/stations'
import type { WeatherLocation } from '../types/location'
import type { Measurement, StationCandidate } from '../types/station'
import { ErrorMessage } from './ErrorMessage'
import { Term } from './LexikonLink'
import { Loading } from './Loading'

interface Picked {
  candidate: StationCandidate
  measurement: Measurement
}

type Result =
  | { key: string; status: 'error'; message: string }
  | { key: string; status: 'ok'; valley: Picked | null; mountain: Picked | null; stale: boolean }

/**
 * Karte „Gemessen: Tal und Berg“ (Etappe 14b): je eine Messstation von GeoSphere Austria
 * im Tal und nahe beim gefundenen Berg. Ist es oben wärmer, ist die Inversion „echt“ gemessen –
 * unabhängig davon, was die Modelle rechnen. Nur in Österreich.
 */
export function MeasuredValleyMountain({ valley, mountain }: { valley: WeatherLocation; mountain: WeatherLocation | null }) {
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const inAustria = isNearAustria(valley.latitude, valley.longitude)
  const key = `${valley.latitude},${valley.longitude},${mountain?.latitude ?? ''},${mountain?.longitude ?? ''},${reload}`

  useEffect(() => {
    if (!inAustria) return
    const controller = new AbortController()
    fetchStations(controller.signal)
      .then(async (stations) => {
        const valleyCandidates = nearbyStations(stations, valley.latitude, valley.longitude, valley.elevation)
        // Für die Bergsuche brauchen wir eine Talhöhe: die des Orts, sonst die der nächsten Talstation
        const valleyAltitude = valley.elevation ?? valleyCandidates[0]?.station.altitude ?? 0
        const mountainCandidates = mountain
          ? mountainStations(stations, mountain.latitude, mountain.longitude, mountain.elevation ?? 0, valleyAltitude)
          : []
        // Tal- und Bergstationen in EINEM Abruf
        const ids = [...new Set([...valleyCandidates, ...mountainCandidates].map((c) => c.station.id))]
        const measurements = await fetchMeasurements(ids, controller.signal)
        const v = firstWithData(valleyCandidates, measurements)
        // Die Bergstation muss auch über der tatsächlich gewählten Talstation mind. 300 m höher liegen
        const m = firstWithData(
          mountainCandidates.filter((c) => !v || c.station.altitude >= v.candidate.station.altitude + MIN_HEIGHT_DIFFERENCE),
          measurements,
          false,
        )
        const newest = Math.max(v?.measurement.time ?? 0, m?.measurement.time ?? 0)
        setResult({ key, status: 'ok', valley: v, mountain: m, stale: newest > 0 && Date.now() - newest > STALE_AFTER_MS })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setResult({ key, status: 'error', message: friendlyError(err) })
      })
    return () => controller.abort()
  }, [key, inAustria, valley.latitude, valley.longitude, valley.elevation, mountain])

  if (!inAustria) return null
  const current = result && result.key === key ? result : null

  return (
    <section className="card measured">
      <h2 className="measured-title">Jetzt gemessen: Tal und Berg</h2>
      {!current && <Loading small>Messwerte von Tal- und Bergstation werden geladen …</Loading>}
      {current?.status === 'error' && <ErrorMessage small message={current.message} onRetry={() => setReload((r) => r + 1)} />}
      {current?.status === 'ok' && (
        <>
          {!current.valley && <p className="muted small">Keine Messstation im Tal liefert gerade Daten.</p>}
          {current.stale && <p className="notice small">Die Messungen sind älter als eine Stunde – eine Station sendet gerade nichts Neues.</p>}
          {(current.valley || current.mountain) && (
            <div className="measured-pair">
              {current.valley && <StationColumn label="Tal" variant="valley" picked={current.valley} />}
              {current.mountain ? (
                <StationColumn label="Berg" variant="mountain" picked={current.mountain} />
              ) : (
                <p className="muted small">
                  {mountain
                    ? `Keine Bergstation in der Nähe des Bergs (bis ${MOUNTAIN_STATION_MAX_KM} km, mind. ${MIN_HEIGHT_DIFFERENCE} m über dem Tal) liefert gerade Daten.`
                    : 'Kein Berg im Umkreis – darum nur die Talstation.'}
                </p>
              )}
            </div>
          )}
          {current.valley && current.mountain && <InversionResult valley={current.valley} mountain={current.mountain} />}
        </>
      )}
      <p className="muted small measured-source">
        Datenquelle:{' '}
        <a href="https://data.hub.geosphere.at/" target="_blank" rel="noopener noreferrer">
          GeoSphere Austria
        </a>{' '}
        (Messnetz TAWES, CC BY 4.0). Die Stationen liegen nicht genau an den gefundenen Punkten, sondern möglichst nah und auf
        ähnlicher Höhe.
      </p>
    </section>
  )
}

function StationColumn({ label, variant, picked }: { label: string; variant: 'valley' | 'mountain'; picked: Picked }) {
  const { station, distanceKm } = picked.candidate
  const m = picked.measurement
  return (
    <div className="measured-station">
      <p className="small">
        <span className={`swatch vm-${variant}`} /> <strong>{label}:</strong> {prettyStationName(station.name)}
      </p>
      <p className="muted small">
        {Math.round(station.altitude)} m · {formatNum(distanceKm, distanceKm < 10 ? 1 : 0)} km entfernt · {formatViennaClock(m.time)} Uhr
      </p>
      <p>
        <strong className="measured-big">{m.temp !== null ? `${formatNum(m.temp)} °C` : '–'}</strong>
        {m.humidity !== null && <span className="muted small"> · Feuchte {Math.round(m.humidity)} %</span>}
      </p>
    </div>
  )
}

function InversionResult({ valley, mountain }: { valley: Picked; mountain: Picked }) {
  const vt = valley.measurement.temp
  const mt = mountain.measurement.temp
  if (vt === null || mt === null) return null
  const r = measuredInversion(vt, valley.candidate.station.altitude, mt, mountain.candidate.station.altitude)
  const usual = `üblich wären bei ${Math.round(r.heightDiff)} m Höhenunterschied rund ${formatNum(r.expectedDrop, 0)} °C weniger`

  if (r.kind === 'inversion') {
    return (
      <p className="inversion-banner">
        <strong>
          <Term id="inversion">Inversion</Term> gemessen:
        </strong>{' '}
        oben ist es {formatNum(r.diff)} °C <strong>wärmer</strong> als im Tal ({usual}).
      </p>
    )
  }
  if (r.kind === 'stable') {
    return (
      <p className="notice small">
        Oben nur {formatNum(-r.diff)} °C kälter ({usual}): Die Luft ist stabil geschichtet – eine{' '}
        <Term id="inversion">Inversion</Term> ist nicht weit.
      </p>
    )
  }
  return (
    <p className="muted small">
      Keine Inversion: oben {formatNum(-r.diff)} °C kälter – so, wie es mit der Höhe üblich ist (erwartet rund{' '}
      {formatNum(r.expectedDrop, 0)} °C bei {Math.round(r.heightDiff)} m Höhenunterschied).
    </p>
  )
}
