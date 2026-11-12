import { useMemo, type ReactNode } from 'react'
import { summarizeHours, upcomingHours, type DaySummary, type HourSummary } from '../lib/daily'
import { CONFIDENCE_LABEL, dayConfidence, precipRange, temperatureBackground } from '../lib/dayDisplay'
import { formatDate, formatHour } from '../lib/time'
import { LEVEL_NAME, type WarnLevel, type Warning } from '../lib/warnings'
import type { MultiModelForecast } from '../types/forecast'
import { SmallIcon, WeatherIcon } from './WeatherIcon'
import { WindArrow } from './WindArrow'

interface Props {
  forecast: MultiModelForecast
  days: DaySummary[]
  now: number
  /** Warnhinweise (für die Markierung der Tage) */
  warnings: Warning[]
  selectedIndex: number | null
  onSelect: (index: number) => void
  /** Stundenansicht des gewählten Tages; erscheint direkt unter dessen Zeile */
  detail: ReactNode
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function deg(v: number | null): string {
  return v === null ? '–' : `${Math.round(v)}°`.replace('-', '−')
}

/** Niederschlagswahrscheinlichkeit in %; ohne Ensemble-Daten ersatzweise der Anteil der Modelle mit Niederschlag. */
function probability(p: number | null, share: number): number {
  return Math.round(p ?? share * 100)
}

/**
 * Vorhersage auf „Lokal“: oben die nächsten 24 Stunden als Wischleiste,
 * darunter jeder Tag in einer Zeile. Klick auf eine Zeile klappt die Stundenansicht auf.
 */
export function DayList({ forecast, days, now, warnings, selectedIndex, onSelect, detail }: Props) {
  const hours = useMemo(() => summarizeHours(forecast, upcomingHours(forecast, now)), [forecast, now])
  const today = days[0]

  return (
    <section className="daylist-section" aria-label="Vorhersage">
      <h2>Vorhersage</h2>

      {today && (
        <div className={selectedIndex === 0 ? 'today card selected' : 'today card'}>
          <button type="button" className="today-head" aria-expanded={selectedIndex === 0} onClick={() => onSelect(0)}>
            <strong>Heute</strong>
            <span className="muted small">nächste 24 Stunden</span>
            <span className="today-temps">
              <span className="temp-badge" style={{ background: temperatureBackground(today.tempMax.mean) }}>
                {deg(today.tempMax.mean)}
              </span>
              <span className="temp-badge" style={{ background: temperatureBackground(today.tempMin.mean) }}>
                {deg(today.tempMin.mean)}
              </span>
            </span>
            <span className="row-chevron" aria-hidden="true">
              {selectedIndex === 0 ? '▴' : '▾'}
            </span>
          </button>
          <ol className="hour-scroller" aria-label="Die nächsten 24 Stunden">
            {hours.map((h, i) => (
              <HourCell key={h.t} hour={h} first={i === 0} />
            ))}
          </ol>
        </div>
      )}
      {selectedIndex === 0 && detail}

      <ul className="daylist">
        {days.map((d, i) => {
          if (i === 0) return null
          const open = i === selectedIndex
          const dayWarnings = warnings.filter((w) => w.dayStart === d.dayStart)
          const top = dayWarnings[0] // schon nach Stärke sortiert
          const conf = dayConfidence(d)
          const rain = precipRange(d)
          return (
            <li key={d.dayStart}>
              <button type="button" className={open ? 'day-row selected' : 'day-row'} aria-expanded={open} onClick={() => onSelect(i)}>
                <span className="dr-day">
                  <strong>{i === 1 ? 'Morgen' : WEEKDAYS[new Date(d.dayStart).getUTCDay()]}</strong>
                  <span className="muted small">{formatDate(d.dayStart)}</span>
                </span>
                <span className="dr-icons" title={d.symbol.label}>
                  <WeatherIcon symbol={d.symbol} size={40} />
                  {d.nightSymbol && (
                    <span className="dr-night" title={`Nacht: ${d.nightSymbol.label}`}>
                      <WeatherIcon symbol={d.nightSymbol} size={26} />
                    </span>
                  )}
                </span>
                <span className="dr-temps" title="Höchst- und Tiefstwert (Mittel aller Modelle)">
                  <span className="temp-badge" style={{ background: temperatureBackground(d.tempMax.mean) }}>
                    {deg(d.tempMax.mean)}
                  </span>
                  <span className="temp-badge min" style={{ background: temperatureBackground(d.tempMin.mean) }}>
                    {deg(d.tempMin.mean)}
                  </span>
                </span>
                <span className="dr-rain small" title="Niederschlag (Spanne der Modelle) und Wahrscheinlichkeit">
                  <SmallIcon name="raindrop" size={18} />
                  {rain ? (
                    <>
                      {rain} <span className="muted">{probability(d.precipProbability, d.precipShare)} %</span>
                    </>
                  ) : (
                    <span className="muted">trocken</span>
                  )}
                </span>
                <span className="dr-wind small" title={`Wind (Höchstwert) und Böen bis ${Math.round(d.gustMax.mean ?? 0)} km/h`}>
                  <WindArrow wind={d.windDirection} size={14} showName={false} /> {Math.round(d.windMax.mean ?? 0)} km/h
                  <span className="muted"> · Böen {Math.round(d.gustMax.mean ?? 0)}</span>
                </span>
                <span className="dr-sun small" title="Sonnenstunden (Mittel der Modelle)">
                  <SmallIcon name="sun" size={18} /> {d.sunshineHours.mean === null ? '–' : `${Math.round(d.sunshineHours.mean)} h`}
                </span>
                <span className="dr-conf" title={`Verlässlichkeit: ${CONFIDENCE_LABEL[conf]} (${d.modelCount} Modelle)`}>
                  {[1, 2, 3, 4].map((k) => (
                    <span key={k} className={k <= conf ? 'conf-dot on' : 'conf-dot'} />
                  ))}
                </span>
                <span className="dr-end">
                  {top && (
                    <span
                      className={`tile-warn level-${top.level}`}
                      title={dayWarnings.map((w) => `${w.title} (Stufe ${LEVEL_NAME[w.level as WarnLevel]})`).join(', ')}
                      aria-label={`Warnhinweis: ${dayWarnings.map((w) => w.title).join(', ')}`}
                    >
                      ⚠
                    </span>
                  )}
                  <span className="row-chevron" aria-hidden="true">
                    {open ? '▴' : '▾'}
                  </span>
                </span>
              </button>
              {open && detail}
            </li>
          )
        })}
      </ul>

      <p className="muted small tiles-help">
        Werte sind Mittel aller Modelle. Farbe der Temperatur: blau kalt, grün mild, gelb bis rot warm. Regen als Spanne der Modelle
        mit Wahrscheinlichkeit. Das kleine Symbol neben dem Tag zeigt die folgende Nacht samt Mondphase. Die Punkte rechts zeigen,
        wie einig sich die Modelle sind (4 = sicher). Tippe auf einen Tag für die Stundenansicht.
      </p>
    </section>
  )
}

/** Eine Stunde in der Wischleiste: Uhrzeit, Symbol, Regenwahrscheinlichkeit, Temperatur */
function HourCell({ hour: h, first }: { hour: HourSummary; first: boolean }) {
  const p = probability(h.precipProbability, h.precipShare)
  return (
    <li className={first ? 'hour-cell now' : 'hour-cell'} title={h.symbol.label}>
      <span className="small muted">{first ? 'jetzt' : formatHour(h.t)}</span>
      <WeatherIcon symbol={h.symbol} size={34} />
      <span className={p >= 30 ? 'small hc-prob wet' : 'small hc-prob muted'}>{p} %</span>
      <strong>{deg(h.temp.mean)}</strong>
    </li>
  )
}
