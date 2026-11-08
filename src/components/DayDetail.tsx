import { useEffect, useMemo, useRef } from 'react'
import { FEW_MODELS, summarizeHours, type DaySummary } from '../lib/daily'
import { formatDate, formatHour, relativeDayName } from '../lib/time'
import type { MultiModelForecast } from '../types/forecast'

interface Props {
  forecast: MultiModelForecast
  day: DaySummary
  now: number
  onClose: () => void
}

const HOUR_MS = 60 * 60 * 1000

/** Stundenansicht eines Tages: eine Zeile pro Stunde, Werte = Mittel aller Modelle, dazu die Spanne. */
export function DayDetail({ forecast, day, now, onClose }: Props) {
  const hours = useMemo(() => summarizeHours(forecast, day), [forecast, day])
  const ref = useRef<HTMLElement>(null)

  // Beim Öffnen (oder Tageswechsel) die Stundenansicht ins Bild scrollen.
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [day.dayStart])

  return (
    <section className="card day-detail" ref={ref} aria-label="Stundenansicht">
      <div className="detail-head">
        <h3>
          {day.symbol.icon} {relativeDayName(day.dayStart, now)}, {formatDate(day.dayStart)}{' '}
          <span className="muted small">– stündlich</span>
        </h3>
        <button type="button" onClick={onClose} aria-label="Stundenansicht schließen">
          ✕
        </button>
      </div>
      {day.modelCount < FEW_MODELS && (
        <p className="notice small">
          Für diesen Tag rechnen nur {day.modelCount} Modelle. Die Stundenwerte sind ein grober Trend.
        </p>
      )}

      <div className="table-scroll">
        <table className="hours">
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Wetter</th>
              <th>Temp.</th>
              <th title="Mittel · Anteil der Modelle mit mind. 0,1 mm">Niederschlag</th>
              <th>Wind / Böen</th>
              <th>Wolken</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => {
              const isNow = now >= h.t && now < h.t + HOUR_MS
              const isPast = h.t + HOUR_MS <= now
              return (
                <tr key={h.t} className={isNow ? 'now' : isPast ? 'past' : ''}>
                  <td className="time">{formatHour(h.t)}</td>
                  <td>
                    <span className="h-icon" aria-hidden="true">{h.symbol.icon}</span>{' '}
                    <span className="h-label small">{h.symbol.label}</span>
                  </td>
                  <td>
                    <strong>{h.temp.mean === null ? '–' : `${h.temp.mean.toFixed(1)}°`}</strong>
                    {h.temp.min !== null && h.temp.max !== null && h.temp.count > 1 && (
                      <span className="muted small range">
                        {' '}
                        {h.temp.min.toFixed(0)} bis {h.temp.max.toFixed(0)}
                      </span>
                    )}
                  </td>
                  <td>
                    {(h.precip.mean ?? 0).toFixed(1)} mm
                    <span className="muted small"> · {Math.round(h.precipShare * 100)} %</span>
                    {h.snow !== null && h.snow >= 0.1 && <span className="small"> ❄️ {h.snow.toFixed(1)} cm</span>}
                  </td>
                  <td>
                    {Math.round(h.wind.mean ?? 0)} / {Math.round(h.gust.mean ?? 0)}
                    <span className="muted small"> km/h</span>
                  </td>
                  <td>{h.cloud === null ? '–' : `${Math.round(h.cloud)} %`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Werte = Mittel aller Modelle, die für diese Stunde rechnen. „bis“ = kältestes bis wärmstes Modell. % = Anteil der Modelle mit
        Niederschlag.
      </p>
    </section>
  )
}
