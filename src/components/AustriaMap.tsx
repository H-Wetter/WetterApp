import type { BundeslandId } from '../types/austria'
import { BUNDESLAENDER, MAP_HEIGHT, MAP_WIDTH, MOBILE_BAND, MOBILE_HEIGHT, buildAustriaMap } from '../lib/austriaMap'
import { WeatherMap, type KartenGeometrie, type MapPlace } from './WeatherMap'

export type { MapPlace } from './WeatherMap'

const MASSE = { width: MAP_WIDTH, height: MAP_HEIGHT, mobileHeight: MOBILE_HEIGHT, mobileBand: MOBILE_BAND }

/** Bundesländer als Flächen der allgemeinen Wetterkarte (außerhalb der Komponente: bleibt stabil) */
function build(height: number, band: number): KartenGeometrie {
  const map = buildAustriaMap(MAP_WIDTH, height, band)
  return {
    flaechen: map.lands.map((l) => ({ id: l.id, name: l.name, title: `${l.name} (Landeshauptstadt ${l.hauptstadt})`, d: l.d })),
    project: map.project,
  }
}

interface Props {
  places: MapPlace[]
  /** Klick auf ein Bundesland (für den Detailbereich, Etappe 17d) */
  onSelectLand?: (id: BundeslandId) => void
  /** Klick auf einen Ortsmarker */
  onSelectPlace?: (id: string) => void
  selectedLand?: BundeslandId | null
  /** Ort, dessen Details gerade offen sind */
  selectedPlace?: string | null
}

/** SVG-Karte der 9 Bundesländer mit Wettersymbol, Höchst-/Tiefstwert und Namen je Ort. */
export function AustriaMap({ places, onSelectLand, onSelectPlace, selectedLand = null, selectedPlace = null }: Props) {
  return (
    <WeatherMap
      places={places}
      build={build}
      masse={MASSE}
      ariaLabel="Karte von Österreich mit Wetter in den Landeshauptstädten"
      quelle={BUNDESLAENDER.quelle}
      hoverHint="Fahre über ein Bundesland."
      onSelectArea={(id) => onSelectLand?.(id as BundeslandId)}
      onSelectPlace={onSelectPlace}
      selectedArea={selectedLand}
      selectedPlace={selectedPlace}
    />
  )
}
