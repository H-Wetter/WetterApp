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

/** Mitternachts-Zeitpunkte aus einer Stundenliste (für die Tagesstriche an der x-Achse). */
export function dayStarts(times: number[]): number[] {
  return times.filter((t) => new Date(t).getUTCHours() === 0)
}

/** Aktuelle Ortszeit des Standorts im selben Format. */
export function localNow(utcOffsetSeconds: number): number {
  return Date.now() + utcOffsetSeconds * 1000
}
