// Alle Zeiten sind „Ortszeit als UTC gelesen“ (siehe MultiModelForecast.times).
// Darum hier immer die getUTC…-Funktionen verwenden.

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

/** z. B. „Mo 9.11.“ */
export function formatDay(ms: number): string {
  const d = new Date(ms)
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}.${d.getUTCMonth() + 1}.`
}

/** z. B. „Mo 9.11., 14:00“ */
export function formatDayHour(ms: number): string {
  const d = new Date(ms)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  return `${formatDay(ms)}, ${hh}:00`
}

/** Zeitpunkte alle `step` Stunden (für die x-Achse der Stundenansicht). */
export function hourTicks(times: number[], step: number): number[] {
  return times.filter((t) => new Date(t).getUTCHours() % step === 0)
}

/** Mitternachts-Zeitpunkte aus einer Stundenliste (für die Tagesstriche an der x-Achse). */
export function dayStarts(times: number[]): number[] {
  return times.filter((t) => new Date(t).getUTCHours() === 0)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** „Heute“, „Morgen“ oder der Wochentag (z. B. „Mittwoch“). */
export function relativeDayName(dayStart: number, now: number): string {
  const diff = Math.round((dayStart - Math.floor(now / DAY_MS) * DAY_MS) / DAY_MS)
  if (diff === 0) return 'Heute'
  if (diff === 1) return 'Morgen'
  const names = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
  return names[new Date(dayStart).getUTCDay()]
}

/** z. B. „9.11.“ */
export function formatDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`
}

/** z. B. „14:00“ */
export function formatHour(ms: number): string {
  return `${String(new Date(ms).getUTCHours()).padStart(2, '0')}:00`
}

/** Aktuelle Ortszeit des Standorts im selben Format. */
export function localNow(utcOffsetSeconds: number): number {
  return Date.now() + utcOffsetSeconds * 1000
}
