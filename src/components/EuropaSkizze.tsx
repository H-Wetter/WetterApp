import { useMemo } from 'react'
import { centerText } from '../lib/druckgebilde'
import { KUESTE_QUELLE, SKIZZE_HEIGHT, SKIZZE_WIDTH, austriaPath, landPath, projectEurope } from '../lib/europaSkizze'
import type { PressureCenter } from '../types/grosswetterlage'

/**
 * Kleine Europa-Skizze mit den erkannten Hochs (H, blau) und Tiefs (T, rot) samt Kerndruck.
 * Österreich ist farbig hervorgehoben. Keine Kartenkacheln, nur ein SVG.
 */
export function EuropaSkizze({ centers }: { centers: PressureCenter[] }) {
  // Die Umrisse ändern sich nie: nur einmal berechnen
  const land = useMemo(() => landPath(), [])
  const austria = useMemo(() => austriaPath(), [])
  const label = centers.length > 0 ? `Europa-Skizze: ${centers.map(centerText).join('; ')}` : 'Europa-Skizze ohne ausgeprägte Hochs und Tiefs'

  return (
    <figure className="gwl-skizze">
      <svg viewBox={`0 0 ${SKIZZE_WIDTH} ${SKIZZE_HEIGHT}`} role="img" aria-label={label}>
        <rect width={SKIZZE_WIDTH} height={SKIZZE_HEIGHT} className="gwl-meer" />
        <path d={land} className="gwl-land" />
        <path d={austria} className="gwl-austria" />
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
      </svg>
      <figcaption className="muted small">H = Hoch, T = Tief, Zahl = Kerndruck in hPa. Österreich ist hervorgehoben. Küstenlinien: {KUESTE_QUELLE}.</figcaption>
    </figure>
  )
}
