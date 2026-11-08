import type { WeatherLocation } from '../types/location'

/**
 * Fragt den Browser nach dem aktuellen Standort.
 * Der Browser zeigt dabei selbst eine Erlaubnis-Abfrage an.
 * Bei Ablehnung, Zeitüberschreitung oder fehlender Unterstützung wird ein Fehler mit
 * verständlicher deutscher Meldung geworfen.
 */
export function getBrowserLocation(timeoutMs = 10000): Promise<WeatherLocation> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Dein Browser unterstützt keine Standortabfrage.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          name: 'Mein Standort',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          // GPS-Höhe ist oft ungenau oder fehlt – dann lassen wir sie weg.
          elevation: position.coords.altitude ?? undefined,
          source: 'gps',
        })
      },
      (error) => {
        const messages: Record<number, string> = {
          [error.PERMISSION_DENIED]: 'Standortzugriff wurde nicht erlaubt.',
          [error.POSITION_UNAVAILABLE]: 'Standort konnte nicht ermittelt werden.',
          [error.TIMEOUT]: 'Standortabfrage hat zu lange gedauert.',
        }
        reject(new Error(messages[error.code] ?? 'Unbekannter Fehler bei der Standortabfrage.'))
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 10 * 60 * 1000 },
    )
  })
}
