import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { OrtOesterreich } from '../data/orte-oesterreich'
import { labelSize, leaderEnd, placeLabels, tempPair, type PlaceDay } from '../lib/austria'
import { BUNDESLAENDER, MAP_HEIGHT, MAP_WIDTH, MOBILE_BAND, MOBILE_HEIGHT, buildAustriaMap } from '../lib/austriaMap'
import type { BundeslandId } from '../types/austria'
import { WmoIconG } from './WmoIcon'

/** Ab dieser Breite (Pixel) gilt die Karte als „schmal“: Schrift kleiner, Rand oben/unten für Beschriftungen */
const NARROW_PX = 560

export interface MapPlace {
  ort: OrtOesterreich
  /** Wetter am gewählten Tag; null = noch keine Daten */
  day: PlaceDay | null
  /**
   * Breitester Temperatur-Text des Ortes über alle Tage (siehe widestTemps). Danach richtet sich
   * der Platz des Markers, damit er beim Wechsel des Tages nicht springt.
   */
  layoutTemps?: string | null
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

/** Breite des Kartenbereichs in Pixeln messen */
function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  // useLayoutEffect: Breite schon VOR dem ersten Anzeigen messen, sonst erscheint die Karte
  // kurz im falschen Format (Computer statt Handy) und springt dann um
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

/** SVG-Karte der 9 Bundesländer mit Wettersymbol, Höchst-/Tiefstwert und Namen je Ort. */
export function AustriaMap({ places, onSelectLand, onSelectPlace, selectedLand = null, selectedPlace = null }: Props) {
  const [boxRef, px] = useWidth()
  const narrow = px > 0 && px < NARROW_PX
  const height = narrow ? MOBILE_HEIGHT : MAP_HEIGHT
  const map = useMemo(() => buildAustriaMap(MAP_WIDTH, height, narrow ? MOBILE_BAND : 0), [height, narrow])
  const [hover, setHover] = useState<BundeslandId | null>(null)
  const hoverName = map.lands.find((l) => l.id === hover)?.name

  // Schrift in SVG-Einheiten, damit sie am Bildschirm ca. 16 px (Computer) bzw. 13 px (Handy, sehr schmal 12 px) groß ist
  const font = (narrow ? (px < 330 ? 12 : 13) : 16) * (MAP_WIDTH / (px || MAP_WIDTH))

  const markers = useMemo(() => {
    const items = places.flatMap((p) => {
      const pt = map.project(p.ort.longitude, p.ort.latitude)
      if (!pt) return []
      const temps = tempPair(p.day?.max ?? null, p.day?.min ?? null)
      // Platz nach dem breitesten Text der Woche, nicht nach dem des gewählten Tages: feste Positionen
      const size = labelSize(p.layoutTemps ?? temps, font)
      return [{ place: p, temps, x: pt[0], y: pt[1], ...size }]
    })
    const placed = placeLabels(
      items.map((m) => ({ id: m.place.ort.id, x: m.x, y: m.y, w: m.w, h: m.h, anchorY: m.anchorY })),
      MAP_WIDTH,
      height,
      font * 0.25,
      font * 0.45,
    )
    return items.map((m, i) => ({ ...m, box: placed[i] }))
  }, [places, map, font, height])

  return (
    <figure className="card austria-map">
      <div ref={boxRef}>
        <svg viewBox={`0 0 ${MAP_WIDTH} ${height}`} className="austria-svg" role="img" aria-label="Karte von Österreich mit Wetter in den Landeshauptstädten">
          {map.lands.map((l) => {
            const classes = ['land', l.id === hover ? 'hover' : '', l.id === selectedLand ? 'selected' : ''].join(' ')
            return (
              <path
                key={l.id}
                d={l.d}
                className={classes}
                onMouseEnter={() => setHover(l.id)}
                onMouseLeave={() => setHover((h) => (h === l.id ? null : h))}
                onClick={() => onSelectLand?.(l.id)}
              >
                <title>
                  {l.name} (Landeshauptstadt {l.hauptstadt})
                </title>
              </path>
            )
          })}

          {/* Verbindungslinien zuerst, damit sie unter den Beschriftungen liegen */}
          {markers.map((m) =>
            m.box.leader ? (
              <line
                key={`l-${m.place.ort.id}`}
                className="marker-leader"
                x1={m.x}
                y1={m.y}
                x2={leaderEnd(m.box, m.x, m.y)[0]}
                y2={leaderEnd(m.box, m.x, m.y)[1]}
                strokeWidth={font * 0.08}
              />
            ) : null,
          )}

          {markers.map((m) => {
            const { left, top, w } = m.box
            const ort = m.place.ort
            const day = m.place.day
            const textH = m.h - m.icon
            return (
              <g
                key={ort.id}
                className={['marker', ort.art === 'berg' ? 'berg' : '', ort.id === selectedPlace ? 'selected' : ''].join(' ')}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectPlace?.(ort.id)
                }}
              >
                <title>
                  {ort.name} ({ort.elevation} m){day?.max != null ? `: ${tempPair(day.max, day.min)}` : ''}
                </title>
                {/* Punkt nur, wenn der Marker vom Ort weggerückt ist */}
                {!m.box.onPoint && <circle className="marker-dot" cx={m.x} cy={m.y} r={font * 0.32} strokeWidth={font * 0.1} />}
                {/* unsichtbare Fläche, damit der ganze Marker anklickbar ist */}
                <rect className="marker-hit" x={left} y={top} width={w} height={m.h} rx={font * 0.35} />
                <text x={left + w / 2} y={top + font * 0.95} fontSize={font} textAnchor="middle" className="marker-temp">
                  {m.temps}
                </text>
                {day?.code != null && <WmoIconG code={day.code} x={left + (w - m.icon) / 2} y={top + textH} size={m.icon} />}
              </g>
            )
          })}
        </svg>
      </div>
      <figcaption className="small muted austria-caption">
        <span className="austria-hover" aria-live="polite">
          {hoverName ?? 'Fahre über ein Bundesland.'}
        </span>
        <span>Grenzen: {BUNDESLAENDER.quelle}</span>
      </figcaption>
    </figure>
  )
}
