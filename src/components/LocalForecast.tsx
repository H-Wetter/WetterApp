import { useEffect, useMemo, useState } from 'react'
import { fetchMultiModelForecast } from '../api/openMeteo'
import { sliceForecast } from '../lib/chartData'
import { summarizeDays } from '../lib/daily'
import { COMPARISON_MODELS } from '../lib/models'
import { localNow } from '../lib/time'
import type { MultiModelForecast } from '../types/forecast'
import type { WeatherLocation } from '../types/location'
import { DailyTiles } from './DailyTiles'
import { DayDetail } from './DayDetail'
import { ModelComparison } from './ModelComparison'

/** Wir laden einmal 14 Tage – Kacheln nutzen bis zu 14, der Modellvergleich die ersten 7. */
const FETCH_DAYS = 14
const COMPARISON_DAYS = 7

type Result = { key: string; forecast: MultiModelForecast } | { key: string; error: string }

/** Lädt die Vorhersage für den Ort und zeigt Kacheln, Stundenansicht und Modellvergleich. */
export function LocalForecast({ location }: { location: WeatherLocation }) {
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  // Eindeutiger Schlüssel der aktuellen Anfrage. Passt das Ergebnis nicht dazu, laden wir gerade.
  const requestKey = `${location.latitude},${location.longitude},${location.elevation ?? ''},${reload}`

  useEffect(() => {
    const controller = new AbortController()
    fetchMultiModelForecast(location, COMPARISON_MODELS.map((m) => m.id), FETCH_DAYS, controller.signal)
      .then((forecast) => {
        setSelectedDay(null)
        setResult({ key: requestKey, forecast })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler.'
        setResult({ key: requestKey, error: message })
      })
    return () => controller.abort()
  }, [requestKey, location])

  const current = result && result.key === requestKey ? result : null
  const forecast = current && 'forecast' in current ? current.forecast : null

  const days = useMemo(() => (forecast ? summarizeDays(forecast) : []), [forecast])
  const comparison = useMemo(() => (forecast ? sliceForecast(forecast, COMPARISON_DAYS * 24) : null), [forecast])
  const now = forecast ? localNow(forecast.utcOffsetSeconds) : 0
  const selected = selectedDay !== null ? days[selectedDay] : undefined

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

  if (!forecast || !comparison || forecast.availableModels.length === 0 || days.length === 0) {
    return <p className="notice">Für diesen Ort liefert leider kein Modell Daten.</p>
  }

  return (
    <>
      <DailyTiles
        days={days}
        now={now}
        selectedIndex={selectedDay}
        onSelect={(i) => setSelectedDay((prev) => (prev === i ? null : i))}
      />
      {selected && (
        <DayDetail forecast={forecast} day={selected} now={now} onClose={() => setSelectedDay(null)} />
      )}
      <ModelComparison forecast={comparison} />
    </>
  )
}
