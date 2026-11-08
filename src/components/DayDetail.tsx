import { useEffect, useMemo, useRef } from 'react'
import { sliceForecast } from '../lib/chartData'
import { FEW_MODELS, summarizeHours, type DaySummary, type HourSummary } from '../lib/daily'
import { formatDate, formatHour, hourTicks, relativeDayName } from '../lib/time'
import type { ModelInfo, MultiModelForecast } from '../types/forecast'
import type { CloudProfileRaw } from '../types/clouds'
import { CloudSectionBlock } from './CloudSectionBlock'
import { ErrorBoundary } from './ErrorBoundary'
import { ForecastCharts } from './ForecastCharts'
import { MoonIcon, SmallIcon, WeatherIcon } from './WeatherIcon'
import { WindArrow } from './WindArrow'

interface Props {
  forecast: MultiModelForecast
  day: DaySummary
  now: number
  /** Modelle für Mittelwert/Streuband (wie in den 7-Tage-Diagrammen) */
  statIds: string[]
  /** Modelle mit eigener Linie (nur bei aufgeklapptem Modellvergleich) */
  lineModels: ModelInfo[]
  /** Höhendaten für den Wolkenschnitt (`null` = lädt noch oder Fehler) */
  cloudProfile: CloudProfileRaw | null
  cloudError: string | null
  onClose: () => void
}

const HOUR_MS = 60 * 60 * 1000

/** Niederschlagswahrscheinlichkeit in %; ohne Ensemble-Daten ersatzweise der Anteil der Modelle mit Niederschlag. */
function hourProbability(h: HourSummary): number {
  return h.precipProbability ?? h.precipShare * 100
}

/** z. B. „06:51“ */
function formatTime(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}
/** Symbolleiste: alle 3 Stunden ein Symbol – passt auch aufs Handy. */
const STRIP_STEP = 3

/** Stundenansicht eines Tages: gleiche Diagramme wie der 7-Tage-Verlauf, nur für 24 Stunden. */
export function DayDetail({ forecast, day, now, statIds, lineModels, cloudProfile, cloudError, onClose }: Props) {
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
          <WeatherIcon symbol={day.symbol} size={28} /> {relativeDayName(day.dayStart, now)}, {formatDate(day.dayStart)}{' '}
          <span className="muted small">– stündlich</span>
        </h3>
        <button type="button" onClick={onClose} aria-label="Stundenansicht schließen">
          ✕
        </button>
      </div>
      <ul className="day-facts small">
        {day.sunrise !== null && (
          <li>
            <SmallIcon name="sunrise" size={24} /> Aufgang {formatTime(day.sunrise)}
          </li>
        )}
        {day.sunset !== null && (
          <li>
            <SmallIcon name="sunset" size={24} /> Untergang {formatTime(day.sunset)}
          </li>
        )}
        {day.sunshineHours.mean !== null && (
          <li title="Mittel der Modelle (Spanne)">
            <SmallIcon name="sun" size={24} /> {day.sunshineHours.mean.toFixed(1)} h Sonne
            {day.sunshineHours.min !== null && day.sunshineHours.max !== null && day.sunshineHours.count > 1 && (
              <span className="muted"> ({day.sunshineHours.min.toFixed(1)}–{day.sunshineHours.max.toFixed(1)})</span>
            )}
          </li>
        )}
        {day.feelsMax.mean !== null && (
          <li>
            <SmallIcon name="thermometer" size={24} /> gefühlt {Math.round(day.feelsMax.mean)}° / {Math.round(day.feelsMin.mean ?? 0)}°
          </li>
        )}
        <li>
          <MoonIcon phase={day.moon.phase} size={24} label={day.moon.name} /> {day.moon.name} (
          {Math.round(day.moon.illumination * 100)} % beleuchtet)
        </li>
      </ul>

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
              <span className="strip-icon">
                <WeatherIcon symbol={h.symbol} size={34} />
              </span>
              <strong>{h.temp.mean === null ? '–' : `${Math.round(h.temp.mean)}°`}</strong>
              <span className="muted small" title="gefühlte Temperatur">
                {h.feels.mean === null ? ' ' : `gef. ${Math.round(h.feels.mean)}°`}
              </span>
              <span className="small strip-prob" title="Niederschlagswahrscheinlichkeit">
                <SmallIcon name="raindrop" size={14} /> {Math.round(hourProbability(h))} %
              </span>
              <span className="muted small">{(h.precip.mean ?? 0) >= 0.05 ? `${(h.precip.mean ?? 0).toFixed(1)} mm` : ' '}</span>
              <span className="small strip-wind" title="Wind (Mittel) und Richtung">
                <WindArrow wind={h.windDirection} size={13} showName={false} /> {Math.round(h.wind.mean ?? 0)}
                {h.windDirection.degrees !== null && h.windDirection.name !== 'wechselnd' && h.windDirection.name !== 'still'
                  ? ` ${h.windDirection.name}`
                  : ''}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="detail-charts">
        <ErrorBoundary label="Die Stundendiagramme" resetKey={day.dayStart}>
          <ForecastCharts
            forecast={dayForecast}
            statIds={dayStatIds}
            lineModels={dayLineModels}
            ticks={ticks}
            tickFormatter={formatHour}
            compact
            now={now}
          />
        </ErrorBoundary>
        <ErrorBoundary label="Wolken nach Höhe" resetKey={day.dayStart}>
          <CloudSectionBlock
            profile={cloudProfile}
            error={cloudError}
            modelIds={statIds}
            from={day.startIndex}
            to={day.endIndex}
            ticks={ticks}
            tickFormatter={formatHour}
            arrowStep={3}
            now={now}
            compact
          />
        </ErrorBoundary>
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
                <th>Gefühlt</th>
                <th title="Menge (Mittel) · Wahrscheinlichkeit">Niederschlag</th>
                <th>Wind / Böen</th>
                <th>Wolken</th>
                <th title="Sonnenschein in dieser Stunde">Sonne</th>
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
                      <WeatherIcon symbol={h.symbol} size={22} />{' '}
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
                    <td>{h.feels.mean === null ? '–' : `${h.feels.mean.toFixed(1)}°`}</td>
                    <td>
                      {(h.precip.mean ?? 0).toFixed(1)} mm
                      <span className="muted small"> · {Math.round(hourProbability(h))} %</span>
                      {h.snow !== null && h.snow >= 0.1 && <span className="small"> · Schnee {h.snow.toFixed(1)} cm</span>}
                    </td>
                    <td>
                      <WindArrow wind={h.windDirection} size={13} /> {Math.round(h.wind.mean ?? 0)} / {Math.round(h.gust.mean ?? 0)}
                      <span className="muted small"> km/h</span>
                    </td>
                    <td>{h.cloud === null ? '–' : `${Math.round(h.cloud)} %`}</td>
                    <td>{h.sunshineMinutes === null ? '–' : `${Math.round(h.sunshineMinutes)} min`}</td>
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
