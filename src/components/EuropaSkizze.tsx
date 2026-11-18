import { useMemo } from 'react'
import { centerText } from '../lib/druckgebilde'
import { KUESTE_QUELLE, SKIZZE_HEIGHT, SKIZZE_WIDTH, austriaPath, laenderPfade, projectEurope } from '../lib/europaSkizze'
import type { Zugbahn } from '../lib/zugbahn'
import type { PressureCenter } from '../types/grosswetterlage'
import { ZugPfeil } from './ZugPfeil'

/**
 * Kleine Europa-Skizze mit den erkannten Hochs (H, blau) und Tiefs (T, rot) samt Kerndruck.
 * Österreich ist farbig hervorgehoben. Pfeile zeigen, wohin die Kerne in den nächsten 24 Stunden ziehen.
 * Keine Kartenkacheln, nur ein SVG.
 * @param zuege Zugbahn je Kern, gleiche Reihenfolge wie centers
 */
export function EuropaSkizze({ centers, zuege = [] }: { centers: PressureCenter[]; zuege?: (Zugbahn | null)[] }) {
  // Die Umrisse ändern sich nie: nur einmal berechnen
  const laender = useMemo(() => laenderPfade(), [])
  const austria = useMemo(() => austriaPath(), [])
  const label = centers.length > 0 ? `Europa-Skizze: ${centers.map(centerText).join('; ')}` : 'Europa-Skizze ohne ausgeprägte Hochs und Tiefs'

  return (
    <figure className="gwl-skizze">
      <svg viewBox={`0 0 ${SKIZZE_WIDTH} ${SKIZZE_HEIGHT}`} role="img" aria-label={label}>
        <rect width={SKIZZE_WIDTH} height={SKIZZE_HEIGHT} className="gwl-meer" />
        {laender.map((l) => (
          <path key={l.id} d={l.d} className="gwl-land">
            <title>{l.name}</title>
          </path>
        ))}
        <path d={austria} className="gwl-austria">
          <title>Österreich</title>
        </path>
        {centers.map((c) => {
          const [px, py] = projectEurope(c.lon, c.lat)
          // Kerne am Rand ein Stück hereinrücken, damit Buchstabe und Zahl nicht abgeschnitten werden
          const x = Math.min(SKIZZE_WIDTH - 30, Math.max(30, px))
          const y = Math.min(SKIZZE_HEIGHT - 22, Math.max(28, py))
          return (
            <g key={`${c.kind}-${c.lat}-${c.lon}`} className={c.kind === 'T' ? 'gwl-kern tief' : 'gwl-kern hoch'}>
              <text x={x} y={y} textAnchor="middle" className="gwl-kern-buchstabe">
                {c.kind}
              </text>
              <text x={x} y={y + 16} textAnchor="middle" className="gwl-kern-druck">
                {c.hPa}
              </text>
            </g>
          )
        })}
        {/* Pfeile über den Buchstaben, sonst verschwinden kurze Pfeile unter dem großen H bzw. T */}
        {centers.map((c, i) => (
          <ZugPfeil key={`z-${c.kind}-${c.lat}-${c.lon}`} zug={zuege[i] ?? null} kind={c.kind} project={projectEurope} breite={2.5} />
        ))}
      </svg>
      <figcaption className="muted small">H = Hoch, T = Tief, Zahl = Kerndruck in hPa, Pfeil = Zugrichtung der nächsten 24 Stunden. Österreich ist hervorgehoben. Grenzen: {KUESTE_QUELLE}.</figcaption>
    </figure>
  )
}
