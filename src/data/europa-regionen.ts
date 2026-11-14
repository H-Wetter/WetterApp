/**
 * Gebiete in Europa mit einem Mittelpunkt, damit die App die Lage eines Hochs oder Tiefs
 * in Worten sagen kann („Tief über der Biskaya“). Genommen wird das Gebiet, dessen Mittelpunkt
 * dem Kern am nächsten liegt (siehe src/lib/druckgebilde.ts).
 *
 * Ergänzen: einfach eine Zeile dazuschreiben. `lage` ist der fertige Satzteil samt Vorwort
 * („über …“, „bei …“), `lat`/`lon` sind Breite und Länge in Grad (West = negativ).
 */
export interface EuropaRegion {
  lage: string
  lat: number
  lon: number
}

export const EUROPA_REGIONEN: EuropaRegion[] = [
  // Atlantik und Nordwesten
  { lage: 'bei Island', lat: 65, lon: -17 },
  { lage: 'bei den Färöern', lat: 62, lon: -7 },
  { lage: 'bei den Shetlandinseln', lat: 60.5, lon: -1 },
  { lage: 'über dem Atlantik nordwestlich von Schottland', lat: 59.5, lon: -12 },
  { lage: 'über dem Atlantik westlich von Irland', lat: 54, lon: -14 },
  { lage: 'über dem Atlantik westlich der Biskaya', lat: 46.5, lon: -13 },
  { lage: 'über dem Atlantik westlich von Portugal', lat: 39, lon: -13.5 },
  { lage: 'über Irland', lat: 53, lon: -8 },
  { lage: 'über Schottland', lat: 57, lon: -4 },
  { lage: 'über England', lat: 52.5, lon: -1.5 },
  { lage: 'über dem Ärmelkanal', lat: 50, lon: -1.5 },
  { lage: 'über der Biskaya', lat: 45.5, lon: -4.5 },
  // Südwesten
  { lage: 'über Portugal', lat: 39.5, lon: -8 },
  { lage: 'über Spanien', lat: 40.5, lon: -3.5 },
  { lage: 'über Südspanien', lat: 37.3, lon: -4.5 },
  { lage: 'bei Gibraltar', lat: 35.5, lon: -5.5 },
  { lage: 'über den Balearen', lat: 39.5, lon: 3 },
  { lage: 'vor der Küste Algeriens', lat: 36.5, lon: 4 },
  { lage: 'über Tunesien', lat: 35.5, lon: 9.5 },
  // Westen und Mitte
  { lage: 'über Frankreich', lat: 47.5, lon: 2.5 },
  { lage: 'über Südfrankreich', lat: 44, lon: 3 },
  { lage: 'über den Benelux-Ländern', lat: 51.3, lon: 5 },
  { lage: 'über Norddeutschland', lat: 53, lon: 10 },
  { lage: 'über Süddeutschland', lat: 48.8, lon: 10.5 },
  { lage: 'über der Schweiz', lat: 46.8, lon: 8 },
  { lage: 'über den Alpen', lat: 46.8, lon: 11 },
  { lage: 'über Österreich', lat: 47.6, lon: 14.5 },
  { lage: 'über Tschechien', lat: 49.8, lon: 15.5 },
  { lage: 'über der Slowakei', lat: 48.7, lon: 19.5 },
  { lage: 'über Ungarn', lat: 47, lon: 19.5 },
  { lage: 'über Polen', lat: 52, lon: 19.5 },
  // Italien und Mittelmeer
  { lage: 'über dem Golf von Genua', lat: 43.7, lon: 9 },
  { lage: 'über Oberitalien', lat: 45.3, lon: 10.5 },
  { lage: 'über Korsika und Sardinien', lat: 41, lon: 9 },
  { lage: 'über Mittelitalien', lat: 42.5, lon: 12.5 },
  { lage: 'über dem Tyrrhenischen Meer', lat: 40, lon: 12.5 },
  { lage: 'über Süditalien', lat: 40, lon: 16 },
  { lage: 'über Sizilien', lat: 37.5, lon: 14 },
  { lage: 'bei Malta', lat: 35.7, lon: 14.5 },
  { lage: 'über der Adria', lat: 43.5, lon: 15 },
  { lage: 'über Slowenien und Kroatien', lat: 45.7, lon: 15.5 },
  { lage: 'über dem Ionischen Meer', lat: 37.5, lon: 19 },
  // Südosten
  { lage: 'über dem Balkan', lat: 43.5, lon: 20.5 },
  { lage: 'über Griechenland', lat: 39.3, lon: 22 },
  { lage: 'über der Ägäis', lat: 38, lon: 25.5 },
  { lage: 'bei Kreta', lat: 35.3, lon: 25 },
  { lage: 'über Bulgarien', lat: 42.7, lon: 25.5 },
  { lage: 'über Rumänien', lat: 46, lon: 25 },
  { lage: 'über der Türkei', lat: 39, lon: 32 },
  { lage: 'bei Zypern', lat: 35, lon: 33 },
  { lage: 'über dem Schwarzen Meer', lat: 43.5, lon: 33 },
  // Osten
  { lage: 'über der Ukraine', lat: 49.5, lon: 31 },
  { lage: 'über Weißrussland', lat: 53.5, lon: 28 },
  { lage: 'über Westrussland', lat: 55.5, lon: 34 },
  { lage: 'über Nordwestrussland', lat: 60.5, lon: 32 },
  { lage: 'über dem Baltikum', lat: 57, lon: 24.5 },
  // Norden
  { lage: 'über der Nordsee', lat: 56, lon: 3.5 },
  { lage: 'über Dänemark', lat: 56, lon: 10 },
  { lage: 'über der Ostsee', lat: 56.5, lon: 18.5 },
  { lage: 'über Südnorwegen', lat: 60.5, lon: 8 },
  { lage: 'über Südschweden', lat: 58.5, lon: 14.5 },
  { lage: 'über Mittelskandinavien', lat: 63, lon: 14 },
  { lage: 'über Nordskandinavien', lat: 65, lon: 20 },
  { lage: 'über Finnland', lat: 62.5, lon: 26.5 },
  { lage: 'über Karelien', lat: 64.5, lon: 31.5 },
  { lage: 'über dem Europäischen Nordmeer', lat: 64.5, lon: 2 },
]
