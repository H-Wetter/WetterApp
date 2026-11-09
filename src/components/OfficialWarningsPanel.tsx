import { useEffect, useState } from 'react'
import { friendlyError } from '../api/errors'
import { fetchOfficialWarnings } from '../api/officialWarnings'
import { WARNING_LEVELS, WARNING_TYPES, bulletList, currentWarnings, isActive, warningPeriod } from '../lib/officialWarnings'
import { isNearAustria } from '../lib/stations'
import type { WeatherLocation } from '../types/location'
import type { OfficialWarning } from '../types/officialWarning'
import { ErrorMessage } from './ErrorMessage'
import { Loading } from './Loading'

type Result =
  | { key: string; status: 'error'; message: string }
  | { key: string; status: 'ok'; municipality: string | null; warnings: OfficialWarning[]; now: number }

const SOURCE = (
  <a href="https://warnungen.zamg.at/" target="_blank" rel="noopener noreferrer">
    GeoSphere Austria
  </a>
)

/**
 * Amtliche Wetterwarnungen von GeoSphere Austria für die Gemeinde des Orts (nur Österreich).
 * Steht über den selbst berechneten Hinweisen aus den Modellen.
 */
export function OfficialWarningsPanel({ location }: { location: WeatherLocation }) {
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const inAustria = isNearAustria(location.latitude, location.longitude)
  const key = `${location.latitude},${location.longitude},${reload}`

  useEffect(() => {
    if (!inAustria) return
    const controller = new AbortController()
    fetchOfficialWarnings(location.latitude, location.longitude, controller.signal)
      .then((r) => {
        // „jetzt“ beim Laden festhalten (nicht beim Zeichnen)
        const now = Date.now()
        setResult({ key, status: 'ok', municipality: r.municipality, warnings: currentWarnings(r.warnings, now), now })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setResult({ key, status: 'error', message: friendlyError(err) })
      })
    return () => controller.abort()
  }, [key, inAustria, location.latitude, location.longitude])

  if (!inAustria) return null
  const current = result && result.key === key ? result : null

  if (!current) return <Loading small>Amtliche Warnungen werden geladen …</Loading>
  if (current.status === 'error') return <ErrorMessage small message={current.message} onRetry={() => setReload((r) => r + 1)} />
  // Ort knapp außerhalb Österreichs (keine Gemeinde) → nichts anzeigen
  if (current.municipality === null) return null

  if (current.warnings.length === 0) {
    return (
      <p className="warnings-none">
        ✓ Keine amtliche Wetterwarnung für {current.municipality} <span className="muted small">(Quelle: {SOURCE})</span>
      </p>
    )
  }

  return (
    <section className="card warnings-panel" aria-label="Amtliche Warnungen">
      <h2>Amtliche Warnungen – {current.municipality}</h2>
      <ul className="warnings">
        {current.warnings.map((w) => (
          <OfficialWarningItem key={w.id} warning={w} active={isActive(w, current.now)} />
        ))}
      </ul>
      <p className="muted small">
        Quelle: {SOURCE} (offizielle Warnungen der Meteorologinnen und Meteorologen, CC BY 4.0). Stufen: gelb → orange → rot. Tippe
        auf eine Warnung für Auswirkungen und Empfehlungen.
      </p>
    </section>
  )
}

function OfficialWarningItem({ warning: w, active }: { warning: OfficialWarning; active: boolean }) {
  const type = WARNING_TYPES[w.type]
  const impacts = bulletList(w.impacts)
  const advice = bulletList(w.advice)
  return (
    <li className={`warning level-${w.level}`}>
      <details className="official-warning">
        <summary className="warning-body">
          <span className="warning-icon" aria-hidden="true">
            {type.icon}
          </span>
          <span className="warning-text">
            <strong>
              {WARNING_LEVELS[w.level]} Warnung: {type.label}
              {active && <span className="official-active"> · jetzt aktiv</span>}
            </strong>
            <span className="small">{warningPeriod(w) || w.text}</span>
          </span>
        </summary>
        <div className="official-details small">
          {impacts.length > 0 && (
            <>
              <p>
                <strong>Mögliche Auswirkungen</strong>
              </p>
              <ul>
                {impacts.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          )}
          {advice.length > 0 && (
            <>
              <p>
                <strong>Empfehlungen</strong>
              </p>
              <ul>
                {advice.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          )}
          {w.meteo && <p className="muted">{w.meteo}</p>}
        </div>
      </details>
    </li>
  )
}
