import { useEffect, useMemo, useState } from 'react'
import { fetchAirQuality } from '../api/airQuality'
import { airSummary, summarizeAirDays, uvAdvice, type AirDay, type Rating } from '../lib/airQuality'
import { formatDate, relativeDayName } from '../lib/time'
import type { AirQualityData } from '../types/airQuality'
import type { WeatherLocation } from '../types/location'

/** Luftqualitätsdaten gibt es für etwa 5 Tage. */
const DAYS = 5

type Result = { key: string; data: AirQualityData } | { key: string; error: string }

function fmt(v: number | null, digits = 0): string {
  return v === null ? '–' : v.toFixed(digits).replace('.', ',')
}

/** Eine farbige Zelle: Wert oben, Bewertung darunter. */
function Cell({ value, rating }: { value: string; rating: Rating }) {
  return (
    <td>
      <span className={`env-badge env-${rating.level}`}>
        <strong>{value}</strong>
        <span className="env-label">{rating.label}</span>
      </span>
    </td>
  )
}

/** Bereich „Luft & Umwelt“: Luftqualität, Feinstaub, UV, Saharastaub und Pollen für die nächsten Tage. */
export function EnvironmentPanel({ location, now }: { location: WeatherLocation; now: number }) {
  const [result, setResult] = useState<Result | null>(null)
  const [reload, setReload] = useState(0)
  const key = `${location.latitude},${location.longitude},${reload}`

  useEffect(() => {
    const controller = new AbortController()
    fetchAirQuality(location, DAYS, controller.signal)
      .then((data) => setResult({ key, data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setResult({ key, error: err instanceof Error ? err.message : 'Unbekannter Fehler.' })
      })
    return () => controller.abort()
  }, [key, location])

  const current = result && result.key === key ? result : null
  const days: AirDay[] = useMemo(() => (current && 'data' in current ? summarizeAirDays(current.data) : []), [current])

  if (!current) {
    return (
      <section className="card">
        <h2 className="env-title">Luft &amp; Umwelt</h2>
        <p className="hint small">Daten zu Luft, UV und Pollen werden geladen …</p>
      </section>
    )
  }
  if ('error' in current) {
    return (
      <section className="card">
        <h2 className="env-title">Luft &amp; Umwelt</h2>
        <p className="error small">{current.error}</p>
        <button type="button" onClick={() => setReload((r) => r + 1)}>
          Erneut versuchen
        </button>
      </section>
    )
  }
  if (days.length === 0) {
    return (
      <section className="card">
        <h2 className="env-title">Luft &amp; Umwelt</h2>
        <p className="muted small">Für diesen Ort gibt es keine Luftqualitätsdaten.</p>
      </section>
    )
  }

  const today = days[0]
  const pollenSeason = days.some((d) => d.pollen.some((p) => (p.max ?? 0) >= 1))
  const pollenRows = pollenSeason
    ? days[0].pollen.map((p) => p.type).filter((type) => days.some((d) => (d.pollen.find((p) => p.type === type)?.max ?? 0) >= 1))
    : []
  const hasPollenData = days.some((d) => d.hasPollenData)
  const dustSeen = days.some((d) => (d.dust.max ?? 0) >= 20)

  return (
    <section className="card env-panel">
      <h2 className="env-title">Luft &amp; Umwelt</h2>
      <p className="env-today">
        <strong>Heute:</strong> {airSummary(today)} {uvAdvice(today.uv.max)}
      </p>

      <div className="table-scroll">
        <table className="env-table">
          <thead>
            <tr>
              <th />
              {days.map((d) => (
                <th key={d.dayStart}>
                  {relativeDayName(d.dayStart, now)}
                  <span className="muted small"> {formatDate(d.dayStart)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" title="Europäischer Luftqualitätsindex (EAQI), höchster Wert des Tages">
                Luftqualität
              </th>
              {days.map((d) => (
                <Cell key={d.dayStart} value={fmt(d.aqi.max)} rating={d.aqi.rating} />
              ))}
            </tr>
            <tr>
              <th scope="row" title="Feinstaub PM10, Tagesmittel in µg/m³ – EU-Grenzwert: 50">
                Feinstaub PM10
              </th>
              {days.map((d) => (
                <Cell key={d.dayStart} value={`${fmt(d.pm10.mean)} µg`} rating={d.pm10.rating} />
              ))}
            </tr>
            <tr>
              <th scope="row" title="Feinstaub PM2,5 (besonders feine Teilchen), Tagesmittel in µg/m³">
                Feinstaub PM2,5
              </th>
              {days.map((d) => (
                <Cell key={d.dayStart} value={`${fmt(d.pm25.mean)} µg`} rating={d.pm25.rating} />
              ))}
            </tr>
            <tr>
              <th scope="row" title="UV-Index, höchster Wert des Tages (mittags)">
                UV-Index
              </th>
              {days.map((d) => (
                <Cell key={d.dayStart} value={fmt(d.uv.max, 1)} rating={d.uv.rating} />
              ))}
            </tr>
            <tr>
              <th scope="row" title="Saharastaub in µg/m³, höchster Wert des Tages">
                Saharastaub
              </th>
              {days.map((d) => (
                <Cell key={d.dayStart} value={`${fmt(d.dust.max)} µg`} rating={d.dust.rating} />
              ))}
            </tr>
            {pollenRows.map((type) => (
              <tr key={type}>
                <th scope="row" title="Pollen in Körnern pro m³, höchster Wert des Tages">
                  {days[0].pollen.find((p) => p.type === type)?.label}
                </th>
                {days.map((d) => {
                  const p = d.pollen.find((x) => x.type === type)
                  return p && p.max !== null ? (
                    <Cell key={d.dayStart} value={fmt(p.max)} rating={p.rating} />
                  ) : (
                    <td key={d.dayStart} className="muted small">
                      –
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!pollenSeason && (
        <p className="small muted">
          🌿 Pollen:{' '}
          {hasPollenData
            ? 'derzeit keine Pollen in der Luft (außerhalb der Pollensaison).'
            : 'für diesen Ort gibt es keine Pollendaten (nur Europa).'}
        </p>
      )}
      {dustSeen && (
        <p className="small muted">
          🏜️ Saharastaub: Der Himmel wirkt milchig, Sonnenuntergänge oft rötlich; bei Regen bleibt Staub auf Autos zurück.
        </p>
      )}
      <p className="small muted">
        Quelle: Copernicus-Dienst CAMS über Open-Meteo. Das ist <strong>ein</strong> Modell – eine Streuung zwischen Modellen wie
        beim Wetter gibt es hier nicht. Luft und UV: ca. 5 Tage, Pollen: ca. 4 Tage (nur Europa). Fahre über die Zeilennamen für
        Erklärungen.
      </p>
    </section>
  )
}
