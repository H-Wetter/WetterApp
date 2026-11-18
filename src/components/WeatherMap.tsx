import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { labelSize, leaderEnd, placeLabels, tempPair, type PlaceDay } from '../lib/austria'
import { WmoIconG } from './WmoIcon'

/**
 * Allgemeine Wetterkarte (SVG) für die Reiter „Österreich“ und „Europa“: Flächen (Bundesländer
 * bzw. Staaten) und Orte mit Wettersymbol, Höchst- und Tiefstwert. Die Beschriftungen werden so
 * gesetzt, dass sie sich nicht überlappen (placeLabels in src/lib/austria.ts).
 * Die CSS-Klassen heißen aus der Entstehung noch „austria-…“, gelten aber für beide Karten.
 */

/** Ab dieser Breite (Pixel) gilt die Karte als „schmal“: Schrift kleiner, Rand oben/unten für Beschriftungen */
const NARROW_PX = 560

/** Was die Karte von einem Ort braucht (OrtOesterreich und OrtEuropa passen beide) */
export interface KartenOrt {
  id: string
  name: string
  elevation: number
  latitude: number
  longitude: number
  /** Berglage bekommt einen andersfarbigen Punkt */
  art?: 'hauptstadt' | 'berg'
  /** true = nur auf breiten Karten zeigen (schmal ist zu wenig Platz) */
  nurBreit?: boolean
}

export interface MapPlace {
  ort: KartenOrt
  /** Wetter am gewählten Tag; null = noch keine Daten */
  day: PlaceDay | null
  /**
   * Breitester Temperatur-Text des Ortes über alle Tage (siehe widestTemps). Danach richtet sich
   * der Platz des Markers, damit er beim Wechsel des Tages nicht springt.
   */
  layoutTemps?: string | null
}

/** Eine Fläche der Karte (Bundesland oder Staat) */
export interface Flaeche {
  id: string
  /** Name unter der Karte beim Darüberfahren */
  name: string
  /** Tooltip */
  title: string
  /** SVG-Pfad */
  d: string
  /** false = Klick tut nichts (z. B. Staat ohne Hauptstadt auf der Karte) */
  clickable?: boolean
}

export interface KartenGeometrie {
  flaechen: Flaeche[]
  project: (lon: number, lat: number) => [number, number] | null
}

export interface KartenMasse {
  width: number
  height: number
  /** Höhe und freier Streifen oben/unten am Handy */
  mobileHeight: number
  mobileBand: number
  /** Unter dieser Breite (Pixel) gilt die Karte als schmal. Standard NARROW_PX */
  narrowPx?: number
}

interface Props {
  places: MapPlace[]
  /** Baut Flächen und Projektion für die gegebene Höhe (außerhalb der Komponente festlegen, damit sie stabil bleibt) */
  build: (height: number, band: number) => KartenGeometrie
  masse: KartenMasse
  ariaLabel: string
  /** Quellenangabe unter der Karte */
  quelle: string
  /** Text unter der Karte, solange man über keiner Fläche ist */
  hoverHint: string
  onSelectArea?: (id: string) => void
  onSelectPlace?: (id: string) => void
  selectedArea?: string | null
  selectedPlace?: string | null
  className?: string
  /** Zusätzliche Zeichnung über den Flächen, unter den Ortsmarkern (z. B. H und T) */
  overlay?: (project: KartenGeometrie['project'], font: number) => React.ReactNode
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

export function WeatherMap({
  places,
  build,
  masse,
  ariaLabel,
  quelle,
  hoverHint,
  onSelectArea,
  onSelectPlace,
  selectedArea = null,
  selectedPlace = null,
  className = '',
  overlay,
}: Props) {
  const MAP_WIDTH = masse.width
  const [boxRef, px] = useWidth()
  const narrow = px > 0 && px < (masse.narrowPx ?? NARROW_PX)
  const height = narrow ? masse.mobileHeight : masse.height
  const map = useMemo(() => build(height, narrow ? masse.mobileBand : 0), [build, height, narrow, masse.mobileBand])
  const [hover, setHover] = useState<string | null>(null)
  const hoverName = map.flaechen.find((l) => l.id === hover)?.name

  // Schrift in SVG-Einheiten, damit sie am Bildschirm ca. 16 px (Computer) bzw. 13 px (Handy, sehr schmal 12 px) groß ist
  const font = (narrow ? (px < 330 ? 12 : 13) : 16) * (MAP_WIDTH / (px || MAP_WIDTH))

  const markers = useMemo(() => {
    const items = places.flatMap((p) => {
      if (narrow && p.ort.nurBreit) return []
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
  }, [places, map, font, height, narrow])

  return (
    <figure className={`card austria-map ${className}`}>
      <div ref={boxRef}>
        <svg viewBox={`0 0 ${MAP_WIDTH} ${height}`} className="austria-svg" role="img" aria-label={ariaLabel}>
          {map.flaechen.map((l) => {
            const classes = [
              'land',
              l.clickable === false ? 'passive' : '',
              l.id === hover ? 'hover' : '',
              l.id === selectedArea ? 'selected' : '',
            ].join(' ')
            return (
              <path
                key={l.id}
                d={l.d}
                className={classes}
                onMouseEnter={() => setHover(l.id)}
                onMouseLeave={() => setHover((h) => (h === l.id ? null : h))}
                onClick={() => l.clickable !== false && onSelectArea?.(l.id)}
              >
                <title>{l.title}</title>
              </path>
            )
          })}

          {overlay?.(map.project, font)}

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
          {hoverName ?? hoverHint}
        </span>
        <span>Grenzen: {quelle}</span>
      </figcaption>
    </figure>
  )
}
