import type { PrecipKind, WeatherSymbol } from '../lib/weatherSymbol'

interface Props {
  symbol: WeatherSymbol
  /** Größe in Pixel */
  size?: number
}

/** Ein Regentropfen mit Mittelpunkt (x, y). */
function Drop({ x, y }: { x: number; y: number }) {
  return (
    <path
      className="wi-drop"
      d={`M ${x} ${y - 8} C ${x + 6} ${y}, ${x + 5.5} ${y + 8}, ${x} ${y + 8} C ${x - 5.5} ${y + 8}, ${x - 6} ${y}, ${x} ${y - 8} Z`}
    />
  )
}

/** Eine Schneeflocke (sechs Arme) mit Mittelpunkt (x, y). */
function Flake({ x, y }: { x: number; y: number }) {
  const r = 7.5
  const arms = [0, 60, 120].map((deg) => {
    const rad = (deg * Math.PI) / 180
    const dx = r * Math.cos(rad)
    const dy = r * Math.sin(rad)
    return <line key={deg} x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy} />
  })
  return <g className="wi-flake">{arms}</g>
}

/** Positionen der Tropfen/Flocken je nach Anzahl (leicht versetzt, damit es nach Fallen aussieht). */
const POSITIONS: Record<1 | 2 | 3, { x: number; y: number }[]> = {
  1: [{ x: 32, y: 50 }],
  2: [{ x: 23, y: 48 }, { x: 41, y: 53 }],
  3: [{ x: 14, y: 47 }, { x: 32, y: 53 }, { x: 50, y: 47 }],
}

function Particles({ kind, count }: { kind: PrecipKind; count: 1 | 2 | 3 }) {
  if (kind === 'sleet') {
    // Schneeregen: immer ein Tropfen und eine Flocke
    return (
      <>
        <Drop x={22} y={49} />
        <Flake x={42} y={52} />
      </>
    )
  }
  const Item = kind === 'rain' ? Drop : Flake
  return (
    <>
      {POSITIONS[count].map((p) => (
        <Item key={`${p.x}-${p.y}`} x={p.x} y={p.y} />
      ))}
    </>
  )
}

/**
 * Mondscheibe in der richtigen Phase.
 * Dunkle Scheibe + beleuchteter Teil. Der beleuchtete Teil besteht aus einem Halbkreis (Mondrand)
 * und einer Halb-Ellipse (Licht-Schatten-Grenze). Zunehmend ist (bei uns) rechts hell, abnehmend links.
 */
export function MoonDisc({ cx, cy, r, phase }: { cx: number; cy: number; r: number; phase: number }) {
  const rx = Math.abs(Math.cos(2 * Math.PI * phase)) * r
  const top = `${cx} ${cy - r}`
  const bottom = `${cx} ${cy + r}`
  const waxing = phase < 0.5
  const d = waxing
    ? `M ${top} A ${r} ${r} 0 0 1 ${bottom} A ${rx} ${r} 0 0 ${phase < 0.25 ? 0 : 1} ${top} Z`
    : `M ${top} A ${r} ${r} 0 0 0 ${bottom} A ${rx} ${r} 0 0 ${phase > 0.75 ? 1 : 0} ${top} Z`
  return (
    <g>
      <circle className="wi-moon-dark" cx={cx} cy={cy} r={r} />
      <path className="wi-moon" d={d} />
    </g>
  )
}

/** Kleiner vierzackiger Stern. */
function Star({ x, y, r }: { x: number; y: number; r: number }) {
  const s = r * 0.3
  return (
    <path
      className="wi-star"
      d={`M ${x} ${y - r} L ${x + s} ${y - s} L ${x + r} ${y} L ${x + s} ${y + s} L ${x} ${y + r} L ${x - s} ${y + s} L ${x - r} ${y} L ${x - s} ${y - s} Z`}
    />
  )
}

/** Kleines Mondsymbol (z. B. in den Kacheln). */
export function MoonIcon({ phase, size = 16, label }: { phase: number; size?: number; label: string }) {
  return (
    <svg className="wi" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={label}>
      <title>{label}</title>
      <MoonDisc cx={32} cy={32} r={28} phase={phase} />
    </svg>
  )
}

/** Wolke aus drei Kreisen und einem abgerundeten Rechteck; `dy` verschiebt sie nach unten. */
function Cloud({ dy = 0 }: { dy?: number }) {
  return (
    <g className="wi-cloud" transform={`translate(0 ${dy})`}>
      <circle cx="20" cy="21" r="9" />
      <circle cx="33" cy="15" r="12" />
      <circle cx="46" cy="22" r="9" />
      <rect x="10" y="20" width="46" height="13" rx="6.5" />
    </g>
  )
}

/**
 * Wettersymbol: Bei Niederschlag eine eigene Grafik (Wolke + 1–3 Tropfen/Flocken),
 * nachts der Mond in seiner Phase (ggf. mit Wolke), sonst das passende Emoji.
 */
export function WeatherIcon({ symbol, size = 32 }: Props) {
  if (symbol.night) {
    const { moonPhase, cloud } = symbol.night
    return (
      <svg className="wi" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={symbol.label}>
        <title>{symbol.label}</title>
        {cloud ? (
          <>
            <MoonDisc cx={40} cy={22} r={16} phase={moonPhase} />
            <Cloud dy={20} />
          </>
        ) : (
          <>
            <MoonDisc cx={30} cy={34} r={20} phase={moonPhase} />
            {/* Zwei Sterne – damit „Nacht“ auch bei Neumond (dunkle Scheibe) sofort erkennbar ist */}
            <Star x={53} y={12} r={5} />
            <Star x={57} y={30} r={3} />
          </>
        )}
      </svg>
    )
  }

  if (!symbol.precip) {
    return (
      <span className="wi-emoji" style={{ fontSize: size * 0.85 }} role="img" aria-label={symbol.label}>
        {symbol.icon}
      </span>
    )
  }

  const { kind, intensity } = symbol.precip
  return (
    <svg className="wi" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={symbol.label}>
      <title>{symbol.label}</title>
      <Cloud />
      <Particles kind={kind} count={intensity} />
    </svg>
  )
}
