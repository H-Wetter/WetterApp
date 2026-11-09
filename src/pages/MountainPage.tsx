import { useEffect, useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import { fetchMultiModelForecast } from '../api/openMeteo'
import { findValleyAndMountain } from '../api/terrain'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { PlaceDayCard } from '../components/PlaceDayCard'
import { ValleyMountainChart } from '../components/ValleyMountainChart'
import { summarizeDays, summarizeHours } from '../lib/daily'
import { DEFAULT_LOCATION, DEFAULT_MOUNTAIN } from '../lib/defaults'
import { describeDay, joinParts } from '../lib/describe'
import { FOG_RH, MIN_HEIGHT_DIFFERENCE, PROFILE_EXTRA_VARIABLES, compareHours, distanceKm, profileInversions, summarizeInversion } from '../lib/inversion'
import { COMPARISON_MODELS } from '../lib/models'
import { MOUNTAIN_EXTRA_VARIABLES, toSummitForecast } from '../lib/mountain'
import { DEFAULT_RADIUS_KM, MAX_RADIUS_KM, MIN_RADIUS_KM } from '../lib/terrain'
import { dayStarts, formatDate, localNow, relativeDayName } from '../lib/time'
import type { MultiModelForecast } from '../types/forecast'
import type { WeatherLocation } from '../types/location'
import type { FoundPoint, TerrainResult } from '../types/terrain'
import { LinkedText, Term } from '../components/LexikonLink'
import { DayCourse } from '../components/DayCourse'
import { describeDayCourse } from '../lib/tagesverlauf'
import { Loading } from '../components/Loading'
import { ErrorMessage } from '../components/ErrorMessage'
import { friendlyError } from '../api/errors'

const DAYS = 7
const VALLEY_EXTRA_VARIABLES = [...PROFILE_EXTRA_VARIABLES, 'cape']
const SUMMIT_EXTRA_VARIABLES = [...MOUNTAIN_EXTRA_VARIABLES, 'cloud_cover_mid', 'cloud_cover_high']
const RADIUS_KEY = 'wetter-app.mountain-radius'
const RADIUS_CHOICES = [5, 10, 15, 20, 25, 30].filter((r) => r >= MIN_RADIUS_KM && r <= MAX_RADIUS_KM)
/** Bekannte Gipfel: Liegt der gefundene Punkt höchstens so nah daran (km), bekommt er dessen Namen. */
const KNOWN_PEAKS = [DEFAULT_MOUNTAIN]
const KNOWN_PEAK_KM = 1.5

interface Props {
  /** gewählter Ort aus „Lokal“ – `null` = noch keiner, dann Graz */
  valley: WeatherLocation | null
  onChooseValley: () => void
}

type TerrainState = { key: string; terrain: TerrainResult } | { key: string; error: string }
type ForecastState =
  | { key: string; valley: MultiModelForecast; mountain: MultiModelForecast | null }
  | { key: string; error: string }

function readRadius(): number {
  try {
    const r = Number(localStorage.getItem(RADIUS_KEY))
    return RADIUS_CHOICES.includes(r) ? r : DEFAULT_RADIUS_KM
  } catch {
    return DEFAULT_RADIUS_KM
  }
}

function where(p: FoundPoint): string {
  return p.distanceKm < 0.5 ? 'am Standort' : `${p.distanceKm.toFixed(0)} km ${p.direction}`
}

function meters(h: number): string {
  return `${Math.round(h / 50) * 50} m`
}

/** Seite „Berg & Tal“: Tal und Berg werden automatisch gesucht, Inversion aus dem Temperaturprofil. */
export function MountainPage({ valley: chosen, onChooseValley }: Props) {
  const place = chosen ?? DEFAULT_LOCATION
  const [radius, setRadius] = useState(readRadius)
  const [terrainState, setTerrainState] = useState<TerrainState | null>(null)
  const [waitSeconds, setWaitSeconds] = useState<number | null>(null)
  const [forecastState, setForecastState] = useState<ForecastState | null>(null)
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState(0)

  // ---------- 1. Tal und Berg im Gelände suchen ----------
  const terrainKey = `${place.latitude},${place.longitude},${radius},${reload}`
  useEffect(() => {
    const controller = new AbortController()
    findValleyAndMountain(place, radius, controller.signal, setWaitSeconds)
      .then((terrain) => setTerrainState({ key: terrainKey, terrain }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setTerrainState({ key: terrainKey, error: friendlyError(err) })
      })
      .finally(() => setWaitSeconds(null))
    return () => controller.abort()
  }, [terrainKey, place, radius])

  const terrain = terrainState && terrainState.key === terrainKey && 'terrain' in terrainState ? terrainState.terrain : null

  // Aus den gefundenen Punkten Orte für die Vorhersage machen
  const valley: WeatherLocation | null = useMemo(() => {
    if (!terrain) return null
    if (terrain.valleyIsLocation) return place
    return {
      name: `Talboden (${where(terrain.valley)})`,
      latitude: terrain.valley.lat,
      longitude: terrain.valley.lon,
      elevation: terrain.valley.elevation,
      source: 'search',
    }
  }, [terrain, place])

  const mountain: WeatherLocation | null = useMemo(() => {
    if (!terrain) return null
    const m = terrain.mountain
    const known = KNOWN_PEAKS.find((k) => distanceKm(k.latitude, k.longitude, m.lat, m.lon) <= KNOWN_PEAK_KM)
    return {
      name: known ? known.name : `Höchster Punkt (${where(m)})`,
      latitude: m.lat,
      longitude: m.lon,
      elevation: m.elevation,
      source: 'search',
    }
  }, [terrain])

  const groundElevation = terrain?.valley.elevation ?? 0
  const heightDiff = terrain ? terrain.mountain.elevation - terrain.valley.elevation : 0
  const hasMountain = heightDiff >= MIN_HEIGHT_DIFFERENCE

  // ---------- 2. Vorhersage für Tal (mit Profil) und Berg ----------
  const forecastKey = valley && mountain ? `${valley.latitude},${valley.longitude},${mountain.latitude},${mountain.longitude},${hasMountain},${reload}` : ''
  useEffect(() => {
    if (!valley || !mountain) return
    const controller = new AbortController()
    const ids = COMPARISON_MODELS.map((m) => m.id)
    Promise.all([
      // Tal: Temperaturprofil für die Inversion + CAPE für das Gewitterrisiko im Tagesverlauf
      fetchMultiModelForecast(valley, ids, DAYS, controller.signal, VALLEY_EXTRA_VARIABLES),
      // Berg: Höhenwerte für den Gipfel + mittlere/hohe Wolken („über dem Nebel sonnig?“)
      hasMountain ? fetchMultiModelForecast(mountain, ids, DAYS, controller.signal, SUMMIT_EXTRA_VARIABLES) : Promise.resolve(null),
    ])
      .then(([v, m]) => setForecastState({ key: forecastKey, valley: v, mountain: m }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setForecastState({ key: forecastKey, error: friendlyError(err) })
      })
    return () => controller.abort()
  }, [forecastKey, valley, mountain, hasMountain])

  const forecast = forecastState && forecastState.key === forecastKey ? forecastState : null
  const data = forecast && 'valley' in forecast ? forecast : null

  const summit = useMemo(
    () => (data?.mountain && mountain ? toSummitForecast(data.mountain, mountain.elevation ?? 0) : null),
    [data, mountain],
  )
  const inversionHours = useMemo(() => (data ? profileInversions(data.valley, groundElevation) : []), [data, groundElevation])
  const valleyDays = useMemo(() => (data ? summarizeDays(data.valley) : []), [data])
  const mountainDays = useMemo(() => (summit ? summarizeDays(summit) : []), [summit])
  const comparison = useMemo(() => (data ? compareHours(data.valley, summit, inversionHours) : []), [data, summit, inversionHours])

  const vDay = valleyDays[selected]
  const mDay = vDay ? mountainDays.find((d) => d.dayStart === vDay.dayStart) : undefined
  const inversion = useMemo(() => (vDay ? summarizeInversion(inversionHours, vDay) : null), [inversionHours, vDay])

  const valleyText = useMemo(
    () => (data && vDay ? describeDay(vDay, summarizeHours(data.valley, vDay), 'valley', inversion) : []),
    [data, vDay, inversion],
  )
  // Tagesverlauf in Worten; bei Inversion Tal und Berg getrennt
  const course = useMemo(
    () =>
      data && vDay
        ? describeDayCourse({
            forecast: data.valley,
            startIndex: vDay.startIndex,
            inversions: inversionHours,
            summit: hasMountain ? summit : null,
            summitElevation: mountain?.elevation,
          })
        : [],
    [data, vDay, inversionHours, hasMountain, summit, mountain],
  )
  const mountainText = useMemo(
    () => (summit && mDay && mountain ? describeDay(mDay, summarizeHours(summit, mDay), 'mountain', inversion, mountain.elevation) : []),
    [summit, mDay, inversion, mountain],
  )

  function chooseRadius(r: number) {
    setRadius(r)
    setSelected(0)
    try {
      localStorage.setItem(RADIUS_KEY, String(r))
    } catch {
      // nicht speicherbar – gilt dann nur bis zum Neuladen
    }
  }

  const now = data ? localNow(data.valley.utcOffsetSeconds) : 0
  const terrainError = terrainState && terrainState.key === terrainKey && 'error' in terrainState ? terrainState.error : null

  return (
    <div className="page">
      <h1>Berg &amp; Tal</h1>
      <p className="muted">
        Sucht automatisch das Tal und den höchsten Berg rund um deinen Ort, erkennt Inversionen (oben wärmer als unten) samt
        Nebelobergrenze und beschreibt den Tag für beide Lagen in Worten.
      </p>

      {!chosen && (
        <p className="notice">
          Du hast noch keinen Ort gewählt – es wird Graz verwendet.{' '}
          <button type="button" className="link-button" onClick={onChooseValley}>
            Ort wählen
          </button>
        </p>
      )}

      <section className="card terrain-card">
        <div className="terrain-head">
          <strong>Berg suchen im Umkreis von</strong>
          <div className="segmented" role="group" aria-label="Umkreis wählen">
            {RADIUS_CHOICES.map((r) => (
              <button key={r} type="button" className={r === radius ? 'active' : ''} aria-pressed={r === radius} onClick={() => chooseRadius(r)}>
                {r} km
              </button>
            ))}
          </div>
        </div>

        {!terrain && !terrainError && (
          <Loading small>
            Gelände rund um {place.name} wird abgesucht …
            {waitSeconds !== null && ` (kurze Pause wegen des Abruf-Limits, ca. ${waitSeconds} s)`}
          </Loading>
        )}
        {terrainError && (
          <ErrorMessage small message={terrainError} onRetry={() => setReload((r) => r + 1)} />
        )}

        {terrain && valley && mountain && (
          <>
            <ul className="terrain-list small">
              <li>
                <span className="swatch vm-valley" /> <strong>Tal:</strong>{' '}
                {terrain.valleyIsLocation ? `${place.name} selbst` : `tiefster Punkt im Umkreis von 5 km, ${where(terrain.valley)}`},{' '}
                {Math.round(terrain.valley.elevation)} m
              </li>
              <li>
                <span className="swatch vm-mountain" /> <strong>Berg:</strong> {mountain.name}, {Math.round(terrain.mountain.elevation)} m
                {mountain.name !== `Höchster Punkt (${where(terrain.mountain)})` && ` (${where(terrain.mountain)})`} –{' '}
                {Math.round(heightDiff)} m über dem Tal
              </li>
            </ul>
            {!hasMountain && (
              <p className="notice small">
                Im Umkreis von {radius} km liegt kein Punkt mindestens {MIN_HEIGHT_DIFFERENCE} m über dem Tal – darum gibt es keinen
                Berg-Vergleich. Vergrößere den Umkreis. Die Inversion wird trotzdem erkannt (aus dem Temperaturprofil).
              </p>
            )}
            <ErrorBoundary label="Die Geländekarte" resetKey={terrainKey}>
              <MapContainer
                key={`${place.latitude},${place.longitude},${radius}`}
                className="terrain-map"
                bounds={[
                  [place.latitude - radius / 111, place.longitude - radius / (111 * Math.cos((place.latitude * Math.PI) / 180))],
                  [place.latitude + radius / 111, place.longitude + radius / (111 * Math.cos((place.latitude * Math.PI) / 180))],
                ]}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Höhen: Open-Meteo (Copernicus DEM)'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Circle center={[place.latitude, place.longitude]} radius={radius * 1000} pathOptions={{ color: '#2f6fdd', weight: 1.5, fillOpacity: 0.05 }} />
                <CircleMarker center={[valley.latitude, valley.longitude]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#2f7fe0', fillOpacity: 1 }}>
                  <Tooltip>
                    Tal: {Math.round(terrain.valley.elevation)} m
                  </Tooltip>
                </CircleMarker>
                <CircleMarker center={[mountain.latitude, mountain.longitude]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#2b8a3e', fillOpacity: 1 }}>
                  <Tooltip>
                    {mountain.name}: {Math.round(terrain.mountain.elevation)} m
                  </Tooltip>
                </CircleMarker>
              </MapContainer>
            </ErrorBoundary>
          </>
        )}
      </section>

      {terrain && !forecast && <Loading>Vorhersage für Tal{hasMountain ? ' und Berg' : ''} wird geladen …</Loading>}
      {forecast && 'error' in forecast && (
        <ErrorMessage message={forecast.error} onRetry={() => setReload((r) => r + 1)} />
      )}

      {data && vDay && valley && mountain && (
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
              <strong>
                <LinkedText
                  text={inversion.fog ? (inversion.fogFromGround ? 'Inversion mit Nebel' : 'Inversion mit Hochnebel') : 'Inversion'}
                />
              </strong>
              {' – '}
              {inversion.fog && inversion.fogTop !== null
                ? <><Term id="hochnebel">Nebelobergrenze</Term> etwa {meters(inversion.fogTop)}: im Tal trüb und kühl, darüber sonnig und mild.</>
                : `nach oben wird es ${joinParts(inversion.parts) || 'zeitweise'} wärmer${inversion.top !== null ? `, bis etwa ${meters(inversion.top)}` : ''}.`}
              {inversion.maxStrength !== null && inversion.maxStrength >= 0.5 &&
                ` Bis zu ${inversion.maxStrength.toFixed(1).replace('.', ',')} °C Unterschied.`}
              {hasMountain && inversion.fog && inversion.fogTop !== null &&
                ` ${mountain.name} (${Math.round(mountain.elevation ?? 0)} m) liegt ${(mountain.elevation ?? 0) > inversion.fogTop + 100 ? 'darüber' : 'vermutlich im Nebel'}.`}
              {inversion.agreement !== null && (
                <span className="muted small"> ({Math.round(inversion.agreement * 100)} % der Modelle mit Profil sehen die Inversion)</span>
              )}
            </p>
          )}

          <div className="place-grid">
            <ErrorBoundary label="Die Tal-Karte" resetKey={`${forecastKey}-${selected}`}>
              <PlaceDayCard title="Tal" location={valley} elevation={groundElevation} day={vDay} sentences={valleyText} variant="valley" />
            </ErrorBoundary>
            {mDay && (
              <ErrorBoundary label="Die Berg-Karte" resetKey={`${forecastKey}-${selected}`}>
                <PlaceDayCard title="Berg" location={mountain} elevation={mountain.elevation} day={mDay} sentences={mountainText} variant="mountain" />
              </ErrorBoundary>
            )}
          </div>

          <ErrorBoundary label="Der Tagesverlauf" resetKey={`${forecastKey}-${selected}`}>
            <DayCourse periods={course} now={now} valleyName={valley.name} mountainName={mountain.name} />
          </ErrorBoundary>

          <ErrorBoundary label="Das Tal-Berg-Diagramm" resetKey={forecastKey}>
            <ValleyMountainChart
              hours={comparison}
              valleyName={valley.name}
              mountainName={hasMountain ? mountain.name : 'kein Berg im Umkreis'}
              ticks={dayStarts(data.valley.times)}
              now={now}
            />
          </ErrorBoundary>

          <p className="muted small">
            <strong>So wird gerechnet:</strong> Tal und Berg kommen aus einem Höhenmodell (90 m Raster, Open-Meteo): Tal = dein
            Ort oder der tiefste Punkt im Umkreis von 5 km, Berg = der höchste Punkt im gewählten Umkreis. Die{' '}
            <strong>
              <Term id="inversion">Inversion</Term>
            </strong>{' '}
            erkennen wir am Temperaturprofil der Modelle über dem Tal (2 m und Druckniveaus 1000–850 hPa,
            also bis ca. 1500 m): Wird es nach oben wärmer, liegt eine Inversion vor. Ist die Luft darunter sehr feucht (in den Modellen ≥ {FOG_RH} %
            Feuchte), schätzen wir daraus die{' '}
            <strong>
              <Term id="hochnebel">Nebelobergrenze</Term>
            </strong>
            . Für den Gipfel nehmen wir Temperatur und Wind aus der
            freien Atmosphäre in Gipfelhöhe.
          </p>
        </>
      )}
    </div>
  )
}
