// Lädt EINMALIG die Ländergrenzen von Natural Earth (Maßstab 1:50 Mio., gemeinfrei, naturalearthdata.com),
// schneidet Europa heraus, vereinfacht die Linien und speichert eine kleine Datei im Projekt.
// Aufruf: node scripts/make-europa-laender.mjs   → schreibt src/data/europa-laender.geo.json
//
// Gebraucht für die Europa-Karte (Reiter „Europa“) und die Skizze der Großwetterlage.
// Die App selbst lädt nichts nach.
//
// Natural Earth zeichnet Grenzen so, wie sie tatsächlich kontrolliert werden. Zwei Stellen passen wir an
// die Sicht Österreichs (und der EU) an:
//   - die Krim gehört zur Ukraine (in den Rohdaten ein eigenes Teilstück von Russland),
//   - Nordzypern gehört zur Republik Zypern.
import { writeFileSync } from 'node:fs'
import { geoArea } from 'd3-geo'

const QUELLE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'

/** Alles außerhalb dieses Rahmens wird abgeschnitten (etwas größer als der sichtbare Ausschnitt) */
const KEEP = { west: -26, east: 46, south: 29, north: 72 }
/** Vereinfachung: Punkte, die weniger als 0,03° (ca. 3 km) von der Linie abweichen, fallen weg */
const TOLERANZ = 0.03
/** Inseln und Splitter unter dieser Fläche (Quadratgrad) fallen weg */
const MIN_FLAECHE = 0.02

/** Liegt der Punkt in einem Ring? (Strahl-Methode) */
function inRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Schneidet einen Ring an einer Rahmenkante ab (Sutherland-Hodgman, eine Kante) */
function clipEdge(ring, inside, cut) {
  const out = []
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    if (inside(a)) {
      out.push(a)
      if (!inside(b)) out.push(cut(a, b))
    } else if (inside(b)) out.push(cut(a, b))
  }
  return out
}

/** Schneidet einen Ring am Rahmen KEEP ab */
function clipRing(ring) {
  const atLon = (lon) => (a, b) => [lon, a[1] + ((b[1] - a[1]) * (lon - a[0])) / (b[0] - a[0])]
  const atLat = (lat) => (a, b) => [a[0] + ((b[0] - a[0]) * (lat - a[1])) / (b[1] - a[1]), lat]
  let r = ring.slice(0, -1) // ohne den doppelten Endpunkt
  r = clipEdge(r, (p) => p[0] >= KEEP.west, atLon(KEEP.west))
  r = clipEdge(r, (p) => p[0] <= KEEP.east, atLon(KEEP.east))
  r = clipEdge(r, (p) => p[1] >= KEEP.south, atLat(KEEP.south))
  r = clipEdge(r, (p) => p[1] <= KEEP.north, atLat(KEEP.north))
  return r
}

/** Douglas-Peucker: Linie vereinfachen */
function simplify(points, tol) {
  if (points.length < 3) return points
  const [x1, y1] = points[0]
  const [x2, y2] = points[points.length - 1]
  let maxD = 0
  let idx = 0
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i]
    const len = Math.hypot(x2 - x1, y2 - y1)
    const d = len === 0 ? Math.hypot(x - x1, y - y1) : Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / len
    if (d > maxD) {
      maxD = d
      idx = i
    }
  }
  if (maxD <= tol) return [points[0], points[points.length - 1]]
  return [...simplify(points.slice(0, idx + 1), tol).slice(0, -1), ...simplify(points.slice(idx), tol)]
}

/** Fläche eines Rings in Quadratgrad (Betrag) */
function area(ring) {
  let s = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1])
  return Math.abs(s / 2)
}

/** Ring zuschneiden, vereinfachen, runden, schließen. null = fällt weg */
function prepareRing(ring) {
  const clipped = clipRing(ring)
  if (clipped.length < 3) return null
  // Ring an der Stelle teilen: Anfang und Ende vereinfachen getrennt, damit der Ring zu bleibt
  const half = Math.floor(clipped.length / 2)
  const simple = [...simplify(clipped.slice(0, half + 1), TOLERANZ).slice(0, -1), ...simplify([...clipped.slice(half), clipped[0]], TOLERANZ)]
  const rounded = simple
    .map(([lon, lat]) => [Math.round(lon * 100) / 100, Math.round(lat * 100) / 100])
    .filter((p, i, all) => i === 0 || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1])
  if (rounded.length < 4 || area(rounded) < MIN_FLAECHE) return null
  const first = rounded[0]
  const last = rounded[rounded.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) rounded.push([...first])
  return rounded
}

/** d3-geo erwartet die Außenringe im Uhrzeigersinn. Ist die Fläche „größer als die halbe Erde“, umdrehen. */
function fixOrientation(polygon) {
  const feature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: polygon } }
  return geoArea(feature) > 2 * Math.PI ? polygon.map((ring) => [...ring].reverse()) : polygon
}

const response = await fetch(QUELLE_URL)
if (!response.ok) throw new Error(`Natural Earth antwortet mit HTTP ${response.status}`)
const raw = await response.json()

/** Polygone je Land (Kürzel → { name, polygons }) */
const laender = new Map()
const add = (id, name, polygon) => {
  if (!laender.has(id)) laender.set(id, { name, polygons: [] })
  laender.get(id).polygons.push(polygon)
}

const KRIM = [34.1, 45.0]
for (const f of raw.features) {
  const p = f.properties
  let id = p.ADM0_A3
  let name = p.NAME_DE
  if (id === 'CYN') {
    // Nordzypern → Zypern
    id = 'CYP'
    name = 'Zypern'
  }
  const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  for (const polygon of polygons) {
    if (id === 'RUS' && inRing(KRIM, polygon[0])) {
      add('UKR', 'Ukraine', polygon)
      continue
    }
    add(id, name, polygon)
  }
}

const features = []
for (const [id, { name, polygons }] of laender) {
  const kept = []
  for (const polygon of polygons) {
    const outer = prepareRing(polygon[0])
    if (!outer) continue
    const holes = polygon.slice(1).map(prepareRing).filter(Boolean)
    kept.push(fixOrientation([outer, ...holes]))
  }
  if (kept.length === 0) continue
  features.push({
    type: 'Feature',
    properties: { id, name },
    geometry: kept.length === 1 ? { type: 'Polygon', coordinates: kept[0] } : { type: 'MultiPolygon', coordinates: kept },
  })
}
features.sort((a, b) => a.properties.name.localeCompare(b.properties.name, 'de'))

const out = {
  type: 'FeatureCollection',
  quelle: 'Natural Earth (gemeinfrei), naturalearthdata.com',
  stand: `Länder 1:50 Mio. (abgerufen ${new Date().toISOString().slice(0, 10)}); Krim zur Ukraine, Nordzypern zu Zypern`,
  features,
}
writeFileSync(new URL('../src/data/europa-laender.geo.json', import.meta.url), JSON.stringify(out))
const punkte = features.reduce((n, f) => n + JSON.stringify(f.geometry.coordinates).split('],[').length, 0)
console.log(`${features.length} Länder, ca. ${punkte} Punkte`)
