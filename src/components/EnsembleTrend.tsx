import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { fetchEnsemble } from '../api/ensemble'
import { describeEnsembleTrend, summarizeEnsembleDays } from '../lib/ensemble'
import { ENSEMBLE_MODELS } from '../lib/models'
import { formatDay } from '../lib/time'
import type { EnsembleData, EnsembleDay } from '../types/ensemble'
import type { WeatherLocation } from '../types/location'

/** Tag 8 bis 16 (Index 7 bis 15, 0 = heute) */
const FROM_DAY = 7
const TO_DAY = 15
const FETCH_DAYS = TO_DAY + 1

type Result = { key: string; data: EnsembleData } | { key: string; error: string }

interface Row {
  label: string
  day: EnsembleDay
  tmaxRange: [number, number]
  tmaxBand: [number, number]
  tmaxMedian: number
  tminRange: [number, number]
  tminBand: [number, number]
  tminMedian: number
  precipMedian: number
  /** Abstand vom Median nach unten/oben bis zum 10./90. Perzentil (für den Strich) */
  precipErr: [number, number]
}

function toRow(d: EnsembleDay): Row {
  return {
    label: formatDay(d.dayStart),
    day: d,
    tmaxRange: [d.tmax.min, d.tmax.max],
    tmaxBand: [d.tmax.p10, d.tmax.p90],
    tmaxMedian: d.tmax.median,
    tminRange: [d.tmin.min, d.tmin.max],
    tminBand: [d.tmin.p10, d.tmin.p90],
    tminMedian: d.tmin.median,
    precipMedian: d.precip.median,
    precipErr: [d.precip.median - d.precip.p10, d.precip.p90 - d.precip.median],
  }
}

function n(v: number, digits = 0): string {
  return v.toFixed(digits).replace('.', ',')
}

function TempTooltip({ active, payload }: Pick<TooltipContentProps<number, string>, 'active' | 'payload'>) {
  if (!active || !payload || payload.length === 0) return null
  const { day } = payload[0].payload as unknown as Row
  return (
    <div className="chart-tooltip">
      <p className="tt-time">
        {formatDay(day.dayStart)} · Tag {day.dayIndex + 1}
      </p>
      <p>
        <strong>Höchstwert: {n(day.tmax.median)} °C</strong>
      </p>
      <p className="muted">
        wahrscheinlich {n(day.tmax.p10)} bis {n(day.tmax.p90)} °C (extrem {n(day.tmax.min)} bis {n(day.tmax.max)})
      </p>
      <p>
        <strong>Tiefstwert: {n(day.tmin.median)} °C</strong>
      </p>
      <p className="muted">
        wahrscheinlich {n(day.tmin.p10)} bis {n(day.tmin.p90)} °C (extrem {n(day.tmin.min)} bis {n(day.tmin.max)})
      </p>
      <p className="muted">{day.memberCount} Läufe</p>
    </div>
  )
}

function PrecipTooltip({ active, payload }: Pick<TooltipContentProps<number, string>, 'active' | 'payload'>) {
  if (!active || !payload || payload.length === 0) return null
  const { day } = payload[0].payload as unknown as Row
  return (
    <div className="chart-tooltip">
      <p className="tt-time">
        {formatDay(day.dayStart)} · Tag {day.dayIndex + 1}
      </p>
      <p>
        <strong>Niederschlag: {n(day.precip.median, 1)} mm</strong> (Median)
      </p>
      <p className="muted">
        wahrscheinlich {n(day.precip.p10, 1)} bis {n(day.precip.p90, 1)} mm, höchstens {n(day.precip.max, 1)} mm
      </p>
      <p>Wahrscheinlichkeit ≥ 1 mm: {Math.round(day.precipProbability)} %</p>
      <p className="muted">{day.memberCount} Läufe</p>
    </div>
  )
}

const CONFIDENCE_LEVEL = { hoch: 2, mittel: 3, gering: 4 } as const

/** Bereich „Trend Tag 8–16“: Ensemble-Läufe mehrerer Wetterdienste mit Unsicherheitsband. */
export function EnsembleTrend({ location }: { location: WeatherLocation }) {
  const [result, setResult] = useState<Result | null>(null)
  const [reload, setReload] = useState(0)
  const key = `${location.latitude},${location.longitude},${location.elevation ?? ''},${reload}`

  useEffect(() => {
    const controller = new AbortController()
    fetchEnsemble(location, ENSEMBLE_MODELS.map((m) => m.id), FETCH_DAYS, controller.signal)
      .then((data) => setResult({ key, data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setResult({ key, error: err instanceof Error ? err.message : 'Unbekannter Fehler.' })
      })
    return () => controller.abort()
  }, [key, location])

  const current = result && result.key === key ? result : null
  const days = useMemo(
    () => (current && 'data' in current ? summarizeEnsembleDays(current.data, FROM_DAY, TO_DAY) : []),
    [current],
  )
  const rows = useMemo(() => days.map(toRow), [days])
  const text = useMemo(() => describeEnsembleTrend(days), [days])

  const title = <h2>Trend – Tag 8 bis 16</h2>

  if (!current) {
    return (
      <section className="trend">
        {title}
        <p className="hint small">Ensemble-Läufe werden geladen …</p>
      </section>
    )
  }
  if ('error' in current) {
    return (
      <section className="trend">
        {title}
        <div className="card">
          <p className="error small">{current.error}</p>
          <button type="button" onClick={() => setReload((r) => r + 1)}>
            Erneut versuchen
          </button>
        </div>
      </section>
    )
  }
  if (days.length === 0) {
    return (
      <section className="trend">
        {title}
        <p className="notice">Für diesen Ort liefert kein Ensemble Daten über Tag 8 hinaus.</p>
      </section>
    )
  }

  const usedModels = ENSEMBLE_MODELS.filter((m) => days.some((d) => d.models.includes(m.id)))
  const maxMembers = Math.max(...days.map((d) => d.memberCount))

  return (
    <section className="trend">
      {title}
      <p className="muted small">
        Ab Tag 8 sind einzelne Modellläufe kaum noch verlässlich. Darum rechnen die Wetterdienste jedes Modell viele Male mit
        leicht veränderten Startwerten („Ensemble“). Hier sind bis zu {maxMembers} solcher Läufe zusammengefasst. Linie = mittlerer
        Lauf (Median), kräftige Fläche = 80 % der Läufe, blasse Fläche = alle Läufe.
      </p>

      <div className="card ens-summary">
        {text.map((s) => (
          <p key={s}>{s}</p>
        ))}
      </div>

      <section className="card chart-card">
        <h3>
          Höchst- und Tiefstwerte <span className="muted small">(°C)</span>
        </h3>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'currentColor' }} interval="preserveStartEnd" />
              <YAxis domain={['auto', 'auto']} allowDecimals={false} tick={{ fontSize: 12, fill: 'currentColor' }} />
              <Tooltip content={(p) => <TempTooltip active={p.active} payload={p.payload} />} />
              <Area dataKey="tmaxRange" stroke="none" fill="var(--warn-3)" fillOpacity={0.12} isAnimationActive={false} activeDot={false} />
              <Area dataKey="tmaxBand" stroke="none" fill="var(--warn-3)" fillOpacity={0.3} isAnimationActive={false} activeDot={false} />
              <Area dataKey="tminRange" stroke="none" fill="var(--drop)" fillOpacity={0.12} isAnimationActive={false} activeDot={false} />
              <Area dataKey="tminBand" stroke="none" fill="var(--drop)" fillOpacity={0.3} isAnimationActive={false} activeDot={false} />
              <Line dataKey="tmaxMedian" stroke="var(--warn-3)" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
              <Line dataKey="tminMedian" stroke="var(--drop)" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="muted small chart-note">
          <span className="swatch" style={{ background: 'var(--warn-3)' }} /> Höchstwert am Tag{' '}
          <span className="swatch" style={{ background: 'var(--drop)' }} /> Tiefstwert in der Nacht
        </p>
      </section>

      <section className="card chart-card">
        <h3>
          Niederschlag pro Tag <span className="muted small">(mm)</span>
        </h3>
        <div className="chart compact">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'currentColor' }} interval="preserveStartEnd" />
              <YAxis domain={[0, 'auto']} allowDecimals={false} tick={{ fontSize: 12, fill: 'currentColor' }} />
              <Tooltip content={(p) => <PrecipTooltip active={p.active} payload={p.payload} />} />
              <Bar dataKey="precipMedian" fill="var(--drop)" fillOpacity={0.75} isAnimationActive={false}>
                <ErrorBar dataKey="precipErr" width={6} stroke="currentColor" strokeWidth={1.5} />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="muted small chart-note">Balken = mittlerer Lauf, Strich = Bereich, in dem 80 % der Läufe liegen.</p>
      </section>

      <div className="card table-scroll">
        <table className="env-table">
          <thead>
            <tr>
              <th />
              {days.map((d) => (
                <th key={d.dayStart}>
                  {formatDay(d.dayStart)}
                  <span className="muted small"> Tag {d.dayIndex + 1}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" title="Anteil der Läufe mit mindestens 1 mm Niederschlag am Tag">
                Regen/Schnee
              </th>
              {days.map((d) => (
                <td key={d.dayStart}>{Math.round(d.precipProbability)} %</td>
              ))}
            </tr>
            <tr>
              <th scope="row" title="Wie einig sind sich die Läufe beim Höchstwert? hoch: 80 % liegen innerhalb von 3 °C, mittel: innerhalb von 6 °C">
                Einigkeit
              </th>
              {days.map((d) => (
                <td key={d.dayStart}>
                  <span className={`env-badge env-${CONFIDENCE_LEVEL[d.confidence]}`}>
                    <span className="env-label">{d.confidence}</span>
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" title="Anzahl der Läufe mit vollständigen Daten an diesem Tag">
                Läufe
              </th>
              {days.map((d) => (
                <td key={d.dayStart} className="muted small">
                  {d.memberCount}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="small muted">
        Quellen über Open-Meteo: {usedModels.map((m) => `${m.label} (${m.provider})`).join(', ')}. Nicht jedes Ensemble reicht bis
        Tag 16 – darum schwankt die Zahl der Läufe. Für Tag 1–7 gilt der Modellvergleich weiter oben.
      </p>
    </section>
  )
}
