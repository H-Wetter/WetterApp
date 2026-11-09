import { useEffect, useState } from 'react'
import { friendlyError } from '../api/errors'
import { fetchStationTemperatureHistory } from '../api/geosphere'
import { fetchPreviousDayTemperatures } from '../api/openMeteo'
import { CHECK_DAYS, MEAN_ID, biasText, scoreModels, type ModelScore } from '../lib/modelCheck'
import { COMPARISON_MODELS } from '../lib/models'
import { formatNum, prettyStationName } from '../lib/stations'
import type { StationCandidate } from '../types/station'
import { ErrorMessage } from './ErrorMessage'
import { Term } from './LexikonLink'
import { Loading } from './Loading'

type Result = { key: string; scores: ModelScore[] } | { key: string; error: string }

function modelName(id: string): string {
  if (id === MEAN_ID) return 'Mittelwert aller Modelle'
  return COMPARISON_MODELS.find((m) => m.id === id)?.label ?? id
}

/**
 * „Welches Modell lag zuletzt richtig?“ – aufklappbar. Die Daten werden erst beim Aufklappen geladen
 * (2 Abrufe: frühere Vorhersagen bei Open-Meteo, vergangene Messungen bei GeoSphere), damit
 * niemand für etwas bezahlt, das er nicht ansieht.
 */
export function ModelCheck({ station }: { station: StationCandidate }) {
  const [open, setOpen] = useState(false)
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const s = station.station
  const key = `${s.id},${reload}`

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    Promise.all([
      fetchPreviousDayTemperatures(s.lat, s.lon, s.altitude, COMPARISON_MODELS.map((m) => m.id), CHECK_DAYS, controller.signal),
      fetchStationTemperatureHistory(s.id, CHECK_DAYS * 24 + 24, controller.signal),
    ])
      .then(([prev, measured]) => setResult({ key, scores: scoreModels(prev, measured) }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setResult({ key, error: friendlyError(err) })
      })
    return () => controller.abort()
  }, [open, key, s.id, s.lat, s.lon, s.altitude])

  const current = result && result.key === key ? result : null
  const best = current && 'scores' in current ? current.scores : []
  const worst = best.length ? best[best.length - 1].mae : 1

  return (
    <details className="card model-check" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <strong>Welches Modell lag zuletzt richtig?</strong>{' '}
        <span className="muted small">Temperatur der letzten {CHECK_DAYS} Tage gegen die Messung</span>
      </summary>
      {open && !current && <Loading small>Frühere Vorhersagen und Messungen werden geladen …</Loading>}
      {current && 'error' in current && <ErrorMessage small message={current.error} onRetry={() => setReload((r) => r + 1)} />}
      {current && 'scores' in current && current.scores.length === 0 && (
        <p className="muted small">Für diese Station gibt es noch zu wenige vergleichbare Stunden.</p>
      )}
      {best.length > 0 && (
        <>
          <ol className="model-check-list">
            {best.map((sc, i) => (
              <li key={sc.modelId} className={sc.modelId === MEAN_ID ? 'model-check-mean' : undefined}>
                <span className="model-check-rank">{i + 1}.</span>
                <span className="model-check-name">{modelName(sc.modelId)}</span>
                <span className="model-check-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(4, (sc.mae / worst) * 100)}%` }} />
                </span>
                <span className="model-check-value">
                  <strong>{formatNum(sc.mae)} °C</strong> <span className="muted small">{biasText(sc.bias)}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="muted small">
            Ø-Abweichung der Temperatur-Vorhersage vom <strong>Vortag</strong> (rund 24 Stunden vorher) gegenüber der stündlichen
            Messung an der <Term id="messstation">Messstation</Term> {prettyStationName(s.name)} ({Math.round(s.altitude)} m),{' '}
            {best[0].hours} Stunden. Nur drei Tage – bei anderem Wetter (z. B. ohne <Term id="inversion">Inversion</Term>) kann die
            Reihenfolge ganz anders aussehen. Quellen: Open-Meteo (frühere Läufe), GeoSphere Austria (Messung).
          </p>
        </>
      )}
    </details>
  )
}
