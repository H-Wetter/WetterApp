import { useEffect, useMemo, useRef } from 'react'
import { sliceForecast } from '../lib/chartData'
import { FEW_MODELS, summarizeHours, type DaySummary } from '../lib/daily'
import { formatDate, formatHour, hourTicks, relativeDayName } from '../lib/time'
import type { ModelInfo, MultiModelForecast } from '../types/forecast'
import { ForecastCharts } from './ForecastCharts'

interface Props {
  forecast: MultiModelForecast
  day: DaySummary
  now: number
  /** Modelle für Mittelwert/Streuband (wie in den 7-Tage-Diagrammen) */
  statIds: string[]
  /** Modelle mit eigener Linie (nur bei aufgeklapptem Modellvergleich) */
  lineModels: ModelInfo[]
  onClose: () => void
}

const HOUR_MS = 60 * 60 * 1000
/** Symbolleiste: alle 3 Stunden ein Symbol – passt auch aufs Handy. */
const STRIP_STEP = 3

/** Stundenansicht eines Tages: gleiche Diagramme wie der 7-Tage-Verlauf, nur für 24 Stunden. */
export function DayDetail({ forecast, day, now, statIds, lineModels, onClose }: Props) {
  const dayForecast = useMemo(() => sliceForecast(forecast, day.startIndex, day.endIndex), [forecast, day])
  const hours = useMemo(() => summarizeHours(forecast, day), [forecast, day])
  const ticks = useMemo(() => hourTicks(dayForecast.times, 3), [dayForecast])

  // Nur Modelle, die an diesem Tag überhaupt rechnen
  const dayStatIds = useMemo(() => statIds.filter((id) => dayForecast.availableModels.includes(id)), [statIds, dayForecast])
  const dayLineModels = useMemo(
    () => lineModels.filter((m) => dayForecast.availableModels.includes(m.id)),
    [lineModels, dayForecast],
  )

  const strip = hours.filter((h) => new Date(h.t).getUTCHours() % STRIP_STEP === 0)

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

      {/* Symbolleiste: Wetter alle 3 Stunden */}
      <ol className="hour-strip">
        {strip.map((h) => {
          const isNow = now >= h.t && now < h.t + STRIP_STEP * HOUR_MS
          return (
            <li key={h.t} className={isNow ? 'now' : ''} title={h.symbol.label}>
              <span className="muted small">{formatHour(h.t)}</span>
              <span className="strip-icon" aria-label={h.symbol.label}>{h.symbol.icon}</span>
              <strong>{h.temp.mean === null ? '–' : `${Math.round(h.temp.mean)}°`}</strong>
              <span className="muted small">{(h.precip.mean ?? 0) >= 0.05 ? `${(h.precip.mean ?? 0).toFixed(1)} mm` : ' '}</span>
            </li>
          )
        })}
      </ol>

      <div className="detail-charts">
        <ForecastCharts
          forecast={dayForecast}
          statIds={dayStatIds}
          lineModels={dayLineModels}
          ticks={ticks}
          tickFormatter={formatHour}
          compact
          now={now}
        />
      </div>

      <details className="hour-table">
        <summary>Stundenwerte als Tabelle</summary>
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
      </details>
    </section>
  )
}
