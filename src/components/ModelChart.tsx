import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { ChartRow } from '../lib/chartData'
import { formatDay, formatDayHour } from '../lib/time'
import type { ModelInfo } from '../types/forecast'
import { LinkedText } from './LexikonLink'

interface Props {
  title: string
  unit: string
  rows: ChartRow[]
  /** Modelle, die als eigene dünne Linie gezeichnet werden (leer = nur Mittelwert + Streuband). */
  models: ModelInfo[]
  /** Striche an der x-Achse (z. B. Mitternacht oder alle 3 Stunden) */
  ticks: number[]
  /** Beschriftung der x-Achse, Standard: Tag („Mo 9.11.“) */
  tickFormatter?: (t: number) => string
  /** Kleinere Höhe, z. B. in der Stundenansicht */
  compact?: boolean
  now: number
  /** y-Achse bei 0 beginnen lassen (Niederschlag, Wind). */
  fromZero?: boolean
  /** Beschriftung der Zusatzlinie (z. B. „Böen Ø“). */
  extraLabel?: string
}

function fmt(value: number | null | undefined, unit: string): string {
  return value === null || value === undefined ? '–' : `${value.toFixed(1)} ${unit}`
}

/** Eigener Tooltip: Statistik oben, darunter die Werte der einzelnen Modelle (größter zuerst). */
function ChartTooltip({
  active,
  payload,
  unit,
  models,
  extraLabel,
}: Pick<TooltipContentProps<number, string>, 'active' | 'payload'> & {
  unit: string
  models: ModelInfo[]
  extraLabel?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0].payload as unknown as ChartRow

  const perModel = models
    .map((m) => ({ m, v: row[m.id] }))
    .filter((x): x is { m: ModelInfo; v: number } => typeof x.v === 'number')
    .sort((a, b) => b.v - a.v)

  return (
    <div className="chart-tooltip">
      <p className="tt-time">{formatDayHour(row.t)}</p>
      <p>
        <strong>Mittel: {fmt(row.mean, unit)}</strong>
      </p>
      {row.band && (
        <p className="muted">
          Spanne: {row.band[0].toFixed(1)} bis {row.band[1].toFixed(1)} {unit}
        </p>
      )}
      {extraLabel && <p className="muted">{extraLabel}: {fmt(row.extraMean, unit)}</p>}
      <p className="muted">{row.count} Modell(e)</p>
      {perModel.length > 0 && <ul className="tt-models">
        {perModel.map(({ m, v }) => (
          <li key={m.id}>
            <span className="swatch" style={{ background: m.color }} />
            {m.label}: {v.toFixed(1)}
          </li>
        ))}
      </ul>}
    </div>
  )
}

/** Ein Diagramm: dünne Linie pro Modell, dicke Linie = Mittelwert, graue Fläche = Streuband (Min–Max). */
export function ModelChart({
  title,
  unit,
  rows,
  models,
  ticks,
  tickFormatter = formatDay,
  compact,
  now,
  fromZero,
  extraLabel,
}: Props) {
  const first = rows[0]?.t ?? 0
  const last = rows[rows.length - 1]?.t ?? 0

  return (
    <section className="card chart-card">
      <h3>
        {title} <span className="muted small">({unit})</span>
      </h3>
      {extraLabel && (
        <p className="muted small chart-note">
          <LinkedText text={`Gestrichelte Linie = ${extraLabel} (Mittel aller sichtbaren Modelle)`} />
        </p>
      )}
      <div className={compact ? 'chart compact' : 'chart'}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[first, last]}
              ticks={ticks}
              tickFormatter={tickFormatter}
              tick={{ fontSize: 12, fill: 'currentColor' }}
            />
            <YAxis
              domain={fromZero ? [0, 'auto'] : ['auto', 'auto']}
              allowDecimals={false}
              tick={{ fontSize: 12, fill: 'currentColor' }}
            />
            <Tooltip
              content={(p) => (
                <ChartTooltip active={p.active} payload={p.payload} unit={unit} models={models} extraLabel={extraLabel} />
              )}
            />
            {now >= first && now <= last && (
              <ReferenceLine x={now} stroke="var(--accent)" strokeDasharray="4 3" label={{ value: 'jetzt', fontSize: 11, fill: 'currentColor', position: 'insideTopLeft' }} />
            )}

            {/* Streuband zuerst, damit es hinter den Linien liegt */}
            <Area
              dataKey="band"
              stroke="none"
              fill="currentColor"
              fillOpacity={0.12}
              isAnimationActive={false}
              activeDot={false}
            />

            {models.map((m) => (
              <Line
                key={m.id}
                dataKey={m.id}
                stroke={m.color}
                strokeWidth={1.2}
                strokeOpacity={0.75}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            ))}

            {extraLabel && (
              <Line
                dataKey="extraMean"
                stroke="currentColor"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
            )}

            <Line dataKey="mean" stroke="currentColor" strokeWidth={3} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
