// Lädt die Bundesländer-Grenzen EINMALIG vom offiziellen Kartendienst von GeoSphere Austria
// („Administrative Grenzen von Österreich, Stand 2025“, ©Statistik Austria, GeoSphere Austria, CC BY 4.0),
// ordnet die Namen zu und speichert eine vereinfachte Datei im Projekt.
// Aufruf: node scripts/make-austria-map.mjs   → schreibt src/data/bundeslaender.geo.json
//
// Der Dienst liefert 12 Flächen ohne Namen: die 9 Länder, dazu Osttirol und Jungholz (beide Tirol)
// und ein winziges Splitterstück. Die Namen finden wir über bekannte Orte, die in der Fläche liegen.
import { writeFileSync } from 'node:fs'
import { geoArea } from 'd3-geo'

const URL =
  'https://gis.geosphere.at/maps/rest/services/grenzen/admin_grenzen_oesterreich/MapServer/0/query' +
  '?where=1%3D1&returnGeometry=true&outSR=4326&geometryPrecision=3&f=geojson' +
  // Vereinfachung: Punkte, die weniger als ca. 500 m von der Linie abweichen, fallen weg
  '&maxAllowableOffset=0.005'

// Bekannte Orte je Land (Länge, Breite). Die Landeshauptstadt steht immer zuerst.
const LAENDER = [
  { id: 'W', name: 'Wien', hauptstadt: 'Wien', orte: [[16.373, 48.208]] },
  { id: 'N', name: 'Niederösterreich', hauptstadt: 'St. Pölten', orte: [[15.626, 48.204]] },
  { id: 'O', name: 'Oberösterreich', hauptstadt: 'Linz', orte: [[14.286, 48.306]] },
  { id: 'S', name: 'Salzburg', hauptstadt: 'Salzburg', orte: [[13.044, 47.8]] },
  { id: 'T', name: 'Tirol', hauptstadt: 'Innsbruck', orte: [[11.394, 47.269], [12.77, 46.83], [10.45, 47.58]] }, // Innsbruck, Lienz, Jungholz
  { id: 'V', name: 'Vorarlberg', hauptstadt: 'Bregenz', orte: [[9.747, 47.503]] },
  { id: 'St', name: 'Steiermark', hauptstadt: 'Graz', orte: [[15.439, 47.071]] },
  { id: 'K', name: 'Kärnten', hauptstadt: 'Klagenfurt', orte: [[14.305, 46.624]] },
  { id: 'B', name: 'Burgenland', hauptstadt: 'Eisenstadt', orte: [[16.525, 47.846]] },
]

/** Liegt der Punkt in einem Ring? (Strahl-Methode, für kleine Gebiete genau genug) */
function inRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Liegt der Punkt in der Fläche? Außenring ja, aber in keinem Loch (Wien ist ein Loch in Niederösterreich). */
function inPolygon(p, polygon) {
  return inRing(p, polygon[0]) && !polygon.slice(1).some((hole) => inRing(p, hole))
}

/** Polygone einer Fläche als Liste */
function polygons(geometry) {
  return geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates]
}

/** d3-geo erwartet die Außenringe im Uhrzeigersinn. Ist die Fläche „größer als die halbe Erde“, umdrehen. */
function fixOrientation(polygon) {
  const feature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: polygon } }
  return geoArea(feature) > 2 * Math.PI ? polygon.map((ring) => [...ring].reverse()) : polygon
}

const response = await fetch(URL)
if (!response.ok) throw new Error(`Kartendienst antwortet mit HTTP ${response.status}`)
const raw = await response.json()
console.log(`${raw.features.length} Flächen geladen`)

const byLand = new Map(LAENDER.map((l) => [l.id, []]))
let skipped = 0
for (const f of raw.features) {
  for (const polygon of polygons(f.geometry)) {
    const land = LAENDER.find((l) => l.orte.some((p) => inPolygon(p, polygon)))
    if (land) byLand.get(land.id).push(fixOrientation(polygon))
    else skipped++
  }
}

const features = LAENDER.map((l) => {
  const polys = byLand.get(l.id)
  if (polys.length === 0) throw new Error(`Keine Fläche für ${l.name} gefunden`)
  return {
    type: 'Feature',
    properties: { id: l.id, name: l.name, hauptstadt: l.hauptstadt },
    geometry: polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys },
  }
})

const out = {
  type: 'FeatureCollection',
  // Pflicht-Quellenangabe (CC BY 4.0) – wird auch in der App angezeigt
  quelle: '©Statistik Austria, GeoSphere Austria / CC BY 4.0',
  stand: 'Administrative Grenzen von Österreich, Stand 2025 (abgerufen ' + new Date().toISOString().slice(0, 10) + ')',
  features,
}
writeFileSync('src/data/bundeslaender.geo.json', JSON.stringify(out))
console.log(`9 Länder gespeichert (${skipped} Splitterstück(e) ohne bekannten Ort verworfen):`)
for (const f of features) console.log(`  ${f.properties.name}: ${polygons(f.geometry).length} Fläche(n)`)
