import { useEffect, useMemo, useRef } from 'react'
import { sliceForecast } from '../lib/chartData'
import { FEW_MODELS, summarizeHours, type DaySummary, type HourSummary } from '../lib/daily'
import { formatDate, formatHour, hourTicks, relativeDayName } from '../lib/time'
import type { ModelInfo, MultiModelForecast } from '../types/forecast'
import type { CloudProfileRaw } from '../types/clouds'
import { CloudSectionBlock } from './CloudSectionBlock'
import { ErrorBoundary } from './ErrorBoundary'
import { WarningItem } from './WarningItem'
import { freezingLevel, type Warning } from '../lib/warnings'
import { ForecastCharts } from './ForecastCharts'
import { MoonIcon, SmallIcon, WeatherIcon } from './WeatherIcon'
import { WindArrow } from './WindArrow'
import { Term } from './LexikonLink'
import { DayCourse } from './DayCourse'
import { describeDayCourse } from '../lib/tagesverlauf'
import { measuredFogWindow, type MeasuredFog } from '../lib/stations'

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
  /** Warnhinweise für diesen Tag */
  warnings: Warning[]
  /** Nebel laut Messstation (nur heute relevant, sonst egal) */
  measuredFog?: MeasuredFog | null
  onClose: () => void
}

const HOUR_MS = 60 * 60 * 1000

/** Niederschlagswahrscheinlichkeit in %; ohne Ensemble-Daten ersatzweise der Anteil der Modelle mit Niederschlag. */
function hourProbability(h: HourSummary): number {
  return h.precipProbability ?? h.precipShare * 100
}

function roundTo(v: number, step: number): string {
  return (Math.round(v / step) * step).toLocaleString('de-AT')
}

/** z. B. „06:51“ */
function formatTime(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/** Stundenansicht eines Tages: gleiche Diagramme wie der 7-Tage-Verlauf, nur für 24 Stunden. */
export function DayDetail({ forecast, day, now, statIds, lineModels, cloudProfile, cloudError, warnings, measuredFog, onClose }: Props) {
  const freezing = useMemo(() => freezingLevel(forecast, day), [forecast, day])
  const dayForecast = useMemo(() => sliceForecast(forecast, day.startIndex, day.endIndex), [forecast, day])
  const hours = useMemo(() => summarizeHours(forecast, day), [forecast, day])
  // Tagesverlauf in Worten – aus denselben Modellen wie Mittelwert und Streuband (alle, wenn keins gewählt ist)
  const course = useMemo(
    () =>
      describeDayCourse({
        forecast,
        startIndex: day.startIndex,
        modelIds: statIds.length ? statIds : undefined,
        measuredFog: measuredFog ? measuredFogWindow(measuredFog, forecast.utcOffsetSeconds) : null,
      }),
    [forecast, day.startIndex, statIds, measuredFog],
  )
  const ticks = useMemo(() => hourTicks(dayForecast.times, 3), [dayForecast])

  // Nur Modelle, die an diesem Tag überhaupt rechnen
  const dayStatIds = useMemo(() => statIds.filter((id) => dayForecast.availableModels.includes(id)), [statIds, dayForecast])
  const dayLineModels = useMemo(
    () => lineModels.filter((m) => dayForecast.availableModels.includes(m.id)),
    [lineModels, dayForecast],
  )

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
        {freezing && (
          <li title={`Schneefallgrenze ≈ Nullgradgrenze − 300 m (Faustregel), aus ${freezing.models} Modellen`}>
            <span className="freezing-key">0 °C</span> <Term id="nullgradgrenze">Nullgradgrenze</Term> {roundTo(Math.max(0, freezing.min), 50)}
            {Math.abs(freezing.max - freezing.min) >= 100 ? `–${roundTo(Math.max(0, freezing.max), 50)}` : ''} m
          </li>
        )}
      </ul>

      {warnings.length > 0 && (
        <ul className="warnings">
          {warnings.map((w) => (
            <WarningItem key={w.kind} warning={w} />
          ))}
        </ul>
      )}

      {day.modelCount < FEW_MODELS && (
        <p className="notice small">
          Für diesen Tag rechnen nur {day.modelCount} Modelle. Die Stundenwerte sind ein grober Trend.
        </p>
      )}

      {/* Je Stunde eine Zeile */}
      <ol className="hour-list" aria-label="Stündliche Vorhersage">
        <li className="hl-head small muted" aria-hidden="true">
          <span>Zeit</span>
          <span />
          <span>Temp.</span>
          <span>Niederschlag</span>
          <span>Wind / Böen</span>
          <span>Sonne</span>
        </li>
        {hours.map((h) => {
          const isNow = now >= h.t && now < h.t + HOUR_MS
          const isPast = h.t + HOUR_MS <= now
          const p = Math.round(hourProbability(h))
          const mm = h.precip.mean ?? 0
          const classes = ['hl-row', isNow ? 'now' : '', isPast ? 'past' : '', h.symbol.isDay ? '' : 'night'].join(' ')
          return (
            <li key={h.t} className={classes} title={h.symbol.label}>
              <span className="hl-time">{isNow ? 'jetzt' : formatHour(h.t)}</span>
              <span className="hl-icon">
                <WeatherIcon symbol={h.symbol} size={30} />
              </span>
              <span className="hl-temp">
                <strong>{h.temp.mean === null ? '–' : `${Math.round(h.temp.mean)}°`}</strong>
                <span className="muted small">{h.feels.mean === null ? '' : ` gef. ${Math.round(h.feels.mean)}°`}</span>
              </span>
              <span className="hl-rain small">
                <span className={p >= 30 ? 'hc-prob wet' : 'muted'}>{p} %</span>
                {mm >= 0.05 && <span> · {mm.toFixed(1).replace('.', ',')} mm</span>}
                {h.snow !== null && h.snow >= 0.1 && <span> · Schnee {h.snow.toFixed(1).replace('.', ',')} cm</span>}
              </span>
              <span className="hl-wind small">
                <WindArrow wind={h.windDirection} size={13} showName={false} /> {Math.round(h.wind.mean ?? 0)}
                <span className="muted"> / {Math.round(h.gust.mean ?? 0)} km/h</span>
              </span>
              <span className="hl-sun small muted">{h.sunshineMinutes === null || !h.symbol.isDay ? '' : `${Math.round(h.sunshineMinutes)} min`}</span>
            </li>
          )
        })}
      </ol>

      <ErrorBoundary label="Der Tagesverlauf" resetKey={day.dayStart}>
        <DayCourse periods={course} now={now} />
      </ErrorBoundary>

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

    </section>
  )
}
