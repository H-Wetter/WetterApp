import { useId, useMemo, useState, type PointerEvent } from 'react'
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

/** Höhe der Niederschlagsleiste unter dem Diagramm (px) */
const PRECIP_H = 34
const MARGIN = { top: 8, right: 8, bottom: 22 + PRECIP_H + 8, left: 46 }
const HOUR_MS = 60 * 60 * 1000
/** Höhen, die an der y-Achse beschriftet werden */
const HEIGHT_TICKS = [500, 1000, 1500, 2000, 3000, 5000, 8000, 12000]
/** Wolkenballen sollen mindestens so breit sein (px) – sonst wirken sie wie Striche */
const MIN_PUFF_WIDTH = 16

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

/** Ein „Wolkenballen“: Ellipse als Körper, oben ein bis zwei Buckel. */
interface Puff {
  key: string
  cx: number
  cy: number
  rx: number
  ry: number
  /** Bewölkung 0–1 */
  s: number
}

/**
 * Aus den Zellen (Stunde × Höhenschicht) werden Wolkenballen. Bei schmalen Spalten (7 Tage)
 * fassen wir mehrere Stunden zu einem Ballen zusammen, damit er rund aussieht.
 * Dichte Bewölkung → großer, überlappender Ballen; dünne → kleiner, durchscheinender.
 */
function buildPuffs(cols: CloudColumn[], colW: number, x: (t: number) => number, y: (h: number) => number): Puff[] {
  const blockHours = Math.max(1, Math.ceil(MIN_PUFF_WIDTH / Math.max(0.1, colW)))
  const blockW = blockHours * colW
  const puffs: Puff[] = []

  for (let b = 0; b < cols.length; b += blockHours) {
    const block = cols.slice(b, b + blockHours)
    const levels = block[0].cells.map((c) => c.hPa)
    for (const hPa of levels) {
      const cells = block.map((c) => c.cells.find((cell) => cell.hPa === hPa)).filter((c) => c !== undefined)
      const covers = cells.map((c) => c.cover.mean).filter((v): v is number => v !== null)
      if (covers.length === 0) continue
      const cover = covers.reduce((a, v) => a + v, 0) / covers.length
      if (cover < 12) continue

      const bottom = cells.reduce((a, c) => a + c.bottom, 0) / cells.length
      const top = cells.reduce((a, c) => a + c.top, 0) / cells.length
      const yTop = y(top)
      const yBottom = y(bottom)
      const layerH = Math.max(2, yBottom - yTop)
      const s = Math.min(1, cover / 100)

      // Großzügig überlappend, damit benachbarte Ballen zu einer Wolkenmasse verschmelzen
      puffs.push({
        key: `${block[0].t}-${hPa}`,
        cx: x(block[0].t) + blockW / 2,
        cy: (yTop + yBottom) / 2,
        // Genug Überlappung, damit an den Ecken zwischen vier Ballen keine Löcher bleiben
        rx: blockW * (0.58 + 0.3 * s),
        ry: Math.max(8, layerH * (0.5 + 0.25 * s)),
        s,
      })
    }
  }
  return puffs
}

/** Ballen = Ellipse + zwei Buckel oben (typische Haufenwolken-Form). `scale` verkleinert für die dichte Schicht. */
function PuffShape({ p, scale = 1 }: { p: Puff; scale?: number }) {
  const rx = p.rx * scale
  const ry = p.ry * scale
  const r = Math.min(rx, ry)
  return (
    <g>
      <ellipse cx={p.cx} cy={p.cy} rx={rx} ry={ry} />
      <circle cx={p.cx - rx * 0.35} cy={p.cy - ry * 0.45} r={r * 0.85} />
      <circle cx={p.cx + rx * 0.25} cy={p.cy - ry * 0.55} r={r * 0.7} />
    </g>
  )
}

/**
 * Drei Dichte-Stufen, übereinander gezeichnet: Jede Stufe enthält alle Ballen ab ihrer Mindest-Bewölkung.
 * So hat jede Wolke einen dünnen Rand und – wo es dicht ist – einen kompakten Kern.
 */
const TIERS = [
  { name: 'thin', min: 0.12, scale: 1 },
  { name: 'medium', min: 0.35, scale: 0.9 },
  { name: 'dense', min: 0.65, scale: 0.8 },
] as const

interface Hover {
  col: CloudColumn
  height: number
  x: number
  y: number
}

/** Höhen-Zeit-Diagramm der Bewölkung („Wolkenschnitt“) mit Niederschlagsbalken. */
export function CloudSectionChart({ section, ticks, tickFormatter = formatDay, arrowStep, now, compact }: Props) {
  const { ref, width } = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<Hover | null>(null)
  // Eindeutige Namen für Farbverlauf und Schatten (falls das Diagramm zweimal auf der Seite ist)
  const uid = useId().replace(/:/g, '')

  const height = compact ? 260 : 330
  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right)
  const plotH = height - MARGIN.top - MARGIN.bottom
  const cols = section.columns
  const first = cols[0]?.t ?? 0
  const span = cols.length * HOUR_MS
  const colW = cols.length ? plotW / cols.length : 0
  // Bei wenig Platz (Handy) nur jede 2./3. Beschriftung und weniger Pfeile zeigen
  const tickSpacing = ticks.length > 1 ? (plotW * (ticks[1] - ticks[0])) / span : plotW
  const labelEvery = Math.max(1, Math.ceil(56 / Math.max(1, tickSpacing)))
  const effectiveArrowStep = arrowStep * Math.max(1, Math.ceil(24 / Math.max(1, colW * arrowStep)))

  const floor = axisFloor(section.ground)
  const y = useMemo(() => makeY(plotH, floor), [plotH, floor])
  const x = useMemo(() => (t: number) => MARGIN.left + ((t - first) / span) * plotW, [first, span, plotW])
  // Höhenbeschriftungen nur oberhalb des Geländes
  const heightTicks = HEIGHT_TICKS.filter((h) => h > section.ground + 100)

  const puffs = useMemo(() => (colW > 0 ? buildPuffs(cols, colW, x, y) : []), [cols, colW, x, y])

  // Wolkenbasis als Linienstücke (Lücken, wo keine tiefen Wolken sind)
  const basePaths = useMemo(() => {
    const paths: string[] = []
    let current: string[] = []
    cols.forEach((c) => {
      if (c.base === null) {
        if (current.length > 1) paths.push(current.join(' '))
        current = []
        return
      }
      const px = x(c.t) + colW / 2
      current.push(`${current.length === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${y(c.base).toFixed(1)}`)
    })
    if (current.length > 1) paths.push(current.join(' '))
    return paths
  }, [cols, colW, x, y])

  // Niederschlagsleiste: Maßstab mindestens 1 mm/h, damit Nieseln nicht riesig aussieht
  const precipTop = MARGIN.top + plotH + 6
  const precipMax = Math.max(1, ...cols.map((c) => c.precip ?? 0))

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const idx = Math.floor((px - MARGIN.left) / colW)
    if (idx < 0 || idx >= cols.length || py < MARGIN.top || py > precipTop + PRECIP_H) {
      setHover(null)
      return
    }
    setHover({ col: cols[idx], height: invertY(plotH, floor, Math.min(py, MARGIN.top + plotH)), x: px, y: py })
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
            <defs>
              {/* Himmel: oben dunkleres, unten helleres Blau */}
              <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className="cs-sky-top" />
                <stop offset="1" className="cs-sky-bottom" />
              </linearGradient>
              {/*
                „Verschmelz“-Filter: erst weichzeichnen, dann wieder scharf stellen.
                Dadurch fließen benachbarte Ballen zu einer Wolkenmasse mit weichem Rand zusammen.
              */}
              <filter id={`goo-${uid}`} x="-5%" y="-10%" width="110%" height="130%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 14 -4.5" result="goo" />
              </filter>
              {/* wie oben, zusätzlich ein weicher Schatten unten – hebt dichte Wolken vom Himmel ab */}
              <filter id={`goo-shadow-${uid}`} x="-5%" y="-10%" width="110%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 14 -4.5" result="goo" />
                <feDropShadow in="goo" dx="0" dy="2" stdDeviation="1.5" className="cs-shadow" />
              </filter>
            </defs>

            {/* Himmel */}
            <rect x={MARGIN.left} y={MARGIN.top} width={plotW} height={plotH} fill={`url(#sky-${uid})`} />

            {/* Höhenlinien (unter den Wolken) */}
            {heightTicks.map((h) => (
              <line key={h} className="cs-grid" x1={MARGIN.left} x2={MARGIN.left + plotW} y1={y(h)} y2={y(h)} />
            ))}

            {/* Wolken als Ballen; der Ausschnitt verhindert, dass sie über den Rand ragen */}
            <clipPath id={`clip-${uid}`}>
              <rect x={MARGIN.left} y={MARGIN.top} width={plotW} height={plotH} />
            </clipPath>
            <g clipPath={`url(#clip-${uid})`}>
              {TIERS.map((tier) => (
                <g
                  key={tier.name}
                  className={`cs-puff ${tier.name}`}
                  filter={tier.name === 'dense' ? `url(#goo-shadow-${uid})` : `url(#goo-${uid})`}
                >
                  {puffs
                    .filter((p) => p.s >= tier.min)
                    .map((p) => (
                      <PuffShape key={p.key} p={p} scale={tier.scale} />
                    ))}
                </g>
              ))}
            </g>

            {/* Gelände */}
            <rect className="cs-ground" x={MARGIN.left} y={y(section.ground)} width={plotW} height={MARGIN.top + plotH - y(section.ground)} />

            {/* Höhenbeschriftung */}
            {heightTicks.map((h) => (
              <text key={h} className="cs-label" x={MARGIN.left - 4} y={y(h) + 3} textAnchor="end">
                {h >= 1000 ? `${h / 1000} km` : `${h} m`}
              </text>
            ))}

            {/* Niederschlagsleiste */}
            <rect className="cs-precip-bg" x={MARGIN.left} y={precipTop} width={plotW} height={PRECIP_H} />
            {cols.map((c) =>
              c.precip !== null && c.precip >= 0.05 ? (
                <rect
                  key={`p-${c.t}`}
                  className={c.snow ? 'cs-precip snow' : 'cs-precip'}
                  x={x(c.t) + Math.min(0.5, colW * 0.1)}
                  width={Math.max(1, colW - Math.min(1, colW * 0.2))}
                  y={precipTop + PRECIP_H - (Math.min(c.precip, precipMax) / precipMax) * PRECIP_H}
                  height={(Math.min(c.precip, precipMax) / precipMax) * PRECIP_H}
                />
              ) : null,
            )}
            <text className="cs-label" x={MARGIN.left - 4} y={precipTop + 9} textAnchor="end">
              {precipMax.toFixed(precipMax < 10 ? 1 : 0).replace('.', ',')}
            </text>
            <text className="cs-label" x={MARGIN.left - 4} y={precipTop + PRECIP_H} textAnchor="end">
              mm/h
            </text>

            {/* Zeitachse */}
            {ticks.map((t, i) => (
              <g key={t}>
                <line className="cs-grid" x1={x(t)} x2={x(t)} y1={MARGIN.top} y2={precipTop + PRECIP_H} />
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
              .filter((c) => ((c.t - first) / HOUR_MS) % effectiveArrowStep === Math.floor(arrowStep / 2))
              .flatMap((c) =>
                c.winds
                  .filter((w) => w.direction.degrees !== null && w.direction.name !== 'still' && w.direction.name !== 'wechselnd')
                  .map((w) => (
                    <Arrow key={`${c.t}-${w.hPa}`} x={x(c.t) + colW / 2} y={y(w.height)} degrees={w.direction.degrees as number} />
                  )),
              )}

            {/* Jetzt */}
            {now >= first && now < first + span && (
              <line className="cs-now" x1={x(now)} x2={x(now)} y1={MARGIN.top} y2={precipTop + PRECIP_H} />
            )}

            {/* Markierung beim Darüberfahren */}
            {hover && <circle className="cs-hover" cx={hover.x} cy={hover.y} r={3} />}
          </svg>
        )}

        {hover && <CloudTooltip hover={hover} ground={section.ground} width={width} inPrecipBar={hover.y > MARGIN.top + plotH} />}
      </div>

      <ul className="cs-legend small muted">
        <li>
          <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
            <g className="cs-puff dense">
              <ellipse cx="11" cy="9" rx="10" ry="4.5" />
              <circle cx="7.5" cy="6.5" r="3.8" />
              <circle cx="13.5" cy="5.5" r="3.2" />
            </g>
          </svg>
          Wolken (groß und dicht = viel Bewölkung)
        </li>
        <li>
          <span className="cs-key cs-key-base" /> geschätzte Wolkenbasis
        </li>
        <li>
          <svg width="12" height="14" viewBox="-6 -8 12 16" aria-hidden="true">
            <g className="cs-arrow">
              <path d="M0 7 L-4 1 H-1.3 V-7 H1.3 V1 H4 Z" />
            </g>
          </svg>
          Zugrichtung (wohin die Wolken ziehen)
        </li>
        <li>
          <span className="cs-key cs-key-rain" /> Regen <span className="cs-key cs-key-snow" /> Schnee (mm pro Stunde)
        </li>
        <li>
          <span className="cs-key cs-key-ground" /> Gelände ({Math.round(section.ground)} m)
        </li>
      </ul>
    </section>
  )
}

function CloudTooltip({ hover, ground, width, inPrecipBar }: { hover: Hover; ground: number; width: number; inPrecipBar: boolean }) {
  const { col, height } = hover
  const cell = col.cells.find((c) => height >= c.bottom && height < c.top)
  const wind = [...col.winds].sort((a, b) => Math.abs(a.height - height) - Math.abs(b.height - height))[0]
  const left = hover.x > width / 2 ? hover.x - 220 : hover.x + 12
  const precip = col.precip ?? 0

  return (
    <div className="chart-tooltip cs-tooltip" style={{ left, top: Math.max(0, hover.y - 60) }}>
      <p className="tt-time">{formatDayHour(col.t)}</p>
      {inPrecipBar ? null : height < ground ? (
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
      <p className={inPrecipBar ? '' : 'muted'}>
        {inPrecipBar ? <strong>Niederschlag: </strong> : 'Niederschlag: '}
        {precip >= 0.05 ? `${precip.toFixed(1).replace('.', ',')} mm${col.snow ? ' (Schnee)' : ''}` : 'keiner'}
      </p>
      {!inPrecipBar && col.base !== null && <p className="muted">Wolkenbasis ≈ {Math.round(col.base / 50) * 50} m</p>}
      {!inPrecipBar && wind && wind.direction.degrees !== null && (
        <p className="muted">
          Wind in {Math.round(wind.height / 100) * 100} m: aus {wind.direction.name}, {Math.round(wind.speed ?? 0)} km/h
        </p>
      )}
    </div>
  )
}
