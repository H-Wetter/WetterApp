// Zeichnet die App-Symbole (PNG) für „App aufs Handy“ – ohne zusätzliche Pakete.
// Aufruf: npm run icons   → schreibt public/icon-512.png, icon-192.png, apple-touch-icon.png
// Die Formen entsprechen genau public/icon.svg (bei Änderungen beide Dateien anpassen).
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BLUE = [0x2f, 0x6f, 0xdd]
const SUN = [0xff, 0xd4, 0x3b]
const WHITE = [0xff, 0xff, 0xff]

// Formen im 512er-Raster (wie in icon.svg), Reihenfolge = Zeichenreihenfolge
const shapes = [
  ...[
    [310, 92, 310, 66],
    [418, 200, 444, 200],
    [386, 124, 404, 106],
    [234, 124, 216, 106],
    [386, 276, 404, 294],
  ].map(([x1, y1, x2, y2]) => ({ color: SUN, inside: (x, y) => distToSegment(x, y, x1, y1, x2, y2) <= 10 })),
  { color: SUN, inside: (x, y) => Math.hypot(x - 310, y - 200) <= 76 },
  {
    color: WHITE,
    inside: (x, y) =>
      Math.hypot(x - 200, y - 330) <= 56 ||
      Math.hypot(x - 270, y - 282) <= 78 ||
      Math.hypot(x - 360, y - 320) <= 66 ||
      (x >= 200 && x <= 360 && y >= 320 && y <= 386),
  },
]

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

/** Farbe an einem Punkt (512er-Raster): die zuletzt gezeichnete Form, die ihn enthält */
function colorAt(x, y) {
  let c = BLUE
  for (const s of shapes) if (s.inside(x, y)) c = s.color
  return c
}

/** Bild mit Kantenglättung: 4 × 4 Abtastpunkte je Pixel */
function render(size) {
  const S = 4
  const scale = 512 / size
  const rows = []
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3) // erstes Byte: PNG-Filter „keiner“
    for (let px = 0; px < size; px++) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const c = colorAt((px + (sx + 0.5) / S) * scale, (py + (sy + 0.5) / S) * scale)
          r += c[0]
          g += c[1]
          b += c[2]
        }
      }
      const n = S * S
      row[1 + px * 3] = Math.round(r / n)
      row[2 + px * 3] = Math.round(g / n)
      row[3 + px * 3] = Math.round(b / n)
    }
    rows.push(row)
  }
  return png(size, Buffer.concat(rows))
}

// ---------- PNG-Datei zusammensetzen ----------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, raw) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // 8 Bit je Farbe
  header[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const [file, size] of [
  ['public/icon-512.png', 512],
  ['public/icon-192.png', 192],
  ['public/apple-touch-icon.png', 180],
]) {
  writeFileSync(file, render(size))
  console.log(`${file} (${size} × ${size}) geschrieben`)
}
