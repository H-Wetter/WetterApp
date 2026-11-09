/**
 * Link zur öffentlichen Live-Blitzkarte von Blitzortung.org, auf den Ort zentriert.
 * Warum nur ein Link? Blitzortung.org bietet keine offene Schnittstelle für fremde Apps;
 * Rohdaten gibt es nur für Betreiber einer Messstation oder nach Freigabe durch das Projekt
 * (geprüft am 09.11.2026). Auf die öffentliche Karte zu verlinken ist erlaubt.
 * Adressformat: #Zoomstufe/Breite/Länge
 */
export function blitzortungMapUrl(lat: number, lon: number, zoom = 8): string {
  return `https://map.blitzortung.org/#${zoom}/${lat.toFixed(2)}/${lon.toFixed(2)}`
}
