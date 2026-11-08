import { useMemo } from 'react'
import { buildChartRows } from '../lib/chartData'
import type { ModelInfo, MultiModelForecast } from '../types/forecast'
import { ModelChart } from './ModelChart'

interface Props {
  /** bereits auf den gewünschten Zeitraum zugeschnitten */
  forecast: MultiModelForecast
  /** Modelle, die in Mittelwert und Streuband einfließen */
  statIds: string[]
  /** Modelle, die zusätzlich als eigene Linie gezeichnet werden (leer = keine Einzellinien) */
  lineModels: ModelInfo[]
  ticks: number[]
  tickFormatter?: (t: number) => string
  compact?: boolean
  now: number
}

/** Die drei Diagramme Temperatur, Niederschlag und Wind – für 7 Tage genauso wie für einen einzelnen Tag. */
export function ForecastCharts({ forecast, statIds, lineModels, ticks, tickFormatter, compact, now }: Props) {
  const rows = useMemo(
    () => ({
      temperature: buildChartRows(forecast, 'temperature_2m', statIds, 'apparent_temperature'),
      precipitation: buildChartRows(forecast, 'precipitation', statIds),
      wind: buildChartRows(forecast, 'wind_speed_10m', statIds, 'wind_gusts_10m'),
    }),
    [forecast, statIds],
  )

  if (statIds.length === 0) {
    return <p className="notice">Alle Modelle sind ausgeblendet. Blende im Modellvergleich mindestens ein Modell ein.</p>
  }

  const common = { models: lineModels, ticks, tickFormatter, compact, now }
  return (
    <>
      <ModelChart title="Temperatur" unit="°C" rows={rows.temperature} extraLabel="Gefühlte Temperatur" {...common} />
      <ModelChart title="Niederschlag" unit="mm/h" rows={rows.precipitation} fromZero {...common} />
      <ModelChart title="Wind" unit="km/h" rows={rows.wind} fromZero extraLabel="Böen" {...common} />
    </>
  )
}
