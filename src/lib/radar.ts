/**
 * Legende zum Radar (Farbschema „Universal Blue“ von RainViewer, offizielle Farbtabelle).
 * Die Regenmenge ist aus der Radar-Reflektivität (dBZ) grob geschätzt (Marshall-Palmer: Z = 200 · R^1,6).
 */
export interface RadarLegendStep {
  dbz: number
  color: string
  label: string
}

export const RADAR_LEGEND: RadarLegendStep[] = [
  { dbz: 15, color: '#88ddee', label: 'Niesel' },
  { dbz: 20, color: '#00a3e0', label: 'leicht' },
  { dbz: 30, color: '#005588', label: 'mäßig' },
  { dbz: 35, color: '#ffee00', label: 'kräftig' },
  { dbz: 40, color: '#ffaa00', label: 'stark' },
  { dbz: 45, color: '#ff4400', label: 'Starkregen' },
  { dbz: 50, color: '#c10000', label: 'Gewitter' },
  { dbz: 55, color: '#ffaaff', label: 'Hagel mögl.' },
]

/** Ungefähre Regenrate in mm/h aus dBZ */
export function dbzToRainRate(dbz: number): number {
  return Math.pow(Math.pow(10, dbz / 10) / 200, 1 / 1.6)
}

/** z. B. „0,6 mm/h“ */
export function formatRainRate(mmPerHour: number): string {
  return `${mmPerHour < 10 ? mmPerHour.toFixed(1).replace('.', ',') : Math.round(mmPerHour)} mm/h`
}

/** „14:20 Uhr“ in der Zeitzone des Browsers */
export function formatClock(ms: number): string {
  return `${new Date(ms).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })} Uhr`
}

/** „vor 20 Min.“ */
export function formatAgo(ms: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - ms) / 60000))
  if (minutes < 60) return `vor ${minutes} Min.`
  return `vor ${Math.floor(minutes / 60)} Std. ${minutes % 60} Min.`
}
