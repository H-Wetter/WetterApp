import { useState } from 'react'
import { FEW_MODELS, type DaySummary } from '../lib/daily'
import { formatDate, relativeDayName } from '../lib/time'
import { MoonIcon, WeatherIcon } from './WeatherIcon'

interface Props {
  days: DaySummary[]
  now: number
  selectedIndex: number | null
  onSelect: (index: number) => void
}

const RANGE_KEY = 'wetter-app.tile-range'

function readRange(): 7 | 14 {
  try {
    return localStorage.getItem(RANGE_KEY) === '14' ? 14 : 7
  } catch {
    return 7
  }
}

function deg(v: number | null): string {
  return v === null ? '–' : `${Math.round(v)}°`
}

/** Niederschlagswahrscheinlichkeit in %; ohne Ensemble-Daten ersatzweise der Anteil der Modelle mit Niederschlag. */
function probability(d: DaySummary): number {
  return d.precipProbability ?? d.precipShare * 100
}

function spread(min: number | null, max: number | null): string {
  if (min === null || max === null) return ''
  return `${Math.round(min)} bis ${Math.round(max)}°`
}

/** Tageskacheln für 7 oder 14 Tage. Klick auf eine Kachel öffnet die Stundenansicht. */
export function DailyTiles({ days, now, selectedIndex, onSelect }: Props) {
  const [range, setRange] = useState<7 | 14>(readRange)

  function changeRange(next: 7 | 14) {
    setRange(next)
    try {
      localStorage.setItem(RANGE_KEY, String(next))
    } catch {
      // Speichern nicht möglich (z. B. privates Fenster) – egal, dann eben nur für jetzt.
    }
  }

  const shown = days.slice(0, range)
  const hasUncertain = shown.some((d) => d.modelCount < FEW_MODELS)

  return (
    <section className="tiles-section">
      <div className="tiles-head">
        <h2>Vorhersage</h2>
        <div className="segmented" role="group" aria-label="Zeitraum">
          {([7, 14] as const).map((r) => (
            <button key={r} type="button" className={range === r ? 'active' : ''} aria-pressed={range === r} onClick={() => changeRange(r)}>
              {r} Tage
            </button>
          ))}
        </div>
      </div>

      <ul className="tiles">
        {shown.map((d, i) => {
          const uncertain = d.modelCount < FEW_MODELS
          const classes = ['tile', i === selectedIndex ? 'selected' : '', uncertain ? 'uncertain' : ''].join(' ')
          return (
            <li key={d.dayStart}>
              <button type="button" className={classes} aria-pressed={i === selectedIndex} onClick={() => onSelect(i)}>
                <span className="tile-day">{relativeDayName(d.dayStart, now)}</span>
                <span className="tile-date muted small">
                  {formatDate(d.dayStart)} <MoonIcon phase={d.moon.phase} size={13} label={`Mond: ${d.moon.name}`} />
                </span>
                <span className="tile-icon">
                  <WeatherIcon symbol={d.symbol} size={44} />
                </span>
                <span className="tile-label small">{d.symbol.label}</span>

                <span className="tile-temps">
                  <strong className="t-max">{deg(d.tempMax.mean)}</strong>
                  <span className="t-min">{deg(d.tempMin.mean)}</span>
                </span>
                <span className="tile-spread muted small" title="Spanne der Höchstwerte über alle Modelle">
                  {spread(d.tempMax.min, d.tempMax.max)}
                </span>
                {d.feelsMax.mean !== null && (
                  <span className="tile-row small" title="Gefühlte Temperatur (Wind, Luftfeuchte und Sonne eingerechnet): Höchst- / Tiefstwert">
                    gefühlt {deg(d.feelsMax.mean)} / {deg(d.feelsMin.mean)}
                  </span>
                )}

                <span className="tile-row small" title="Niederschlag (Mittel) · Niederschlagswahrscheinlichkeit">
                  💧 {(d.precipSum.mean ?? 0).toFixed(1)} mm · {Math.round(probability(d))} %
                </span>
                {d.snowSum !== null && d.snowSum >= 0.5 && (
                  <span className="tile-row small">❄️ {d.snowSum.toFixed(1)} cm</span>
                )}
                {d.sunshineHours.mean !== null && (
                  <span className="tile-row small" title="Sonnenstunden (Mittel der Modelle)">
                    ☀️ {d.sunshineHours.mean.toFixed(1)} h Sonne
                  </span>
                )}
                <span className="tile-row small" title="Wind (Mittel der Tageshöchstwerte) · Böen">
                  💨 {Math.round(d.windMax.mean ?? 0)} · Böen {Math.round(d.gustMax.mean ?? 0)} km/h
                </span>

                <span className={uncertain ? 'tile-models warn small' : 'tile-models muted small'}>
                  {uncertain ? `⚠️ nur ${d.modelCount} Modelle` : `${d.modelCount} Modelle`}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="muted small tiles-help">
        Werte = Mittel aller Modelle. Darunter die Spanne der Höchstwerte. „gefühlt“ berücksichtigt Wind, Luftfeuchte und Sonne.
        % = Niederschlagswahrscheinlichkeit (aus den Ensemble-Rechnungen von ICON, ECMWF, GFS, GEM, UKMO und MeteoSwiss). Das kleine
        Mondsymbol zeigt die Mondphase der folgenden Nacht. Klicke auf einen Tag für die Stundenansicht.
        {hasUncertain && ' ⚠️ Ab etwa Tag 8 rechnen nur noch wenige Modelle – das ist ein grober Trend, keine genaue Vorhersage.'}
      </p>
    </section>
  )
}
