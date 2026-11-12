import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAustriaForecast } from '../api/austria'
import { friendlyError } from '../api/errors'
import { AustriaMap, type MapPlace } from '../components/AustriaMap'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { ORTE_OESTERREICH } from '../data/orte-oesterreich'
import { dayOverview, hauptstadtVon, ortAlsStandort, placeDays } from '../lib/austria'
import { PlaceDetail } from '../components/PlaceDetail'
import type { WeatherLocation } from '../types/location'
import { DayPicker } from '../components/DayPicker'
import type { MultiModelForecast } from '../types/forecast'

/** 7 Tage: so weit reicht die Tagesauswahl (Etappe 17c) */
const DAYS = 7

type Result = { key: number; data: Map<string, MultiModelForecast> } | { key: number; error: string }

/**
 * Seite „Österreich“ (Etappe 17): Wetter für die Landeshauptstädte und Ramsau am Dachstein auf einer Karte.
 * Tagesauswahl (7 Tage), Karte mit Wettersymbol, Höchst- und Tiefstwert, Detailbereich je Ort.
 */
export function AustriaPage({ onOpenLocal }: { onOpenLocal: (location: WeatherLocation) => void }) {
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  // gewählter Tag (0 = heute)
  const [dayIndex, setDayIndex] = useState(0)
  // gewählter Ort für den Detailbereich (null = zu)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const close = useCallback(() => setSelectedId(null), [])

  useEffect(() => {
    const controller = new AbortController()
    fetchAustriaForecast(ORTE_OESTERREICH, DAYS, controller.signal)
      .then((data) => setResult({ key: reload, data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setResult({ key: reload, error: friendlyError(err) })
      })
    return () => controller.abort()
  }, [reload])

  const current = result && result.key === reload ? result : null
  const data = current && 'data' in current ? current.data : null

  // Tageswerte je Ort einmal berechnen (alle 7 Tage), danach nur noch den gewählten Tag herausnehmen
  const perPlace = useMemo(() => ORTE_OESTERREICH.map((ort) => (data?.get(ort.id) ? placeDays(data.get(ort.id) as MultiModelForecast) : [])), [data])
  const days = useMemo(() => dayOverview(perPlace, DAYS), [perPlace])
  const places: MapPlace[] = useMemo(
    () => ORTE_OESTERREICH.map((ort, i) => ({ ort, day: perPlace[i][dayIndex] ?? null })),
    [perPlace, dayIndex],
  )

  const selected = ORTE_OESTERREICH.find((o) => o.id === selectedId) ?? null
  const selectedForecast = selected ? data?.get(selected.id) : undefined

  return (
    <div className="page">
      <h1>Österreich</h1>
      <p className="muted">Das Wetter in den Landeshauptstädten und in Ramsau am Dachstein auf einen Blick.</p>
      {!current && <Loading>Vorhersage für 10 Orte wird geladen …</Loading>}
      {current && 'error' in current && <ErrorMessage message={current.error} onRetry={() => setReload((r) => r + 1)} />}
      {days.length > 0 && <DayPicker days={days} selected={dayIndex} onSelect={setDayIndex} />}
      <div className={selected ? 'austria-layout open' : 'austria-layout'}>
        <ErrorBoundary label="Die Österreich-Karte">
          <AustriaMap
            places={places}
            selectedLand={selected?.art === 'hauptstadt' ? selected.bundesland : null}
            selectedPlace={selected?.id ?? null}
            onSelectLand={(land) => setSelectedId(hauptstadtVon(land, ORTE_OESTERREICH)?.id ?? null)}
            onSelectPlace={setSelectedId}
          />
        </ErrorBoundary>
        {selected && selectedForecast && (
          <>
            {/* Handy: abgedunkelter Hintergrund, Tippen darauf schließt */}
            <div className="pd-backdrop" onClick={close} aria-hidden="true" />
            <ErrorBoundary label="Der Detailbereich" resetKey={`${selected.id}-${dayIndex}`}>
              <PlaceDetail
                key={selected.id}
                ort={selected}
                forecast={selectedForecast}
                dayIndex={dayIndex}
                onClose={close}
                onOpenLocal={() => onOpenLocal(ortAlsStandort(selected))}
              />
            </ErrorBoundary>
          </>
        )}
      </div>
      {!selected && data && <p className="small muted">Tippe auf ein Bundesland oder einen Ort für Details.</p>}
      <p className="small muted">
        Symbol: häufigstes Wetter tagsüber (6–18 Uhr) über 6 Modelle (ICON, ECMWF, GFS, Météo-France, UKMO, GEM). Temperaturen:
        Höchst- und Tiefstwert, Mittel der Modelle.
      </p>
    </div>
  )
}
