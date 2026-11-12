import { useEffect, useMemo } from 'react'
import type { OrtOesterreich } from '../data/orte-oesterreich'
import { dailyWeatherCode } from '../lib/austria'
import { summarizeDays } from '../lib/daily'
import { CONFIDENCE_LABEL, dayConfidence, precipRange, temperatureBackground } from '../lib/dayDisplay'
import { describeDayCourse } from '../lib/tagesverlauf'
import { formatDate, localNow, relativeDayName } from '../lib/time'
import { freezingLevel } from '../lib/warnings'
import type { MultiModelForecast } from '../types/forecast'
import { DayCourse } from './DayCourse'
import { Term } from './LexikonLink'
import { WmoIcon } from './WmoIcon'
import { WindArrow } from './WindArrow'

interface Props {
  ort: OrtOesterreich
  forecast: MultiModelForecast
  dayIndex: number
  onClose: () => void
  /** „Mehr Details“: Ort in der Ansicht „Lokal“ öffnen */
  onOpenLocal: () => void
}

function deg(v: number | null): string {
  return v === null ? '–' : `${Math.round(v)}°`.replace('-', '−')
}

/** auf 50 m gerundet, z. B. „1.850 m“ */
function meters(h: number): string {
  return `${(Math.round(h / 50) * 50).toLocaleString('de-AT')} m`
}

/**
 * Detailbereich der Österreich-Karte für einen Ort und Tag. Am Computer rechts neben der Karte,
 * am Handy als Bereich, der von unten hereinfährt (das regelt das CSS).
 * Der Tagesverlauf kommt aus derselben Logik wie in „Lokal“ (src/lib/tagesverlauf.ts).
 */
export function PlaceDetail({ ort, forecast, dayIndex, onClose, onOpenLocal }: Props) {
  const days = useMemo(() => summarizeDays(forecast), [forecast])
  const day = days[dayIndex]
  const now = localNow(forecast.utcOffsetSeconds)
  const course = useMemo(() => (day ? describeDayCourse({ forecast, startIndex: day.startIndex }) : []), [forecast, day])
  const freezing = useMemo(() => (day ? freezingLevel(forecast, day) : null), [forecast, day])
  const code = useMemo(() => (day ? dailyWeatherCode(forecast, day.startIndex) : null), [forecast, day])

  // Mit der Esc-Taste schließen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!day) return null
  const conf = dayConfidence(day)
  const rain = precipRange(day)
  const snow = day.snowSum ?? 0

  return (
    <aside className="place-detail card" aria-label={`Wetter in ${ort.name}`}>
      <div className="pd-head">
        {code !== null && <WmoIcon code={code} size={44} />}
        <div>
          <h2>{ort.name}</h2>
          <p className="small muted">
            {relativeDayName(day.dayStart, now)}, {formatDate(day.dayStart)} · {ort.elevation} m
          </p>
        </div>
        <button type="button" className="pd-close" onClick={onClose} aria-label="Detailbereich schließen">
          ✕
        </button>
      </div>

      <dl className="pd-facts">
        <div>
          <dt>Temperatur</dt>
          <dd>
            <span className="temp-badge" style={{ background: temperatureBackground(day.tempMax.mean) }}>
              {deg(day.tempMax.mean)}
            </span>{' '}
            <span className="temp-badge min" style={{ background: temperatureBackground(day.tempMin.mean) }}>
              {deg(day.tempMin.mean)}
            </span>
          </dd>
        </div>
        <div>
          <dt>Niederschlag</dt>
          <dd>
            {rain ?? 'trocken'}
            {snow >= 0.5 && <span className="small"> · Neuschnee {snow.toFixed(1).replace('.', ',')} cm</span>}
          </dd>
        </div>
        <div>
          <dt>Wind und Böen</dt>
          <dd>
            <WindArrow wind={day.windDirection} size={13} showName={false} /> {Math.round(day.windMax.mean ?? 0)} km/h
            <span className="muted small"> · Böen {Math.round(day.gustMax.mean ?? 0)}</span>
          </dd>
        </div>
        <div>
          <dt>Sonnenschein</dt>
          <dd>{day.sunshineHours.mean === null ? '–' : `${day.sunshineHours.mean.toFixed(1).replace('.', ',')} h`}</dd>
        </div>
        <div>
          <dt>
            <Term id="nullgradgrenze">Nullgradgrenze</Term>
          </dt>
          <dd>
            {freezing ? (Math.abs(freezing.max - freezing.min) >= 100 ? `${meters(freezing.min)} bis ${meters(freezing.max)}` : meters(freezing.min)) : '–'}
          </dd>
        </div>
        <div>
          <dt>Verlässlichkeit</dt>
          <dd title={`${day.modelCount} Modelle`}>
            <span className="dr-conf">
              {[1, 2, 3, 4].map((k) => (
                <span key={k} className={k <= conf ? 'conf-dot on' : 'conf-dot'} />
              ))}
            </span>{' '}
            <span className="small">{CONFIDENCE_LABEL[conf]}</span>
          </dd>
        </div>
      </dl>

      {conf <= 2 && (
        <p className="notice small">
          Die Modelle sind sich für diesen Tag uneinig (<Term id="modellstreuung">Modellstreuung</Term>). Die Werte sind unsicher.
        </p>
      )}

      <DayCourse periods={course} now={now} />

      <button type="button" className="primary pd-more" onClick={onOpenLocal}>
        Mehr Details in „Lokal“
      </button>
    </aside>
  )
}
