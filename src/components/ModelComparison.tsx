import { useMemo, useState } from 'react'
import { buildChartRows, reachInDays } from '../lib/chartData'
import { COMPARISON_MODELS } from '../lib/models'
import { dayStarts, localNow } from '../lib/time'
import type { ModelInfo, MultiModelForecast } from '../types/forecast'
import { ModelChart } from './ModelChart'
import { ModelLegend } from './ModelLegend'

const OPEN_KEY = 'wetter-app.comparison-open'

function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Modellvergleich: Temperatur, Niederschlag, Wind – eine Linie pro Modell, Mittelwert und Streuband.
 * Standardmäßig zugeklappt (Detailinfo). Die Diagramme werden erst beim Aufklappen gezeichnet.
 */
export function ModelComparison({ forecast }: { forecast: MultiModelForecast }) {
  const [open, setOpen] = useState(readOpen)

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(OPEN_KEY, next ? '1' : '0')
      } catch {
        // Speichern nicht möglich – dann gilt es nur bis zum Neuladen.
      }
      return next
    })
  }

  const days = Math.round(forecast.times.length / 24)

  return (
    <section className="comparison card collapsible">
      <button type="button" className="collapse-toggle" aria-expanded={open} onClick={toggleOpen}>
        <span>
          <strong>Modellvergleich – {days} Tage</strong>
          <span className="muted small"> · {forecast.availableModels.length} Modelle im Detail</span>
        </span>
        <span className="chevron" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && <ComparisonContent forecast={forecast} />}
    </section>
  )
}

function ComparisonContent({ forecast }: { forecast: MultiModelForecast }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const available: ModelInfo[] = useMemo(
    () => COMPARISON_MODELS.filter((m) => forecast.availableModels.includes(m.id)),
    [forecast],
  )
  const visible = useMemo(() => available.filter((m) => !hidden.has(m.id)), [available, hidden])
  const visibleIds = useMemo(() => visible.map((m) => m.id), [visible])

  const charts = useMemo(
    () => ({
      temperature: buildChartRows(forecast, 'temperature_2m', visibleIds),
      precipitation: buildChartRows(forecast, 'precipitation', visibleIds),
      wind: buildChartRows(forecast, 'wind_speed_10m', visibleIds, 'wind_gusts_10m'),
      ticks: dayStarts(forecast.times),
      now: localNow(forecast.utcOffsetSeconds),
      reach: Object.fromEntries(available.map((m) => [m.id, reachInDays(forecast, m.id)])),
    }),
    [forecast, visibleIds, available],
  )

  function toggle(id: string) {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="comparison-body">
      <p className="muted small">
        Hier siehst du jedes Modell einzeln. Dicke Linie = Mittelwert, graue Fläche = Spanne vom niedrigsten bis zum höchsten Modell.
        Je breiter die Fläche, desto unsicherer die Vorhersage.
      </p>

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
