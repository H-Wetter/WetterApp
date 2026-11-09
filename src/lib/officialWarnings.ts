import type { OfficialWarning, OfficialWarningLevel, OfficialWarningType } from '../types/officialWarning'

/** Namen und Symbole der Warnarten (Nummern laut GeoSphere Austria) */
export const WARNING_TYPES: Record<OfficialWarningType, { label: string; icon: string }> = {
  1: { label: 'Sturm', icon: '💨' },
  2: { label: 'Regen', icon: '🌧️' },
  3: { label: 'Schnee', icon: '❄️' },
  4: { label: 'Glatteis', icon: '🧊' },
  5: { label: 'Gewitter', icon: '⛈️' },
  6: { label: 'Hitze', icon: '🌡️' },
  7: { label: 'Kälte', icon: '🥶' },
}

/** Stufe als Eigenschaftswort für „… Warnung“ (orange bleibt unverändert: „Orange Warnung“) */
export const WARNING_LEVELS: Record<OfficialWarningLevel, string> = { 1: 'Gelbe', 2: 'Orange', 3: 'Rote' }

/**
 * Nur Warnungen, die noch nicht vorbei sind, nach Beginn sortiert.
 * Bei gleichem Beginn kommt die höhere Stufe zuerst.
 */
export function currentWarnings(warnings: OfficialWarning[], now: number): OfficialWarning[] {
  return warnings
    .filter((w) => w.end === null || w.end > now)
    .sort((a, b) => (a.start ?? 0) - (b.start ?? 0) || b.level - a.level)
}

/** Gilt die Warnung gerade jetzt? */
export function isActive(w: OfficialWarning, now: number): boolean {
  return (w.start === null || w.start <= now) && (w.end === null || w.end > now)
}

/** Aufzählung „* Punkt 1\n* Punkt 2“ → ['Punkt 1', 'Punkt 2'] */
export function bulletList(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*[*•-]\s*/, '').trim())
    .filter((l) => l !== '')
}

/** Zeitraum in Österreich-Zeit, z. B. „Mo 27.3., 08:00 – 18:00“ oder über Mitternacht mit beiden Tagen */
export function warningPeriod(w: OfficialWarning): string {
  if (w.start === null || w.end === null) return ''
  const day = (ms: number) =>
    new Date(ms).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'Europe/Vienna' })
  const time = (ms: number) => new Date(ms).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' })
  return day(w.start) === day(w.end)
    ? `${day(w.start)}, ${time(w.start)} – ${time(w.end)} Uhr`
    : `${day(w.start)}, ${time(w.start)} Uhr – ${day(w.end)}, ${time(w.end)} Uhr`
}
