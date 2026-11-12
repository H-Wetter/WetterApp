import { wmoParts } from '../lib/wmo'

/**
 * Eigene, einheitliche Wettersymbole für alle WMO-Codes (Österreich-Karte).
 * Gezeichnet im Raster 64 × 64 aus wenigen Grundformen: Sonne, Wolke, Tropfen, Flocken,
 * Hagelkörner, Blitz und Nebelstreifen. Welche Teile ein Code hat, steht in src/lib/wmo.ts.
 *
 * Als <g> (für die SVG-Karte, mit x/y/size) oder als eigenes <svg> (für Listen und Text).
 */

const SUN = '#f5b301'
const CLOUD_LIGHT = '#ffffff'
const CLOUD_GRAY = '#cfd8e2'
const CLOUD_DARK = '#8f9bab'
const OUTLINE = '#5b6b80'
const RAIN = '#2a78d6'
const ICE = '#7cc7f2'
const BOLT = '#f5b301'

function Sun({ small }: { small: boolean }) {
  // kleiner und nach rechts oben gerückt, wenn eine Wolke davor ist
  const [cx, cy, r] = small ? [42, 20, 10] : [32, 32, 13]
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4
    const r1 = r + (small ? 3 : 5)
    const r2 = r + (small ? 7 : 11)
    return <line key={i} x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)} x2={cx + r2 * Math.cos(a)} y2={cy + r2 * Math.sin(a)} />
  })
  return (
    <g>
      <g stroke={SUN} strokeWidth={small ? 2.5 : 3.5} strokeLinecap="round">
        {rays}
      </g>
      <circle cx={cx} cy={cy} r={r} fill={SUN} />
    </g>
  )
}

/** Wolke aus drei Kreisen und einem flachen Boden */
function Cloud({ kind, low }: { kind: 'small' | 'light' | 'gray' | 'dark'; low: boolean }) {
  const fill = kind === 'dark' ? CLOUD_DARK : kind === 'gray' ? CLOUD_GRAY : CLOUD_LIGHT
  // „small“ = kleine Wolke vor der Sonne; „low“ = etwas höher, damit darunter Platz für Regen ist
  const s = kind === 'small' ? 0.7 : 1
  const dy = low ? -6 : 0
  const ox = kind === 'small' ? 4 : 0
  return (
    <g transform={`translate(${ox + (1 - s) * 18} ${dy + (1 - s) * 30}) scale(${s})`} fill={fill} stroke={OUTLINE} strokeWidth={2}>
      <path d="M14 46 a10 10 0 0 1 2-19.8 a14 14 0 0 1 27-3 a11 11 0 0 1 9 22.8 z" strokeLinejoin="round" />
    </g>
  )
}

function Drops({ precip, amount }: { precip: string; amount: number }) {
  const xs = amount === 1 ? [32] : amount === 2 ? [25, 39] : [20, 32, 44]
  return (
    <g>
      {xs.map((x, i) => {
        const y = 48 + (i % 2) * 4
        if (precip === 'snow') return <Flake key={x} x={x} y={y + 2} />
        if (precip === 'hail') return <circle key={x} cx={x} cy={y + 3} r={3} fill={ICE} stroke={OUTLINE} strokeWidth={1} />
        if (precip === 'drizzle') return <circle key={x} cx={x} cy={y + 3} r={2.8} fill={RAIN} />
        if (precip === 'sleet' && i % 2 === 1) return <Flake key={x} x={x} y={y + 2} />
        return <path key={x} d={`M${x - 2} ${y} l-3 9`} stroke={RAIN} strokeWidth={3.5} strokeLinecap="round" />
      })}
    </g>
  )
}

function Flake({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={ICE} strokeWidth={2.2} strokeLinecap="round">
      <line x1={x - 5} y1={y} x2={x + 5} y2={y} />
      <line x1={x - 2.5} y1={y - 4.3} x2={x + 2.5} y2={y + 4.3} />
      <line x1={x - 2.5} y1={y + 4.3} x2={x + 2.5} y2={y - 4.3} />
    </g>
  )
}

function Bolt() {
  return <path d="M34 40 l-8 12 h6 l-4 10 l11-14 h-6 l4-8 z" fill={BOLT} stroke={OUTLINE} strokeWidth={1.2} strokeLinejoin="round" />
}

function Fog({ freezing }: { freezing: boolean }) {
  return (
    <g stroke={freezing ? ICE : OUTLINE} strokeWidth={3.5} strokeLinecap="round">
      <line x1={12} y1={24} x2={52} y2={24} />
      <line x1={8} y1={33} x2={48} y2={33} />
      <line x1={16} y1={42} x2={56} y2={42} />
      <line x1={10} y1={51} x2={44} y2={51} />
    </g>
  )
}

/** Inhalt des Symbols im Raster 64 × 64 */
function Parts({ code }: { code: number }) {
  const p = wmoParts(code)
  const hasBelow = p.precip !== 'none' || p.thunder
  return (
    <>
      {p.sun && <Sun small={p.cloud !== 'none'} />}
      {p.cloud !== 'none' && <Cloud kind={p.cloud} low={hasBelow} />}
      {p.fog && <Fog freezing={p.freezing} />}
      {p.thunder && <Bolt />}
      {p.precip !== 'none' && <Drops precip={p.precip} amount={p.amount} />}
    </>
  )
}

/** Symbol als Teil einer SVG-Grafik: linke obere Ecke (x, y), Kantenlänge size */
export function WmoIconG({ code, x, y, size }: { code: number; x: number; y: number; size: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 64})`}>
      <title>{wmoParts(code).label}</title>
      <Parts code={code} />
    </g>
  )
}

/** Symbol als eigenes kleines Bild (z. B. in der Tagesauswahl) */
export function WmoIcon({ code, size = 32 }: { code: number; size?: number }) {
  const label = wmoParts(code).label
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={label} className="wmo-icon">
      <title>{label}</title>
      <Parts code={code} />
    </svg>
  )
}
