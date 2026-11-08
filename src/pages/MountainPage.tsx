import { useEffect, useMemo, useState } from 'react'
import { fetchMultiModelForecast } from '../api/openMeteo'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { PlaceDayCard } from '../components/PlaceDayCard'
import { ValleyMountainChart } from '../components/ValleyMountainChart'
import { summarizeDays, summarizeHours } from '../lib/daily'
import { DEFAULT_LOCATION } from '../lib/defaults'
import { describeDay, joinParts } from '../lib/describe'
import { MAX_DISTANCE_KM, MIN_HEIGHT_DIFFERENCE, compareHours, distanceKm, summarizeInversion } from '../lib/inversion'
import { COMPARISON_MODELS } from '../lib/models'
import { MOUNTAIN_EXTRA_VARIABLES, toSummitForecast } from '../lib/mountain'
import { dayStarts, formatDate, localNow, relativeDayName } from '../lib/time'
import type { MultiModelForecast } from '../types/forecast'
import type { WeatherLocation } from '../types/location'

const DAYS = 7

interface Props {
  /** gewählter Ort aus „Lokal“ – `null` = noch keiner, dann Graz */
  valley: WeatherLocation | null
  mountain: WeatherLocation
  onChooseValley: () => void
}

type Result = { key: string; valley: MultiModelForecast; mountain: MultiModelForecast } | { key: string; error: string }

/** Seite „Berg & Tal“: Vergleich, Inversionserkennung und Tagesbeschreibung in Worten. */
export function MountainPage({ valley: chosenValley, mountain, onChooseValley }: Props) {
  const valley = chosenValley ?? DEFAULT_LOCATION
  const [result, setResult] = useState<Result | null>(null)
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState(0)

  const key = `${valley.latitude},${valley.longitude},${mountain.latitude},${mountain.longitude},${reload}`

  useEffect(() => {
    const controller = new AbortController()
    const ids = COMPARISON_MODELS.map((m) => m.id)
    Promise.all([
      fetchMultiModelForecast(valley, ids, DAYS, controller.signal),
      fetchMultiModelForecast(mountain, ids, DAYS, controller.signal, MOUNTAIN_EXTRA_VARIABLES),
    ])
      .then(([v, m]) => setResult({ key, valley: v, mountain: m }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setResult({ key, error: err instanceof Error ? err.message : 'Unbekannter Fehler.' })
      })
    return () => controller.abort()
  }, [key, valley, mountain])

  const current = result && result.key === key ? result : null
  const data = current && 'valley' in current ? current : null

  // Gipfel: Temperatur und Wind aus der freien Atmosphäre in Gipfelhöhe
  const summit = useMemo(
    () => (data ? toSummitForecast(data.mountain, mountain.elevation ?? 0) : null),
    [data, mountain.elevation],
  )
  const valleyDays = useMemo(() => (data ? summarizeDays(data.valley) : []), [data])
  const mountainDays = useMemo(() => (summit ? summarizeDays(summit) : []), [summit])
  const comparison = useMemo(() => (data && summit ? compareHours(data.valley, summit) : []), [data, summit])

  const heightDiff = (mountain.elevation ?? 0) - (valley.elevation ?? 0)
  const comparable = heightDiff >= MIN_HEIGHT_DIFFERENCE
  const distance = distanceKm(valley.latitude, valley.longitude, mountain.latitude, mountain.longitude)

  const vDay = valleyDays[selected]
  const mDay = vDay ? mountainDays.find((d) => d.dayStart === vDay.dayStart) : undefined
  const inversion = vDay && comparable ? summarizeInversion(comparison, vDay, mDay) : null

  const valleyText = useMemo(
    () => (data && vDay ? describeDay(vDay, summarizeHours(data.valley, vDay), 'valley', inversion) : []),
    [data, vDay, inversion],
  )
  const mountainText = useMemo(
    () => (summit && mDay ? describeDay(mDay, summarizeHours(summit, mDay), 'mountain', inversion) : []),
    [summit, mDay, inversion],
  )

  const now = data ? localNow(data.valley.utcOffsetSeconds) : 0

  return (
    <div className="page">
      <h1>Berg &amp; Tal</h1>
      <p className="muted">
        Vergleich zwischen deinem Ort (Tal) und einem Bergpunkt. Erkennt Inversionen – also wenn es oben wärmer ist als unten – und
        beschreibt den Tag für beide Lagen in Worten.
      </p>

      {!chosenValley && (
        <p className="notice">
          Du hast noch keinen Ort gewählt – als Tal wird Graz verwendet.{' '}
          <button type="button" className="link-button" onClick={onChooseValley}>
            Ort wählen
          </button>
        </p>
      )}
      {distance > MAX_DISTANCE_KM && (
        <p className="notice">
          {mountain.name} liegt rund {Math.round(distance)} km von {valley.name} entfernt. Der Vergleich ist darum nur grob – dort
          kann ganz anderes Wetter herrschen. (Ein eigener Bergpunkt in deiner Nähe wird später wählbar.)
        </p>
      )}
      {!comparable && (
        <p className="notice">
          {valley.name} liegt nur {Math.round(heightDiff)} m tiefer als {mountain.name}. Für einen sinnvollen Berg-Tal-Vergleich
          sollten es mindestens {MIN_HEIGHT_DIFFERENCE} m sein – die Inversionserkennung ist darum aus.
        </p>
      )}

      {!current && <p className="hint">Daten für Tal und Berg werden geladen …</p>}
      {current && 'error' in current && (
        <div className="card">
          <p className="error">{current.error}</p>
          <button type="button" onClick={() => setReload((r) => r + 1)}>
            Erneut versuchen
          </button>
        </div>
      )}

      {data && vDay && (
        <>
          <div className="segmented day-chips" role="group" aria-label="Tag wählen">
            {valleyDays.map((d, i) => (
              <button key={d.dayStart} type="button" className={i === selected ? 'active' : ''} aria-pressed={i === selected} onClick={() => setSelected(i)}>
                {i < 2 ? relativeDayName(d.dayStart, now) : `${relativeDayName(d.dayStart, now).slice(0, 2)} ${formatDate(d.dayStart)}`}
              </button>
            ))}
          </div>

          {inversion && inversion.hours >= 3 && (
            <p className="inversion-banner">
              <strong>{inversion.fog ? 'Inversion mit Hochnebel-Verdacht' : 'Inversion'}</strong>
              {' – '}
              {inversion.fog
                ? 'im Tal trüb und kühl, oben sonnig und mild.'
                : `am ${mountain.name} ist es ${joinParts(inversion.parts) || 'zeitweise'} wärmer als in ${valley.name}.`}
              {inversion.maxDiff !== null && inversion.maxDiff >= 0.5 && ` Bis zu ${inversion.maxDiff.toFixed(1).replace('.', ',')} °C Unterschied.`}
            </p>
          )}

          <div className="place-grid">
            <ErrorBoundary label="Die Tal-Karte" resetKey={`${key}-${selected}`}>
              <PlaceDayCard title="Tal" location={valley} elevation={valley.elevation} day={vDay} sentences={valleyText} variant="valley" />
            </ErrorBoundary>
            {mDay && (
              <ErrorBoundary label="Die Berg-Karte" resetKey={`${key}-${selected}`}>
                <PlaceDayCard title="Berg" location={mountain} elevation={mountain.elevation} day={mDay} sentences={mountainText} variant="mountain" />
              </ErrorBoundary>
            )}
          </div>

          <ErrorBoundary label="Das Tal-Berg-Diagramm" resetKey={key}>
            <ValleyMountainChart
              hours={comparison}
              valleyName={valley.name}
              mountainName={mountain.name}
              ticks={dayStarts(data.valley.times)}
              now={now}
            />
          </ErrorBoundary>

          <p className="muted small">
            <strong>So wird gerechnet:</strong> Für den Gipfel nehmen wir Temperatur und Wind aus der „freien Atmosphäre“ in
            Gipfelhöhe (aus den Höhenwerten der Modelle). Die übliche Umrechnung mit −0,65 °C pro 100 m würde Inversionen übersehen.
            Wolken, Niederschlag und Sonne kommen aus der normalen Vorhersage für den Berg. Inversion = am Berg wärmer als im Tal;
            Hochnebel-Verdacht = Inversion am Vormittag und im Tal deutlich weniger Sonne als am Berg.
          </p>
        </>
      )}
    </div>
  )
}
