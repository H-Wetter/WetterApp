// „App aufs Handy“: ergänzt nach dem Verschlüsseln (npm run encrypt) die Passwort-Seite von StatiCrypt
// um Manifest, App-Symbol und Farbe – und kopiert die Symbol-Dateien mit in den Ordner dist-encrypted.
// Warum hier und nicht in index.html? Die Handys lesen diese Angaben von der Seite, die zuerst
// geladen wird – und das ist die Passwort-Seite. Die eigentliche App ist bis zur Eingabe verschlüsselt.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'

const OUT = 'dist-encrypted'
const FILES = ['manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']

// Diese Zeilen kommen in den <head> – dieselben wie in index.html
export const PWA_HEAD = [
  '<link rel="manifest" href="manifest.webmanifest" />',
  '<link rel="apple-touch-icon" href="apple-touch-icon.png" />',
  '<meta name="theme-color" content="#2f6fdd" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-title" content="Wetter" />',
].join('\n        ')

const page = `${OUT}/index.html`
const html = readFileSync(page, 'utf8')
if (html.includes('rel="manifest"')) {
  console.log('Passwort-Seite hat das Manifest schon.')
} else {
  // nur das ERSTE </head> ersetzen – das ist das der Passwort-Seite
  writeFileSync(page, html.replace('</head>', `    ${PWA_HEAD}\n    </head>`))
  console.log('Manifest und App-Symbol in die Passwort-Seite eingetragen.')
}
for (const f of FILES) copyFileSync(`dist/${f}`, `${OUT}/${f}`)
console.log(`${FILES.length} Dateien nach ${OUT}/ kopiert.`)
