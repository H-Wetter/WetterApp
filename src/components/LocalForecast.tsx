import { useEffect, useMemo, useState } from 'react'
import { fetchCloudProfile, fetchMultiModelForecast } from '../api/openMeteo'
import type { CloudProfileRaw } from '../types/clouds'
import { CloudSectionBlock } from './CloudSectionBlock'
import { reachInDays, sliceForecast } from '../lib/chartData'
import { summarizeDays } from '../lib/daily'
import { CLOUD_PROFILE_MODELS, COMPARISON_MODELS } from '../lib/models'
import { WARNING_EXTRA_VARIABLES, computeWarnings } from '../lib/warnings'
import { WarningsPanel } from './WarningsPanel'
import { EnvironmentPanel } from './EnvironmentPanel'
import { EnsembleTrend } from './EnsembleTrend'
import { dayStarts, localNow } from '../lib/time'
import type { ModelInfo, MultiModelForecast } from '../types/forecast'
import type { WeatherLocation } from '../types/location'
import { DayList } from './DayList'
import { BauernregelCard } from './BauernregelCard'
import { kalendertag, testdatumAusAdresse } from '../lib/bauernregeln'
import { ErrorBoundary } from './ErrorBoundary'
import { DayDetail } from './DayDetail'
import { ForecastCharts } from './ForecastCharts'
import { ModelComparison } from './ModelComparison'
import { Term } from './LexikonLink'
import { Loading } from './Loading'
import { MeasuredNow } from './MeasuredNow'
import { OfficialWarningsPanel } from './OfficialWarningsPanel'
import { ModelCheck } from './ModelCheck'
import type { StationCandidate } from '../types/station'
import type { MeasuredFog } from '../lib/stations'
import { ErrorMessage } from './ErrorMessage'
import { friendlyError } from '../api/errors'

/** Wir laden einmal 14 Tage – Kacheln nutzen bis zu 14, die Verlaufsdiagramme die ersten 7. */
const FETCH_DAYS = 14
const CHART_DAYS = 7
const OPEN_KEY = 'wetter-app.comparison-open'

type Result = { key: string; forecast: MultiModelForecast } | { key: string; error: string }
type CloudResult = { key: string; profile: CloudProfileRaw } | { key: string; error: string }

function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

/** Lädt die Vorhersage für den Ort und zeigt Kacheln, Stundenansicht und Verlaufsdiagramme. */
export function LocalForecast({ location }: { location: WeatherLocation }) {
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  // Modellvergleich: aufgeklappt? Welche Modelle ausgeblendet? Gilt für alle Diagramme (auch Stundenansicht).
  const [compareOpen, setCompareOpen] = useState(readOpen)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [cloudResult, setCloudResult] = useState<CloudResult | null>(null)
  // Nebel laut Messstation (Etappe 14c) – fließt in den Tagesverlauf der Stundenansicht ein
  const [measuredFog, setMeasuredFog] = useState<MeasuredFog | null>(null)
  // Station aus „Jetzt gemessen“ – für den Modell-Check
  const [station, setStation] = useState<StationCandidate | null>(null)

  // Eindeutiger Schlüssel der aktuellen Anfrage. Passt das Ergebnis nicht dazu, laden wir gerade.
  const requestKey = `${location.latitude},${location.longitude},${location.elevation ?? ''},${reload}`

  useEffect(() => {
    const controller = new AbortController()
    fetchMultiModelForecast(location, COMPARISON_MODELS.map((m) => m.id), FETCH_DAYS, controller.signal, WARNING_EXTRA_VARIABLES)
      .then((forecast) => {
        setSelectedDay(null)
        setResult({ key: requestKey, forecast })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const message = friendlyError(err)
        setResult({ key: requestKey, error: message })
      })
    // Wolkenschnitt: eigene Anfrage, läuft parallel. Ein Fehler hier betrifft nur dieses Diagramm.
    fetchCloudProfile(location, CLOUD_PROFILE_MODELS.map((m) => m.id), CHART_DAYS, controller.signal)
      .then((profile) => setCloudResult({ key: requestKey, profile }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const message = friendlyError(err)
        setCloudResult({ key: requestKey, error: message })
      })
    return () => controller.abort()
  }, [requestKey, location])

  const current = result && result.key === requestKey ? result : null
  const forecast = current && 'forecast' in current ? current.forecast : null
  const cloudCurrent = cloudResult && cloudResult.key === requestKey ? cloudResult : null
  const cloudProfile = cloudCurrent && 'profile' in cloudCurrent ? cloudCurrent.profile : null

  const days = useMemo(() => (forecast ? summarizeDays(forecast) : []), [forecast])
  // Warnhinweise nur für die ersten 7 Tage – danach rechnen zu wenige Modelle
  const warnings = useMemo(
    () => (forecast ? computeWarnings(forecast, days.slice(0, CHART_DAYS), location.elevation ?? 0) : []),
    [forecast, days, location.elevation],
  )
  const chartForecast = useMemo(() => (forecast ? sliceForecast(forecast, 0, CHART_DAYS * 24) : null), [forecast])

  const available: ModelInfo[] = useMemo(
    () => (forecast ? COMPARISON_MODELS.filter((m) => forecast.availableModels.includes(m.id)) : []),
    [forecast],
  )
  // Zugeklappt: alle Modelle zählen, keine Einzellinien. Aufgeklappt: nur die sichtbaren, jedes mit Linie.
  const visible = useMemo(
    () => (compareOpen ? available.filter((m) => !hidden.has(m.id)) : available),
    [available, hidden, compareOpen],
  )
  const statIds = useMemo(() => visible.map((m) => m.id), [visible])
  const lineModels = compareOpen ? visible : []
  const reach = useMemo(
    () => (chartForecast ? Object.fromEntries(available.map((m) => [m.id, reachInDays(chartForecast, m.id)])) : {}),
    [chartForecast, available],
  )

  function toggleCompare() {
    setCompareOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(OPEN_KEY, next ? '1' : '0')
      } catch {
        // Speichern nicht möglich – dann gilt es nur bis zum Neuladen.
      }
      return next
    })
  }

  function toggleModel(id: string) {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!current) {
    return <Loading>Wetterdaten von {COMPARISON_MODELS.length} Modellen werden geladen …</Loading>
  }

  if ('error' in current) {
    return (
      <ErrorMessage message={current.error} onRetry={() => setReload((r) => r + 1)} />
    )
  }

  if (!forecast || !chartForecast || available.length === 0 || days.length === 0) {
    return <p className="notice">Für diesen Ort liefert leider kein Modell Daten.</p>
  }

  const now = localNow(forecast.utcOffsetSeconds)
  // Für die Bauernregel: heutiger Tag, oder zum Ausprobieren ein Testdatum aus der Adresse (?datum=2026-11-11)
  const testdatum = testdatumAusAdresse(window.location.search)
  const selected = selectedDay !== null ? days[selectedDay] : undefined

  return (
    <>
      <ErrorBoundary label="Die amtlichen Warnungen" resetKey={requestKey}>
        <OfficialWarningsPanel location={location} />
      </ErrorBoundary>

      <ErrorBoundary label="Die Warnhinweise" resetKey={requestKey}>
        <WarningsPanel
          warnings={warnings}
          days={CHART_DAYS}
          now={now}
          onSelectDay={(dayStart) => setSelectedDay(days.findIndex((d) => d.dayStart === dayStart))}
        />
      </ErrorBoundary>

      <ErrorBoundary label="Jetzt gemessen" resetKey={requestKey}>
        <MeasuredNow location={location} forecast={forecast} onFog={setMeasuredFog} onStation={setStation} />
      </ErrorBoundary>

      {station && (
        <ErrorBoundary label="Der Modell-Check" resetKey={`${requestKey}-${station.station.id}`}>
          <ModelCheck station={station} />
        </ErrorBoundary>
      )}

      <ErrorBoundary label="Die Vorhersage" resetKey={requestKey}>
        <DayList
          forecast={forecast}
          days={days}
          now={now}
          warnings={warnings}
          selectedIndex={selectedDay}
          onSelect={(i) => setSelectedDay((prev) => (prev === i ? null : i))}
          detail={
            selected && (
              <ErrorBoundary label="Die Stundenansicht" resetKey={`${requestKey}-${selected.dayStart}`}>
                <DayDetail
                  forecast={forecast}
                  day={selected}
                  now={now}
                  statIds={statIds}
                  lineModels={lineModels}
                  cloudProfile={cloudProfile}
                  cloudError={cloudCurrent && 'error' in cloudCurrent ? cloudCurrent.error : null}
                  warnings={warnings.filter((w) => w.dayStart === selected.dayStart)}
                  measuredFog={measuredFog}
                  onClose={() => setSelectedDay(null)}
                />
              </ErrorBoundary>
            )
          }
        />
      </ErrorBoundary>

      <ErrorBoundary label="Die Bauernregel" resetKey={requestKey}>
        <BauernregelCard heute={testdatum ?? kalendertag(now)} tage={days} testdatum={testdatum !== null} />
      </ErrorBoundary>

      <ErrorBoundary label="Luft & Umwelt" resetKey={requestKey}>
        <EnvironmentPanel location={location} now={now} />
      </ErrorBoundary>

      <section className="trend">
        <h2>Verlauf – {CHART_DAYS} Tage</h2>
        <p className="muted small">
          Dicke Linie = Mittelwert aller Modelle, graue Fläche = Spanne vom niedrigsten bis zum höchsten Modell (
          <Term id="modellstreuung">Modellstreuung</Term>). Je breiter die Fläche, desto unsicherer die Vorhersage.
        </p>
        <ErrorBoundary label="Der Modellvergleich" resetKey={requestKey}>
          <ModelComparison
            open={compareOpen}
            onToggleOpen={toggleCompare}
            models={available}
            hidden={hidden}
            reach={reach}
            onToggleModel={toggleModel}
            onShowAll={() => setHidden(new Set())}
            onHideAll={() => setHidden(new Set(available.map((m) => m.id)))}
          />
        </ErrorBoundary>
        <ErrorBoundary label="Die Verlaufsdiagramme" resetKey={requestKey}>
          <ForecastCharts
            forecast={chartForecast}
            statIds={statIds}
            lineModels={lineModels}
            ticks={dayStarts(chartForecast.times)}
            now={now}
          />
        </ErrorBoundary>
        <ErrorBoundary label="Wolken nach Höhe" resetKey={requestKey}>
          <CloudSectionBlock
            profile={cloudProfile}
            error={cloudCurrent && 'error' in cloudCurrent ? cloudCurrent.error : null}
            modelIds={statIds}
            from={0}
            to={CHART_DAYS * 24}
            ticks={dayStarts(chartForecast.times)}
            arrowStep={12}
            now={now}
          />
        </ErrorBoundary>
      </section>

      <ErrorBoundary label="Der Trend Tag 8–16" resetKey={requestKey}>
        <EnsembleTrend location={location} />
      </ErrorBoundary>
    </>
  )
}
