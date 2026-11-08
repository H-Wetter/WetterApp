import { useMemo, useState, type PointerEvent } from 'react'
import { MAX_HEIGHT, cloudMotionText, type CloudColumn, type CloudSection } from '../lib/clouds'
import { formatDay, formatDayHour } from '../lib/time'
import { useElementWidth } from './useElementWidth'

interface Props {
  section: CloudSection
  /** Striche an der x-Achse */
  ticks: number[]
  tickFormatter?: (t: number) => string
  /** alle wie viele Stunden ein Windpfeil gezeichnet wird */
  arrowStep: number
  now: number
  compact?: boolean
}

const MARGIN = { top: 8, right: 8, bottom: 22, left: 46 }
const HOUR_MS = 60 * 60 * 1000
/** Höhen, die an der y-Achse beschriftet werden */
const HEIGHT_TICKS = [500, 1000, 1500, 2000, 3000, 5000, 8000, 12000]

/**
 * Gestauchte Höhenachse (Wurzel): Die unteren Kilometer bekommen mehr Platz als die oberen,
 * weil dort Nebel, Hochnebel und tiefe Wolken spielen. Die Achse beginnt knapp unter dem Ort
 * (`floor`), damit das Gelände nicht unnötig Platz wegnimmt.
 */
function makeY(plotHeight: number, floor: number) {
  const top = Math.sqrt(MAX_HEIGHT - floor)
  return (h: number) =>
    MARGIN.top + plotHeight * (1 - Math.sqrt(Math.max(0, Math.min(h, MAX_HEIGHT) - floor)) / top)
}

function invertY(plotHeight: number, floor: number, py: number): number {
  const frac = 1 - (py - MARGIN.top) / plotHeight
  return floor + Math.pow(Math.max(0, Math.min(1, frac)) * Math.sqrt(MAX_HEIGHT - floor), 2)
}

/** Achse beginnt 150 m unter dem Ort (abgerundet auf 50 m), aber nie unter 0. */
function axisFloor(ground: number): number {
  return Math.max(0, Math.floor((ground - 150) / 50) * 50)
}

/** Windpfeil: zeigt, wohin die Wolken ziehen (Richtung „woher“ + 180°). */
function Arrow({ x, y, degrees }: { x: number; y: number; degrees: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${degrees})`} className="cs-arrow">
      <path d="M0 7 L-4 1 H-1.3 V-7 H1.3 V1 H4 Z" />
    </g>
  )
}

interface Hover {
  col: CloudColumn
  height: number
  x: number
  y: number
}

/** Höhen-Zeit-Diagramm der Bewölkung („Wolkenschnitt“). */
export function CloudSectionChart({ section, ticks, tickFormatter = formatDay, arrowStep, now, compact }: Props) {
  const { ref, width } = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<Hover | null>(null)

  const height = compact ? 220 : 280
  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right)
  const plotH = height - MARGIN.top - MARGIN.bottom
  const cols = section.columns
  const first = cols[0]?.t ?? 0
  const span = cols.length * HOUR_MS
  const x = (t: number) => MARGIN.left + ((t - first) / span) * plotW
  const colW = cols.length ? plotW / cols.length : 0
  // Bei wenig Platz (Handy) nur jede 2./3. Beschriftung und weniger Pfeile zeigen
  const tickSpacing = ticks.length > 1 ? (plotW * (ticks[1] - ticks[0])) / span : plotW
  const labelEvery = Math.max(1, Math.ceil(56 / Math.max(1, tickSpacing)))
  const effectiveArrowStep = arrowStep * Math.max(1, Math.ceil(24 / Math.max(1, colW * arrowStep)))

  const floor = axisFloor(section.ground)
  const y = useMemo(() => makeY(plotH, floor), [plotH, floor])
  // Höhenbeschriftungen nur oberhalb des Geländes
  const heightTicks = HEIGHT_TICKS.filter((h) => h > section.ground + 100)

  // Wolkenbasis als Linienstücke (Lücken, wo keine tiefen Wolken sind)
  const basePaths = useMemo(() => {
    const toX = (t: number) => MARGIN.left + ((t - first) / span) * plotW
    const paths: string[] = []
    let current: string[] = []
    cols.forEach((c) => {
      if (c.base === null) {
        if (current.length > 1) paths.push(current.join(' '))
        current = []
        return
      }
      const px = toX(c.t) + colW / 2
      current.push(`${current.length === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${y(c.base).toFixed(1)}`)
    })
    if (current.length > 1) paths.push(current.join(' '))
    return paths
  }, [cols, colW, y, plotW, first, span])

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const idx = Math.floor((px - MARGIN.left) / colW)
    if (idx < 0 || idx >= cols.length || py < MARGIN.top || py > MARGIN.top + plotH) {
      setHover(null)
      return
    }
    setHover({ col: cols[idx], height: invertY(plotH, floor, py), x: px, y: py })
  }

  // Zugrichtungs-Satz: für „jetzt“, oder – wenn „jetzt“ nicht im Diagramm liegt – für die Mitte des Zeitraums
  const nowCol = cols.find((c) => now >= c.t && now < c.t + HOUR_MS)
  const textCol = nowCol ?? cols[Math.floor(cols.length / 2)]
  const motionText = textCol ? cloudMotionText(textCol, section.ground) : null
  const motion = motionText && !nowCol ? `${formatDayHour(textCol.t)}: ${motionText}` : motionText

  return (
    <section className="card chart-card cloud-section">
      <h3>
        Wolken nach Höhe <span className="muted small">({section.modelCount} Modelle)</span>
      </h3>
      {motion && <p className="small cs-motion">{motion}</p>}

      <div className="cs-wrap" ref={ref} style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Wolkenschnitt">
            {/* Himmel */}
            <rect className="cs-sky" x={MARGIN.left} y={MARGIN.top} width={plotW} height={plotH} />

            {/* Wolken: eine Zelle pro Stunde und Höhenschicht, je mehr Wolken desto deckender */}
            {cols.map((c) =>
              c.cells.map((cell) =>
                cell.cover.mean !== null && cell.cover.mean >= 5 ? (
                  <rect
                    key={`${c.t}-${cell.hPa}`}
                    className="cs-cloud"
                    x={x(c.t)}
                    y={y(cell.top)}
                    width={colW + 0.5}
                    height={Math.max(0, y(cell.bottom) - y(cell.top))}
                    opacity={Math.min(1, cell.cover.mean / 100)}
                  />
                ) : null,
              ),
            )}

            {/* Gelände */}
            <rect className="cs-ground" x={MARGIN.left} y={y(section.ground)} width={plotW} height={MARGIN.top + plotH - y(section.ground)} />

            {/* Höhenlinien und Beschriftung */}
            {heightTicks.map((h) => (
              <g key={h}>
                <line className="cs-grid" x1={MARGIN.left} x2={MARGIN.left + plotW} y1={y(h)} y2={y(h)} />
                <text className="cs-label" x={MARGIN.left - 4} y={y(h) + 3} textAnchor="end">
                  {h >= 1000 ? `${h / 1000} km` : `${h} m`}
                </text>
              </g>
            ))}

            {/* Zeitachse */}
            {ticks.map((t, i) => (
              <g key={t}>
                <line className="cs-grid" x1={x(t)} x2={x(t)} y1={MARGIN.top} y2={MARGIN.top + plotH} />
                {i % labelEvery === 0 && (
                  <text className="cs-label" x={x(t)} y={height - 6} textAnchor="middle">
                    {tickFormatter(t)}
                  </text>
                )}
              </g>
            ))}

            {/* Geschätzte Wolkenbasis */}
            {basePaths.map((d, i) => (
              <path key={i} className="cs-base" d={d} />
            ))}

            {/* Zugrichtung: Pfeile in der Höhe der Windniveaus */}
            {cols
              .filter((c) => (c.t - first) / HOUR_MS % effectiveArrowStep === Math.floor(arrowStep / 2))
              .flatMap((c) =>
                c.winds
                  .filter((w) => w.direction.degrees !== null && w.direction.name !== 'still' && w.direction.name !== 'wechselnd')
                  .map((w) => (
                    <Arrow key={`${c.t}-${w.hPa}`} x={x(c.t) + colW / 2} y={y(w.height)} degrees={w.direction.degrees as number} />
                  )),
              )}

            {/* Jetzt */}
            {now >= first && now < first + span && (
              <line className="cs-now" x1={x(now)} x2={x(now)} y1={MARGIN.top} y2={MARGIN.top + plotH} />
            )}

            {/* Markierung beim Darüberfahren */}
            {hover && <circle className="cs-hover" cx={hover.x} cy={hover.y} r={3} />}
          </svg>
        )}

        {hover && <CloudTooltip hover={hover} ground={section.ground} width={width} />}
      </div>

      <ul className="cs-legend small muted">
        <li>
          <span className="cs-key cs-key-cloud" /> Bewölkung (je dunkler, desto dichter)
        </li>
        <li>
          <span className="cs-key cs-key-base" /> geschätzte Wolkenbasis
        </li>
        <li>
          <svg width="12" height="14" viewBox="-6 -8 12 16" aria-hidden="true">
            <g className="cs-arrow">
              <path d="M0 7 L-4 1 H-1.3 V-7 H1.3 V1 H4 Z" />
            </g>
          </svg>{' '}
          Zugrichtung (wohin die Wolken ziehen)
        </li>
        <li>
          <span className="cs-key cs-key-ground" /> Gelände ({Math.round(section.ground)} m)
        </li>
      </ul>
    </section>
  )
}

function CloudTooltip({ hover, ground, width }: { hover: Hover; ground: number; width: number }) {
  const { col, height } = hover
  const cell = col.cells.find((c) => height >= c.bottom && height < c.top)
  const wind = [...col.winds].sort((a, b) => Math.abs(a.height - height) - Math.abs(b.height - height))[0]
  const left = hover.x > width / 2 ? hover.x - 220 : hover.x + 12

  return (
    <div className="chart-tooltip cs-tooltip" style={{ left, top: Math.max(0, hover.y - 40) }}>
      <p className="tt-time">{formatDayHour(col.t)}</p>
      {height < ground ? (
        <p className="muted">Unter dem Gelände</p>
      ) : cell ? (
        <>
          <p>
            Höhe {Math.round(cell.bottom / 100) * 100}–{Math.round(cell.top / 100) * 100} m
          </p>
          <p>
            <strong>Bewölkung: {Math.round(cell.cover.mean ?? 0)} %</strong>
          </p>
          {cell.cover.count > 1 && (
            <p className="muted">
              Modelle: {Math.round(cell.cover.min ?? 0)} bis {Math.round(cell.cover.max ?? 0)} % ({cell.cover.count} Modelle)
            </p>
          )}
        </>
      ) : (
        <p className="muted">Keine Daten in dieser Höhe</p>
      )}
      {col.base !== null && <p className="muted">Wolkenbasis ≈ {Math.round(col.base / 50) * 50} m</p>}
      {wind && wind.direction.degrees !== null && (
        <p className="muted">
          Wind in {Math.round(wind.height / 100) * 100} m: aus {wind.direction.name}, {Math.round(wind.speed ?? 0)} km/h
        </p>
      )}
    </div>
  )
}
