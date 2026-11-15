import { useMemo, useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DaySummary } from '../lib/daily'
import { PV_WIRKUNGSANTEIL, kwh, strahlungStunden, strahlungTage } from '../lib/strahlung'
import { formatDay, formatHour, relativeDayName } from '../lib/time'
import type { MultiModelForecast } from '../types/forecast'
import { Term } from './LexikonLink'

/** So viele Tage zeigt die Karte (danach liefern nur noch wenige Modelle Strahlung) */
const TAGE = 7

/**
 * Karte „Sonnenstrahlung“ auf „Lokal“ (Etappe 19): je Tag die Summe in kWh/m² mit Spanne der Modelle,
 * direkter und diffuser Anteil, Spitzenleistung und eine grobe Photovoltaik-Schätzung.
 * Ein Klick auf einen Tag zeigt darunter den Tagesverlauf als Diagramm.
 */
export function StrahlungPanel({ forecast, days, now }: { forecast: MultiModelForecast; days: DaySummary[]; now: number }) {
  const tage = useMemo(() => strahlungTage(forecast, days.slice(0, TAGE)), [forecast, days])
  const [selected, setSelected] = useState(0)
  const index = Math.min(selected, Math.max(0, tage.length - 1))
  const tag = tage[index]
  const day = tag ? days.find((d) => d.dayStart === tag.dayStart) : undefined
  const stunden = useMemo(() => (day ? strahlungStunden(forecast, day) : []), [forecast, day])
  // Balkenlänge im Verhältnis zum stärksten Tag
  const groesste = Math.max(...tage.map((t) => t.global), 0.1)

  if (tage.length === 0) return null

  return (
    <section className="card strahlung">
      <h2>Sonnenstrahlung</h2>
      <p className="muted small">
        Energie der Sonne auf eine waagrechte Fläche (<Term id="globalstrahlung">Globalstrahlung</Term>), Mittel der Modelle. Tippe auf einen Tag
        für den Verlauf.
      </p>
      <ul className="strahlung-liste">
        {tage.map((t, i) => (
          <li key={t.dayStart}>
            <button type="button" className={i === index ? 'strahlung-zeile aktiv' : 'strahlung-zeile'} onClick={() => setSelected(i)} aria-pressed={i === index}>
              <span className="strahlung-tag">{i < 2 ? relativeDayName(t.dayStart, now) : formatDay(t.dayStart)}</span>
              <span className="strahlung-balken" aria-hidden="true">
                <span style={{ width: `${Math.round((t.global / groesste) * 100)}%` }} />
              </span>
              <span className="strahlung-wert" title={`Modelle: ${kwh(t.globalMin)} bis ${kwh(t.globalMax)} kWh/m² (${t.modelle} Modelle)`}>
                {kwh(t.global)} kWh/m²
                {t.modelle > 1 && (
                  <span className="muted small">
                    {' '}
                    ({kwh(t.globalMin)}–{kwh(t.globalMax)})
                  </span>
                )}
              </span>
              <span className="strahlung-pv small" title="Grobe Schätzung für eine Photovoltaik-Anlage, je kWp installierter Leistung">
                PV ca. {kwh(t.pvKwhJeKwp)} kWh/kWp
              </span>
            </button>
          </li>
        ))}
      </ul>

      {tag && (
        <>
          <h3>
            Tagesverlauf {index < 2 ? relativeDayName(tag.dayStart, now).toLowerCase() : `am ${formatDay(tag.dayStart)}`}
          </h3>
          <p className="small">
            Summe {kwh(tag.global)} kWh/m²
            {tag.direkt !== null && tag.diffus !== null && (
              <>
                , davon direkt {kwh(tag.direkt)} und diffus {kwh(tag.diffus)}
              </>
            )}
            . Stärkste Stunde: {Math.round(tag.spitze / 10) * 10} W/m².
          </p>
          <div className="strahlung-chart">
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={stunden} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #d5dbe3)" />
                <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} ticks={stunden.filter((_, i) => i % 3 === 0).map((s) => s.t)} tickFormatter={(t: number) => formatHour(t).slice(0, 2)} fontSize={12} />
                <YAxis fontSize={12} width={48} domain={[0, 'auto']} allowDataOverflow />
                <Tooltip
                  labelFormatter={(t) => `${formatHour(Number(t))} Uhr`}
                  formatter={(value, name) => [`${Math.round(Number(value))} W/m²`, String(name)]}
                />
                <Area type="monotone" dataKey="global" name="gesamt" stroke="var(--chart-sun, #e0a100)" fill="var(--chart-sun, #e0a100)" fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} connectNulls />
                <Line type="monotone" dataKey="direkt" name="direkt" stroke="#d9480f" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
                <Line type="monotone" dataKey="diffus" name="diffus" stroke="#5c7cfa" strokeWidth={1.5} dot={false} strokeDasharray="4 3" isAnimationActive={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="muted small strahlung-legende">
            <span className="sl gesamt" /> gesamt <span className="sl direkt" /> direkt von der Sonne <span className="sl diffus" /> diffus (Himmel und Wolken), in
            W/m²
          </p>
        </>
      )}

      <p className="muted small">
        Photovoltaik: grobe Schätzung, Einstrahlung mal {String(PV_WIRKUNGSANTEIL).replace('.', ',')} (Verluste der Anlage), gerechnet für eine
        waagrechte Fläche. Nach Süden geneigte Module liefern im Winter deutlich mehr, Schnee auf den Modulen und Schatten sind nicht eingerechnet.
      </p>
    </section>
  )
}
