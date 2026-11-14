// Lädt EINMALIG die Küstenlinien von Natural Earth (Maßstab 1:110 Mio., gemeinfrei, naturalearthdata.com),
// schneidet Europa heraus und speichert eine kleine Datei im Projekt.
// Aufruf: node scripts/make-europa-kueste.mjs   → schreibt src/data/europa-kueste.json
//
// Gebraucht für die Europa-Skizze der Großwetterlage (Etappe 18e). Die App selbst lädt nichts nach.
import { writeFileSync } from 'node:fs'

const QUELLE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'

// Ausschnitt der Skizze (wie das Europa-Raster) …
const VIEW = { west: -15, east: 35, south: 35, north: 65 }
// … und ein größerer Rahmen: Punkte außerhalb davon fallen weg (z. B. der Rest von Asien und Afrika).
const KEEP = { west: -30, east: 50, south: 26, north: 74 }

const response = await fetch(QUELLE_URL)
if (!response.ok) throw new Error(`Natural Earth antwortet mit HTTP ${response.status}`)
const land = await response.json()

const rings = []
for (const feature of land.features) {
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
  for (const polygon of polygons) {
    // nur der Außenring: Seen und Löcher braucht die Skizze nicht
    const ring = polygon[0]
    const inView = ring.some(([lon, lat]) => lon >= VIEW.west && lon <= VIEW.east && lat >= VIEW.south && lat <= VIEW.north)
    if (!inView) continue
    const kept = ring
      .filter(([lon, lat]) => lon >= KEEP.west && lon <= KEEP.east && lat >= KEEP.south && lat <= KEEP.north)
      .map(([lon, lat]) => [Math.round(lon * 100) / 100, Math.round(lat * 100) / 100])
      .filter((p, i, all) => i === 0 || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1])
    if (kept.length >= 3) rings.push(kept)
  }
}

const out = {
  quelle: 'Natural Earth (gemeinfrei), naturalearthdata.com',
  stand: `Land 1:110 Mio. (abgerufen ${new Date().toISOString().slice(0, 10)})`,
  // Ringe aus [Länge, Breite]
  rings,
}
writeFileSync(new URL('../src/data/europa-kueste.json', import.meta.url), JSON.stringify(out))
console.log(`${rings.length} Flächen, ${rings.reduce((n, r) => n + r.length, 0)} Punkte`)
