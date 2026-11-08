import { useEffect, useMemo, useState } from 'react'
import { fetchMultiModelForecast } from '../api/openMeteo'
import { buildChartRows, reachInDays } from '../lib/chartData'
import { COMPARISON_MODELS } from '../lib/models'
import { dayStarts, localNow } from '../lib/time'
import type { ModelInfo, MultiModelForecast } from '../types/forecast'
import type { WeatherLocation } from '../types/location'
import { ModelChart } from './ModelChart'
import { ModelLegend } from './ModelLegend'

const DAYS = 7

type Result =
  | { key: string; forecast: MultiModelForecast }
  | { key: string; error: string }

/** Modellvergleich für 7 Tage: Temperatur, Niederschlag, Wind. */
export function ModelComparison({ location }: { location: WeatherLocation }) {
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  // Eindeutiger Schlüssel der aktuellen Anfrage. Passt das Ergebnis nicht dazu, laden wir gerade.
  const requestKey = `${location.latitude},${location.longitude},${location.elevation ?? ''},${reload}`

  useEffect(() => {
    const controller = new AbortController()
    fetchMultiModelForecast(location, COMPARISON_MODELS.map((m) => m.id), DAYS, controller.signal)
      .then((forecast) => setResult({ key: requestKey, forecast }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler.'
        setResult({ key: requestKey, error: message })
      })
    return () => controller.abort()
  }, [requestKey, location])

  const current = result && result.key === requestKey ? result : null
  const forecast = current && 'forecast' in current ? current.forecast : null

  const available: ModelInfo[] = useMemo(
    () => (forecast ? COMPARISON_MODELS.filter((m) => forecast.availableModels.includes(m.id)) : []),
    [forecast],
  )
  const visible = useMemo(() => available.filter((m) => !hidden.has(m.id)), [available, hidden])
  const visibleIds = useMemo(() => visible.map((m) => m.id), [visible])

  const charts = useMemo(() => {
    if (!forecast) return null
    return {
      temperature: buildChartRows(forecast, 'temperature_2m', visibleIds),
      precipitation: buildChartRows(forecast, 'precipitation', visibleIds),
      wind: buildChartRows(forecast, 'wind_speed_10m', visibleIds, 'wind_gusts_10m'),
      ticks: dayStarts(forecast.times),
      now: localNow(forecast.utcOffsetSeconds),
      reach: Object.fromEntries(available.map((m) => [m.id, reachInDays(forecast, m.id)])),
    }
  }, [forecast, visibleIds, available])

  function toggle(id: string) {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!current) {
    return <p className="hint">Wetterdaten von {COMPARISON_MODELS.length} Modellen werden geladen …</p>
  }

  if ('error' in current) {
    return (
      <div className="card">
        <p className="error">{current.error}</p>
        <p className="muted small">Prüfe deine Internetverbindung und versuche es noch einmal.</p>
        <button type="button" onClick={() => setReload((r) => r + 1)}>
          Erneut versuchen
        </button>
      </div>
    )
  }

  if (!charts || available.length === 0) {
    return <p className="notice">Für diesen Ort liefert leider kein Modell Daten.</p>
  }

  return (
    <div className="comparison">
      <h2>Modellvergleich – 7 Tage</h2>

      <ModelLegend
        models={available}
        hidden={hidden}
        reach={charts.reach}
        onToggle={toggle}
        onShowAll={() => setHidden(new Set())}
        onHideAll={() => setHidden(new Set(available.map((m) => m.id)))}
      />

      {visible.length === 0 ? (
        <p className="notice">Alle Modelle sind ausgeblendet. Klicke oben auf ein Modell, um es wieder anzuzeigen.</p>
      ) : (
        <>
          <ModelChart title="Temperatur" unit="°C" rows={charts.temperature} models={visible} dayTicks={charts.ticks} now={charts.now} />
          <ModelChart title="Niederschlag" unit="mm/h" rows={charts.precipitation} models={visible} dayTicks={charts.ticks} now={charts.now} fromZero />
          <ModelChart title="Wind" unit="km/h" rows={charts.wind} models={visible} dayTicks={charts.ticks} now={charts.now} fromZero extraLabel="Böen" />
        </>
      )}
    </div>
  )
}
