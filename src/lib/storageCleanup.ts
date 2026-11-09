/**
 * Räumt Browser-Speicher von Funktionen auf, die es nicht mehr gibt.
 * Am 09.11.2026 entfernt: Seite „Großwetterlage“ (Kartenraster, einige 100 KB) und das eigene
 * RainViewer-Radar (Liste geladener Kartenbilder). Schadet nichts, wenn die Einträge fehlen.
 */
const OLD_KEYS = ['wetter-app.synoptic.v1', 'wetter-app.radar-tiles.v1']

export function removeOldStorage() {
  for (const key of OLD_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Speicher gesperrt – dann gibt es auch nichts aufzuräumen
    }
  }
}
