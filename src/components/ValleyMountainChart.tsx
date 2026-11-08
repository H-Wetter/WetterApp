import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { HourComparison } from '../lib/inversion'
import { formatDay, formatDayHour } from '../lib/time'

interface Props {
  hours: HourComparison[]
  valleyName: string
  mountainName: string
  ticks: number[]
  now: number
}

const HOUR_MS = 60 * 60 * 1000

/** Zusammenhängende Inversions-Zeiträume finden (für die farbigen Flächen). */
function inversionSpans(hours: HourComparison[]): { from: number; to: number }[] {
  const spans: { from: number; to: number }[] = []
  let start: number | null = null
  hours.forEach((h, i) => {
    if (h.inversion && start === null) start = h.t
    const endHere = start !== null && (!h.inversion || i === hours.length - 1)
    if (endHere && start !== null) {
      spans.push({ from: start, to: h.inversion ? h.t + HOUR_MS : h.t })
      start = null
    }
  })
  return spans
}

function fmt(v: number | null | undefined): string {
  return v === null || v === undefined ? '–' : `${v.toFixed(1).replace('.', ',')} °C`
}

function VMTooltip({
  active,
  payload,
  valleyName,
  mountainName,
}: Pick<TooltipContentProps<number, string>, 'active' | 'payload'> & { valleyName: string; mountainName: string }) {
  if (!active || !payload?.length) return null
  const h = payload[0].payload as unknown as HourComparison
  return (
    <div className="chart-tooltip">
      <p className="tt-time">{formatDayHour(h.t)}</p>
      <p>
        <span className="swatch vm-valley" /> {valleyName}: <strong>{fmt(h.valley)}</strong>
      </p>
      <p>
        <span className="swatch vm-mountain" /> {mountainName}: <strong>{fmt(h.mountain)}</strong>
      </p>
      {h.inversion && (
        <p className="vm-inv-text">
          Inversion: nach oben {fmt(h.strength)} wärmer
          {h.top !== null && `, bis ca. ${Math.round(h.top / 50) * 50} m`}
          {h.fogTop !== null && ` · Nebel bis ca. ${Math.round(h.fogTop / 50) * 50} m`}
        </p>
      )}
    </div>
  )
}

/** Temperatur Tal und Berg im Vergleich; Inversionszeiten sind orange hinterlegt. */
export function ValleyMountainChart({ hours, valleyName, mountainName, ticks, now }: Props) {
  const first = hours[0]?.t ?? 0
  const last = hours[hours.length - 1]?.t ?? 0
  const spans = inversionSpans(hours)

  return (
    <section className="card chart-card">
      <h3>
        Temperatur Tal und Berg <span className="muted small">(°C, Mittel der Modelle)</span>
      </h3>
      <p className="muted small chart-note">
        <span className="swatch vm-valley" /> {valleyName} &nbsp; <span className="swatch vm-mountain" /> {mountainName} &nbsp;
        <span className="swatch vm-inv" /> Inversion laut Temperaturprofil (oben wärmer als unten)
      </p>
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={hours} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            {spans.map((s) => (
              <ReferenceArea key={s.from} x1={s.from} x2={s.to} fill="var(--inversion)" fillOpacity={0.25} stroke="none" />
            ))}
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[first, last]}
              ticks={ticks}
              tickFormatter={formatDay}
              tick={{ fontSize: 12, fill: 'currentColor' }}
            />
            <YAxis domain={['auto', 'auto']} allowDecimals={false} tick={{ fontSize: 12, fill: 'currentColor' }} />
            <Tooltip content={(p) => <VMTooltip active={p.active} payload={p.payload} valleyName={valleyName} mountainName={mountainName} />} />
            {now >= first && now <= last && <ReferenceLine x={now} stroke="var(--accent)" strokeDasharray="4 3" />}
            <Line dataKey="valley" stroke="var(--valley)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line dataKey="mountain" stroke="var(--mountain)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
