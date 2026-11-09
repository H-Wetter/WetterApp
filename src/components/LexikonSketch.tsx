import type { ReactNode } from 'react'
import type { SketchId } from '../types/lexikon'

/*
 * Kleine Skizzen zum Wetterlexikon – einfache SVG-Zeichnungen (240 × 120 Punkte).
 * Farben kommen aus den CSS-Variablen der App, damit sie auch im Dunkelmodus passen.
 */

const T = { fill: 'var(--text)', fontSize: 10 } as const
const M = { fill: 'var(--muted)', fontSize: 9 } as const

/** Berg-Silhouette als Hintergrund */
function Mountain({ d = 'M0 120 L70 40 L95 60 L130 20 L175 75 L200 60 L240 120 Z' }: { d?: string }) {
  return <path d={d} fill="var(--ground)" opacity={0.55} />
}

/** Wolke aus Kreisen */
function Cloud({ x, y, s = 1, dark = false }: { x: number; y: number; s?: number; dark?: boolean }) {
  const fill = dark ? 'var(--muted)' : 'var(--cloud-dense)'
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} stroke="var(--border)" strokeWidth={0.8}>
      <circle cx={0} cy={0} r={9} />
      <circle cx={11} cy={-5} r={11} />
      <circle cx={24} cy={0} r={9} />
      <rect x={0} y={0} width={24} height={9} stroke="none" />
    </g>
  )
}

function Arrow({ d, color = 'var(--accent)' }: { d: string; color?: string }) {
  return (
    <g stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </g>
  )
}

const SKETCHES: Record<SketchId, { label: string; draw: () => ReactNode }> = {
  inversion: {
    label: 'Temperatur nach Höhe: normal nimmt sie ab, bei Inversion nimmt sie unten zu',
    draw: () => (
      <>
        <line x1={30} y1={110} x2={30} y2={10} stroke="var(--muted)" />
        <line x1={30} y1={110} x2={230} y2={110} stroke="var(--muted)" />
        <text x={4} y={14} {...M}>Höhe</text>
        <text x={172} y={106} {...M}>Temperatur</text>
        <path d="M150 105 L80 15" stroke="var(--muted)" strokeDasharray="4 3" fill="none" strokeWidth={1.5} />
        <text x={152} y={96} {...M}>normal</text>
        <path d="M70 105 L130 65 L90 15" stroke="var(--inversion)" fill="none" strokeWidth={3} />
        <text x={136} y={56} {...T}>Inversion:</text>
        <text x={136} y={68} {...T}>oben wärmer</text>
        <text x={38} y={102} {...T}>kalt</text>
      </>
    ),
  },
  hochnebel: {
    label: 'Nebelmeer im Tal, Berggipfel in der Sonne',
    draw: () => (
      <>
        <circle cx={205} cy={22} r={12} fill="var(--warn-1)" />
        <Mountain />
        <rect x={0} y={78} width={240} height={42} fill="var(--cloud-dense)" opacity={0.9} />
        <line x1={0} y1={78} x2={240} y2={78} stroke="var(--muted)" strokeDasharray="5 4" />
        <text x={6} y={74} {...T}>Nebelobergrenze</text>
        <text x={8} y={104} {...M}>Tal: grau und kühl</text>
        <text x={118} y={14} {...M}>oben: sonnig</text>
      </>
    ),
  },
  nullgrad: {
    label: 'Berg mit Nullgradgrenze und darunter liegender Schneefallgrenze',
    draw: () => (
      <>
        <Mountain />
        <line x1={0} y1={45} x2={240} y2={45} stroke="var(--freezing)" strokeDasharray="2 3" strokeWidth={2} />
        <text x={130} y={40} {...T}>0 °C: Nullgradgrenze</text>
        <line x1={0} y1={62} x2={240} y2={62} stroke="var(--snow-bar)" strokeWidth={2} />
        <text x={130} y={75} {...T}>Schneefallgrenze</text>
        <text x={6} y={28} {...M}>❄ Schnee</text>
        <text x={6} y={108} {...M}>💧 Regen</text>
      </>
    ),
  },
  foehn: {
    label: 'Luft steigt auf, regnet sich ab und fällt warm und trocken auf der anderen Seite herab',
    draw: () => (
      <>
        <Mountain d="M20 120 L120 25 L220 120 Z" />
        <Cloud x={52} y={38} />
        <Cloud x={80} y={22} s={0.8} />
        <Arrow d="M5 100 Q60 70 100 25 M92 26 L100 25 L100 34" />
        <Arrow d="M130 22 Q180 50 228 105 M218 104 L228 105 L227 95" color="var(--warn-3)" />
        <text x={6} y={60} {...M}>feucht, Regen</text>
        <text x={160} y={50} {...T}>warm, trocken</text>
      </>
    ),
  },
  cape: {
    label: 'Ein warmes Luftpaket steigt auf und bildet eine Gewitterwolke',
    draw: () => (
      <>
        <rect x={0} y={108} width={240} height={12} fill="var(--ground)" opacity={0.55} />
        <Cloud x={95} y={40} s={1.6} />
        <path d="M100 30 L170 30 L165 22 L105 22 Z" fill="var(--cloud-dense)" stroke="var(--border)" />
        <circle cx={60} cy={95} r={8} fill="var(--warn-2)" />
        <Arrow d="M60 85 L60 55 M54 61 L60 55 L66 61" color="var(--warn-2)" />
        <text x={10} y={50} {...T}>warme Luft steigt</text>
        <text x={118} y={95} {...M}>mehr CAPE = mehr Energie</text>
      </>
    ),
  },
  wolkenstockwerke: {
    label: 'Drei Stockwerke: tiefe, mittlere und hohe Wolken',
    draw: () => (
      <>
        <line x1={0} y1={40} x2={240} y2={40} stroke="var(--border)" strokeDasharray="3 3" />
        <line x1={0} y1={80} x2={240} y2={80} stroke="var(--border)" strokeDasharray="3 3" />
        <path d="M120 18 Q150 10 190 18" stroke="var(--muted)" fill="none" strokeWidth={2} />
        <path d="M130 26 Q160 20 200 26" stroke="var(--muted)" fill="none" strokeWidth={1.5} />
        <Cloud x={130} y={60} s={0.9} />
        <Cloud x={130} y={98} s={1.1} dark />
        <text x={6} y={22} {...T}>hoch (über 6 km)</text>
        <text x={6} y={62} {...T}>mittel (2–6 km)</text>
        <text x={6} y={102} {...T}>tief (unter 2 km)</text>
      </>
    ),
  },
  wolkenbasis: {
    label: 'Wolke mit markierter Unterkante über dem Boden',
    draw: () => (
      <>
        <rect x={0} y={108} width={240} height={12} fill="var(--ground)" opacity={0.55} />
        <Cloud x={90} y={40} s={1.8} />
        <line x1={20} y1={57} x2={220} y2={57} stroke="var(--cloud-base)" strokeDasharray="6 4" strokeWidth={2} />
        <text x={150} y={52} {...T}>Wolkenbasis</text>
        <Arrow d="M40 106 L40 60 M35 66 L40 60 L45 66" color="var(--muted)" />
        <text x={48} y={90} {...M}>≈ 125 m × (T − Taupunkt)</text>
      </>
    ),
  },
  streuung: {
    label: 'Mehrere Vorhersagelinien, die mit der Zeit auseinanderlaufen',
    draw: () => (
      <>
        <path d="M20 60 C80 60 140 30 230 15 L230 105 C140 90 80 62 20 60 Z" fill="var(--text)" opacity={0.1} />
        {[-40, -20, 0, 20, 40].map((k) => (
          <path key={k} d={`M20 60 C80 60 140 ${60 + k * 0.6} 230 ${60 + k * 1.1}`} stroke="var(--accent)" fill="none" strokeWidth={1} opacity={0.7} />
        ))}
        <path d="M20 60 C80 60 140 60 230 60" stroke="var(--text)" fill="none" strokeWidth={3} />
        <text x={20} y={112} {...M}>heute: sicher</text>
        <text x={150} y={112} {...M}>später: unsicher</text>
      </>
    ),
  },
  hochtief: {
    label: 'Isobaren um ein Hoch und ein Tief, Wind weht vom Hoch zum Tief',
    draw: () => (
      <>
        {[14, 28, 42].map((r) => (
          <ellipse key={`h${r}`} cx={60} cy={60} rx={r * 1.2} ry={r} stroke="var(--muted)" fill="none" />
        ))}
        {[12, 24, 36].map((r) => (
          <ellipse key={`t${r}`} cx={180} cy={60} rx={r * 1.2} ry={r} stroke="var(--muted)" fill="none" />
        ))}
        <text x={52} y={66} fontSize={18} fontWeight={700} fill="#1d4ed8">H</text>
        <text x={173} y={66} fontSize={18} fontWeight={700} fill="#c92a2a">T</text>
        <Arrow d="M95 40 Q120 30 140 42 M132 38 L140 42 L133 47" />
        <text x={30} y={115} {...M}>sinkende Luft, ruhig</text>
        <text x={140} y={115} {...M}>steigende Luft, Regen</text>
      </>
    ),
  },
  trog: {
    label: 'Höhenströmung mit einem Trog (kalt, nach Süden) und einem Hochkeil (warm, nach Norden)',
    draw: () => (
      <>
        <path d="M0 40 C40 40 60 100 90 100 C120 100 130 20 170 20 C200 20 215 40 240 40" stroke="var(--text)" fill="none" strokeWidth={2.5} />
        <path d="M60 60 C70 95 110 95 120 60 Z" fill="#4c6ef5" opacity={0.35} />
        <path d="M140 40 C150 15 190 15 200 40 Z" fill="#fa5252" opacity={0.35} />
        <text x={70} y={80} {...T}>Trog</text>
        <text x={153} y={36} {...T}>Hochkeil</text>
        <text x={6} y={14} {...M}>Norden</text>
        <text x={6} y={112} {...M}>Süden</text>
      </>
    ),
  },
  kaltfront: {
    label: 'Kalte Luft schiebt sich unter warme Luft und hebt sie an',
    draw: () => (
      <>
        <path d="M0 110 L0 50 Q60 60 110 110 Z" fill="#4c6ef5" opacity={0.3} />
        <Cloud x={95} y={45} s={1.3} dark />
        <Arrow d="M20 90 L70 90 M62 85 L70 90 L62 95" color="#4c6ef5" />
        <Arrow d="M120 100 Q110 80 112 62" color="var(--warn-3)" />
        <text x={6} y={40} {...T}>kalt</text>
        <text x={170} y={100} {...T}>warm</text>
        <path d="M0 116 L240 116" stroke="#1d4ed8" strokeWidth={2} />
        {[30, 80, 130, 180].map((x) => (
          <path key={x} d={`M${x} 116 L${x + 8} 108 L${x + 16} 116 Z`} fill="#1d4ed8" />
        ))}
      </>
    ),
  },
  warmfront: {
    label: 'Warme Luft gleitet langsam auf kalte Luft auf, die Wolken werden immer tiefer',
    draw: () => (
      <>
        <path d="M0 110 L240 110 L240 30 Q120 60 0 110 Z" fill="var(--warn-3)" opacity={0.15} />
        <Cloud x={190} y={30} s={0.7} />
        <Cloud x={130} y={55} s={1} />
        <Cloud x={60} y={80} s={1.2} dark />
        <Arrow d="M230 100 Q150 80 70 60" color="var(--warn-3)" />
        <text x={8} y={20} {...M}>hohe Schleierwolken kommen zuerst</text>
        <path d="M0 116 L240 116" stroke="#c92a2a" strokeWidth={2} />
        {[30, 90, 150, 210].map((x) => (
          <path key={x} d={`M${x} 116 A8 8 0 0 1 ${x + 16} 116 Z`} fill="#c92a2a" />
        ))}
      </>
    ),
  },
  okklusion: {
    label: 'Kaltfront holt Warmfront ein, die warme Luft wird vom Boden abgehoben',
    draw: () => (
      <>
        <path d="M60 110 L120 40 L180 110 Z" fill="var(--warn-3)" opacity={0.2} />
        <text x={102} y={62} {...T}>warm</text>
        <text x={14} y={100} {...T}>kalt</text>
        <text x={192} y={100} {...T}>kühl</text>
        <Cloud x={105} y={30} s={1.1} dark />
        <path d="M0 116 L240 116" stroke="#9c36b5" strokeWidth={2} />
        {[30, 110, 190].map((x) => (
          <g key={x} fill="#9c36b5">
            <path d={`M${x} 116 L${x + 8} 108 L${x + 16} 116 Z`} />
            <path d={`M${x + 24} 116 A8 8 0 0 1 ${x + 40} 116 Z`} />
          </g>
        ))}
      </>
    ),
  },
}

/** Zeichnet die Skizze zu einem Lexikon-Eintrag. */
export function LexikonSketch({ id }: { id: SketchId }) {
  const sketch = SKETCHES[id]
  return (
    <svg className="lex-sketch" viewBox="0 0 240 120" role="img" aria-label={sketch.label}>
      <title>{sketch.label}</title>
      {sketch.draw()}
    </svg>
  )
}
