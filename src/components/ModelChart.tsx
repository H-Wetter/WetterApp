import { useEffect, useRef, useState } from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { dailyExtremes, middayTicks, type ChartRow } from '../lib/chartData'
import { formatDay, formatDayHour } from '../lib/time'
import type { ModelInfo } from '../types/forecast'
import { LinkedText } from './LexikonLink'

interface Props {
  title: string
  unit: string
  rows: ChartRow[]
  /** Modelle, die als eigene dünne Linie gezeichnet werden (leer = nur Mittelwert + Streuband). */
  models: ModelInfo[]
  /** Mitternacht der Tage (7-Tage-Ansicht) bzw. Striche alle 3 Stunden (Stundenansicht) */
  ticks: number[]
  /** Beschriftung der x-Achse. Ohne Angabe: Tagesansicht – Tagesnamen mittig unter jedem Tag. */
  tickFormatter?: (t: number) => string
  /** Kleinere Höhe, z. B. in der Stundenansicht */
  compact?: boolean
  now: number
  /** y-Achse bei 0 beginnen lassen (Niederschlag, Wind). */
  fromZero?: boolean
  /** Beschriftung der Zusatzlinie (z. B. „Böen“) */
  extraLabel?: string
  /** Farbe des Diagramms als CSS-Variable, z. B. 'var(--chart-temp)' */
  color: string
  /** 'line' = Linie (Temperatur, Wind), 'bars' = Säulen je Stunde (Niederschlag) */
  kind?: 'line' | 'bars'
  /** Nachtzeiten [Beginn, Ende] – werden leicht grau hinterlegt */
  nights?: [number, number][]
  /** Höchst- und Tiefstwert je Tag beschriften (Temperatur, nur 7-Tage-Ansicht) */
  showExtremes?: boolean
  /** 0-Linie hervorheben (Temperatur: Frostgrenze) */
  zeroLine?: boolean
}

function fmt(value: number | null | undefined, unit: string): string {
  return value === null || value === undefined ? '–' : `${value.toFixed(1).replace('.', ',')} ${unit}`
}

/** Zahl für die Beschriftung im Diagramm, z. B. „−2°“ */
function short(v: number): string {
  return `${Math.round(v)}°`.replace('-', '−')
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
          Spanne: {fmt(row.band[0], '')}bis {fmt(row.band[1], unit)}
        </p>
      )}
      {extraLabel && (
        <p className="muted">
          {extraLabel}: {fmt(row.extraMean, unit)}
        </p>
      )}
      <p className="muted">{row.count} Modell(e)</p>
      {perModel.length > 0 && (
        <ul className="tt-models">
          {perModel.map(({ m, v }) => (
            <li key={m.id}>
              <span className="swatch" style={{ background: m.color }} />
              {m.label}: {v.toFixed(1).replace('.', ',')}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Kleine Legende über dem Diagramm (statt „Gestrichelte Linie = …“) */
function ChartLegend({ color, kind, extraLabel, withModels }: { color: string; kind: 'line' | 'bars'; extraLabel?: string; withModels: boolean }) {
  return (
    <ul className="chart-legend small">
      <li>
        <span className={kind === 'bars' ? 'lg-bar' : 'lg-line'} style={{ background: color }} />
        <span>Mittel aller Modelle</span>
      </li>
      <li>
        <span className="lg-band" style={{ background: color }} />
        <span>
          <LinkedText text="Spanne der Modelle (Modellstreuung)" />
        </span>
      </li>
      {extraLabel && (
        <li>
          <span className="lg-dash" style={{ borderColor: color }} />
          <span>
            <LinkedText text={extraLabel} />
          </span>
        </li>
      )}
      {withModels && <li className="muted">dünne Linien = einzelne Modelle</li>}
      <li className="muted lg-night-item">
        <span className="lg-night" />
        <span>Nacht</span>
      </li>
    </ul>
  )
}

/** Breite des Diagramms messen – für die Säulenbreite beim Niederschlag */
function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

/**
 * Ein Diagramm in der Farbe seiner Größe: dicke Linie (bzw. Säulen) = Mittelwert,
 * Fläche in derselben Farbe = Streuband (Min–Max), dünne bunte Linien = einzelne Modelle.
 * Nachtstunden leicht grau, Tagesnamen mittig unter jedem Tag.
 */
export function ModelChart({
  title,
  unit,
  rows,
  models,
  ticks,
  tickFormatter,
  compact,
  now,
  fromZero,
  extraLabel,
  color,
  kind = 'line',
  nights = [],
  showExtremes = false,
  zeroLine = false,
}: Props) {
  const [boxRef, width] = useWidth()
  const first = rows[0]?.t ?? 0
  const last = rows[rows.length - 1]?.t ?? 0
  // Tagesansicht (7 Tage): Tagesnamen mittig, Mitternacht als feine Trennlinie
  const dayMode = !tickFormatter
  const axisTicks = dayMode ? middayTicks(first, last) : ticks
  // Auf schmalen Bildschirmen nur die Höchstwerte – sonst drängen sich 14 Zahlen auf wenigen Zentimetern
  const extremes = showExtremes && dayMode ? dailyExtremes(rows).filter((e) => e.kind === 'max' || width >= 500) : []
  // Säulenbreite: ca. 70 % des Platzes je Stunde (abzüglich y-Achse)
  const barSize = Math.max(1, ((width - 40) / Math.max(1, rows.length)) * 0.7)

  return (
    <section className="card chart-card">
      <h3>
        {title} <span className="muted small">({unit})</span>
      </h3>
      <ChartLegend color={color} kind={kind} extraLabel={extraLabel} withModels={models.length > 0} />
      <div ref={boxRef} className={compact ? 'chart compact' : 'chart'}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 16, right: 8, bottom: 0, left: -16 }} barGap={0}>
            {/* nur waagrechte, ruhige Hilfslinien */}
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            {nights.map(([a, b]) => (
              <ReferenceArea key={a} x1={Math.max(a, first)} x2={Math.min(b, last)} fill="var(--night)" fillOpacity={1} stroke="none" ifOverflow="hidden" />
            ))}
            {/* Mitternacht bzw. Stundenstriche als feine senkrechte Linien */}
            {ticks.map((t) => (
              <ReferenceLine key={t} x={t} stroke="var(--grid)" />
            ))}
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[first, last]}
              ticks={axisTicks}
              tickFormatter={tickFormatter ?? formatDay}
              tick={{ fontSize: 12, fill: 'var(--muted)' }}
              tickLine={!dayMode}
              axisLine={{ stroke: 'var(--grid)' }}
            />
            <YAxis
              domain={fromZero ? [0, 'auto'] : ['auto', 'auto']}
              allowDecimals={false}
              tick={{ fontSize: 12, fill: 'var(--muted)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
              content={(p) => <ChartTooltip active={p.active} payload={p.payload} unit={unit} models={models} extraLabel={extraLabel} />}
            />
            {zeroLine && <ReferenceLine y={0} stroke="var(--freezing)" strokeWidth={1.5} />}
            {now >= first && now <= last && (
              <ReferenceLine
                x={now}
                stroke="var(--accent)"
                strokeDasharray="4 3"
                label={{ value: 'jetzt', fontSize: 11, fill: 'var(--accent)', position: 'insideTopLeft' }}
              />
            )}

            {/* Streuband zuerst, damit es hinter allem liegt */}
            <Area
              dataKey="band"
              type={kind === 'bars' ? 'step' : 'monotone'}
              stroke="none"
              fill={color}
              fillOpacity={0.2}
              isAnimationActive={false}
              activeDot={false}
            />

            {models.map((m) => (
              <Line
                key={m.id}
                dataKey={m.id}
                type="monotone"
                stroke={m.color}
                strokeWidth={1}
                strokeOpacity={0.7}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            ))}

            {extraLabel && (
              <Line
                dataKey="extraMean"
                type="monotone"
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}

            {kind === 'bars' ? (
              <Bar dataKey="mean" fill={color} barSize={barSize} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            ) : (
              <Line
                dataKey="mean"
                type="monotone"
                stroke={color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            )}

            {/* Höchst- und Tiefstwert je Tag – Zahl in Textfarbe, nicht in der Linienfarbe */}
            {extremes.map((e) => (
              <ReferenceDot
                key={`${e.kind}-${e.t}`}
                x={e.t}
                y={e.value}
                r={0}
                label={{
                  value: short(e.value),
                  position: e.kind === 'max' ? 'top' : 'bottom',
                  fontSize: 11,
                  fontWeight: 600,
                  fill: e.kind === 'max' ? 'var(--text)' : 'var(--muted)',
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
