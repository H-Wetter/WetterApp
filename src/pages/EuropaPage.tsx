import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAustriaForecast } from '../api/austria'
import { friendlyError } from '../api/errors'
import { loadEuropeGrid } from '../api/grosswetterlage'
import { DayPicker } from '../components/DayPicker'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { PlaceDetail } from '../components/PlaceDetail'
import { WeatherMap, type KartenGeometrie, type MapPlace } from '../components/WeatherMap'
import { ORTE_EUROPA } from '../data/orte-europa'
import { dayOverview, placeDays, widestTemps } from '../lib/austria'
import { centerText, findPressureCenters, timeIndexForDay } from '../lib/druckgebilde'
import {
  EUROPA_MAP_HEIGHT,
  EUROPA_MAP_WIDTH,
  EUROPA_MOBILE_BAND,
  EUROPA_MOBILE_HEIGHT,
  EUROPA_NARROW_PX,
  hauptstadtVonLand,
  landName,
  ortEuropaAlsStandort,
} from '../lib/europa'
import { EUROPA_LAENDER, buildEuropaKarte } from '../lib/europaMap'
import type { MultiModelForecast } from '../types/forecast'
import type { EuropeGrid } from '../types/grosswetterlage'
import type { WeatherLocation } from '../types/location'

/** 7 Tage wie im Reiter „Österreich“ */
const DAYS = 7

const MASSE = {
  width: EUROPA_MAP_WIDTH,
  height: EUROPA_MAP_HEIGHT,
  mobileHeight: EUROPA_MOBILE_HEIGHT,
  mobileBand: EUROPA_MOBILE_BAND,
  narrowPx: EUROPA_NARROW_PX,
}

/** Staaten als Flächen der Wetterkarte. Anklickbar sind nur Staaten, deren Hauptstadt auf der Karte steht. */
function build(height: number, band: number): KartenGeometrie {
  const map = buildEuropaKarte(EUROPA_MAP_WIDTH, height, band)
  return {
    flaechen: map.laender.map((l) => {
      const stadt = hauptstadtVonLand(l.id, ORTE_EUROPA)
      return { id: l.id, name: l.name, title: stadt ? `${l.name} (${stadt.name})` : l.name, d: l.d, clickable: !!stadt }
    }),
    project: map.project,
  }
}

type Result = { key: number; data: Map<string, MultiModelForecast> } | { key: number; error: string }
type GridState = { status: 'aus' } | { status: 'laedt' } | { status: 'da'; grid: EuropeGrid } | { status: 'fehler'; message: string }

/**
 * Seite „Europa“: Wetter in 21 Hauptstädten auf einer Karte, aufgebaut wie die Österreich-Karte
 * (gleiche Symbol-Regel, Tagesauswahl, Detailbereich). Auf Wunsch mit Hochs und Tiefs.
 *
 * Abrufe: 21 Orte × 6 Modelle in einem Aufruf, 30 Minuten gemerkt. Hochs und Tiefs brauchen das
 * Europa-Raster der Großwetterlage (273 Punkte), deshalb erst auf Knopfdruck; es wird 1 Stunde gemerkt
 * und mit dem Reiter „Österreich“ geteilt.
 */
export function EuropaPage({ onOpenLocal }: { onOpenLocal: (location: WeatherLocation) => void }) {
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [dayIndex, setDayIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [gridState, setGridState] = useState<GridState>({ status: 'aus' })
  const close = useCallback(() => setSelectedId(null), [])

  useEffect(() => {
    const controller = new AbortController()
    fetchAustriaForecast(ORTE_EUROPA, DAYS, controller.signal, 'Wetterdaten für Europa konnten nicht geladen werden')
      .then((data) => setResult({ key: reload, data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setResult({ key: reload, error: friendlyError(err) })
      })
    return () => controller.abort()
  }, [reload])

  const zeigeDruck = () => {
    setGridState({ status: 'laedt' })
    loadEuropeGrid()
      .then((grid) => setGridState({ status: 'da', grid }))
      .catch((err: unknown) => setGridState({ status: 'fehler', message: friendlyError(err) }))
  }

  const current = result && result.key === reload ? result : null
  const data = current && 'data' in current ? current.data : null

  const perPlace = useMemo(() => ORTE_EUROPA.map((ort) => (data?.get(ort.id) ? placeDays(data.get(ort.id) as MultiModelForecast) : [])), [data])
  const days = useMemo(() => dayOverview(perPlace, DAYS), [perPlace])
  const places: MapPlace[] = useMemo(
    () => ORTE_EUROPA.map((ort, i) => ({ ort, day: perPlace[i][dayIndex] ?? null, layoutTemps: widestTemps(perPlace[i].slice(0, DAYS)) })),
    [perPlace, dayIndex],
  )

  // Hochs und Tiefs am Mittag des gewählten Tages (gleiche Erkennung wie in der Großwetterlage)
  const dayStart = days[dayIndex]?.dayStart
  const centers = useMemo(() => {
    if (gridState.status !== 'da' || dayStart === undefined) return []
    const t = timeIndexForDay(gridState.grid.times, dayStart)
    return t >= 0 ? findPressureCenters(gridState.grid, t) : []
  }, [gridState, dayStart])

  const overlay = useCallback(
    (project: KartenGeometrie['project'], font: number) =>
      centers.map((c) => {
        const p = project(c.lon, c.lat)
        if (!p) return null
        return (
          <g key={`${c.kind}-${c.lat}-${c.lon}`} className={c.kind === 'T' ? 'gwl-kern tief' : 'gwl-kern hoch'}>
            <title>{centerText(c)}</title>
            <text x={p[0]} y={p[1]} textAnchor="middle" fontSize={font * 2} className="europa-kern-buchstabe">
              {c.kind}
            </text>
            <text x={p[0]} y={p[1] + font * 1.1} textAnchor="middle" fontSize={font * 0.9} className="europa-kern-druck">
              {c.hPa}
            </text>
          </g>
        )
      }),
    [centers],
  )

  const selected = ORTE_EUROPA.find((o) => o.id === selectedId) ?? null
  const selectedForecast = selected ? data?.get(selected.id) : undefined

  return (
    <div className="page">
      <h1>Europa</h1>
      <p className="muted">Das Wetter in 21 Hauptstädten Europas auf einen Blick (am Handy 14).</p>
      {!current && <Loading>Vorhersage für 21 Hauptstädte wird geladen …</Loading>}
      {current && 'error' in current && <ErrorMessage message={current.error} onRetry={() => setReload((r) => r + 1)} />}
      {days.length > 0 && <DayPicker days={days} selected={dayIndex} onSelect={setDayIndex} />}
      <div className={selected ? 'austria-layout open' : 'austria-layout'}>
        <ErrorBoundary label="Die Europa-Karte">
          <WeatherMap
            places={places}
            build={build}
            masse={MASSE}
            className="europa-map"
            ariaLabel="Karte von Europa mit Wetter in den Hauptstädten"
            quelle={EUROPA_LAENDER.quelle}
            hoverHint="Fahre über ein Land."
            selectedArea={selected?.land ?? null}
            selectedPlace={selected?.id ?? null}
            onSelectArea={(land) => setSelectedId(hauptstadtVonLand(land, ORTE_EUROPA)?.id ?? null)}
            onSelectPlace={setSelectedId}
            overlay={centers.length > 0 ? overlay : undefined}
          />
        </ErrorBoundary>
        {selected && selectedForecast && (
          <>
            <div className="pd-backdrop" onClick={close} aria-hidden="true" />
            <ErrorBoundary label="Der Detailbereich" resetKey={`${selected.id}-${dayIndex}`}>
              <PlaceDetail
                key={selected.id}
                ort={selected}
                zusatz={landName(selected.land)}
                forecast={selectedForecast}
                dayIndex={dayIndex}
                onClose={close}
                onOpenLocal={() => onOpenLocal(ortEuropaAlsStandort(selected))}
              />
            </ErrorBoundary>
          </>
        )}
      </div>
      {!selected && data && <p className="small muted">Tippe auf ein Land oder eine Stadt für Details.</p>}

      <div className="europa-druck">
        {gridState.status === 'aus' && (
          <button type="button" onClick={zeigeDruck}>
            Hochs und Tiefs einblenden
          </button>
        )}
        {gridState.status === 'laedt' && <Loading small>Luftdruck über Europa wird geladen …</Loading>}
        {gridState.status === 'fehler' && <ErrorMessage message={gridState.message} onRetry={zeigeDruck} />}
        {gridState.status === 'da' && (
          <p className="small muted">
            <span className="gwl-mark hoch">H</span> Hoch, <span className="gwl-mark tief">T</span> Tief, Zahl = Kerndruck in hPa (ECMWF, Mittag des
            gewählten Tages).{' '}
            {centers.length === 0 && 'An diesem Tag gibt es keine ausgeprägten Hochs und Tiefs im Kartenausschnitt.'}
          </p>
        )}
      </div>

      <p className="small muted">
        Symbol: häufigstes Wetter tagsüber (6–18 Uhr) über 6 Modelle (ICON, ECMWF, GFS, Météo-France, UKMO, GEM); rechnet ein Modell
        mindestens 1 mm Niederschlag am Tag, zählt es als Regen- bzw. Schneetag. Temperaturen: Höchst- und Tiefstwert, Mittel der Modelle.
      </p>
    </div>
  )
}
