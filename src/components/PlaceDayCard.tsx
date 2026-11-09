import type { DaySummary } from '../lib/daily'
import type { WeatherLocation } from '../types/location'
import { SmallIcon, WeatherIcon } from './WeatherIcon'
import { WindArrow } from './WindArrow'
import { LinkedText } from './LexikonLink'

interface Props {
  title: string
  location: WeatherLocation
  /** Höhe, wie Open-Meteo sie verwendet (m) */
  elevation: number | undefined
  day: DaySummary
  sentences: string[]
  variant: 'valley' | 'mountain'
}

function deg(v: number | null): string {
  return v === null ? '–' : `${Math.round(v)}°`
}

/** Ein Tag für Tal oder Berg: Kennzahlen und Beschreibung in Worten. */
export function PlaceDayCard({ title, location, elevation, day, sentences, variant }: Props) {
  return (
    <section className={`card place-day ${variant}`}>
      <p className="muted small place-kind">{title}</p>
      <div className="place-head">
        <WeatherIcon symbol={day.symbol} size={52} />
        <div>
          <h3>{location.name}</h3>
          <p className="muted small">
            {elevation !== undefined ? `${Math.round(elevation)} m` : ''} · {day.symbol.label}
          </p>
        </div>
        <p className="place-temps">
          <strong>{deg(day.tempMax.mean)}</strong> <span className="muted">{deg(day.tempMin.mean)}</span>
        </p>
      </div>

      <ul className="place-facts small">
        {day.sunshineHours.mean !== null && (
          <li>
            <SmallIcon name="sun" /> {day.sunshineHours.mean.toFixed(1)} h
          </li>
        )}
        <li>
          <SmallIcon name="raindrop" /> {(day.precipSum.mean ?? 0).toFixed(1)} mm
        </li>
        <li>
          <SmallIcon name="wind" /> {Math.round(day.windMax.mean ?? 0)} km/h <WindArrow wind={day.windDirection} size={12} />
        </li>
      </ul>

      <div className="place-text">
        {sentences.map((s) => (
          <p key={s}>
            <LinkedText text={s} />
          </p>
        ))}
      </div>
    </section>
  )
}
