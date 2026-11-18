import type { Zugbahn } from '../lib/zugbahn'

interface Props {
  zug: Zugbahn | null
  kind: 'H' | 'T'
  /** Länge/Breite → Bildpunkte */
  project: (lon: number, lat: number) => [number, number] | null
  /** Strichstärke in SVG-Einheiten; die Pfeilspitze richtet sich danach */
  breite: number
}

/**
 * Pfeil entlang der Zugbahn eines Hochs oder Tiefs (nächste 24 Stunden), mit Spitze am Ende.
 * Liegt der Kern fast still oder gibt es keine Bahn, zeichnet er nichts.
 * Die Spitze ist ein eigenes Dreieck (kein SVG-<marker>), damit es keine doppelten ids gibt.
 */
export function ZugPfeil({ zug, kind, project, breite }: Props) {
  if (!zug || zug.ortsfest || zug.punkte.length < 2) return null
  // Bleibt der Kern zwischendurch auf demselben Rasterpunkt, doppelte Punkte weglassen
  // (sonst hätte das letzte Teilstück die Länge 0 und die Spitze keine Richtung)
  const pts = zug.punkte
    .map((p) => project(p.lon, p.lat))
    .filter((p): p is [number, number] => p !== null)
    .filter((p, i, all) => i === 0 || Math.hypot(p[0] - all[i - 1][0], p[1] - all[i - 1][1]) > 0.5)
  if (pts.length < 2) return null
  const [ex, ey] = pts[pts.length - 1]
  const [px, py] = pts[pts.length - 2]
  const len = Math.hypot(ex - px, ey - py)
  if (len === 0) return null
  // Einheitsvektor der letzten Teilstrecke und senkrecht dazu
  const ux = (ex - px) / len
  const uy = (ey - py) / len
  const s = breite * 3.2
  const spitze = `${ex},${ey} ${ex - ux * s * 1.6 + uy * s},${ey - uy * s * 1.6 - ux * s} ${ex - ux * s * 1.6 - uy * s},${ey - uy * s * 1.6 + ux * s}`
  // Linie endet am Fuß der Spitze, sonst schaut sie vorne heraus
  const linie = [...pts.slice(0, -1), [ex - ux * s * 1.2, ey - uy * s * 1.2]].map((p) => p.join(',')).join(' ')
  return (
    <g className={kind === 'T' ? 'zug-pfeil tief' : 'zug-pfeil hoch'} aria-hidden="true">
      <polyline points={linie} strokeWidth={breite} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={spitze} />
    </g>
  )
}
