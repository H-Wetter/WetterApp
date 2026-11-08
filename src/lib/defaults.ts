import type { WeatherLocation } from '../types/location'

/** Standard-Standort, wenn der Browser keinen Standort liefert. */
export const DEFAULT_LOCATION: WeatherLocation = {
  name: 'Graz',
  latitude: 47.07,
  longitude: 15.44,
  elevation: 350,
  country: 'Österreich',
  region: 'Steiermark',
  source: 'default',
}

/** Koordinaten hübsch formatieren, z. B. „47.07° N, 15.44° O“. */
export function formatCoordinates(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'O' : 'W'
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`
}
