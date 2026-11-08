/**
 * Mondphase – einfache astronomische Näherung.
 *
 * Idee: Von einem bekannten Neumond aus (6. Jänner 2000, 18:14 UTC) wiederholt sich der Mondzyklus
 * alle 29,530588 Tage („synodischer Monat“). Der Rest der Division sagt, wo im Zyklus wir sind.
 * Genauigkeit: etwa ±1 Tag – für die Anzeige völlig ausreichend.
 */

const SYNODIC_MONTH_DAYS = 29.530588853
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14)
const DAY_MS = 24 * 60 * 60 * 1000

export interface MoonInfo {
  /** 0 = Neumond, 0,25 = erstes Viertel, 0,5 = Vollmond, 0,75 = letztes Viertel */
  phase: number
  /** beleuchteter Anteil der Mondscheibe 0–1 */
  illumination: number
  name: string
  emoji: string
}

/** Mondphase für einen Zeitpunkt (ms). Die paar Stunden Zeitzonen-Unterschied spielen keine Rolle. */
export function moonInfo(ms: number): MoonInfo {
  const days = (ms - KNOWN_NEW_MOON_MS) / DAY_MS
  const phase = (((days / SYNODIC_MONTH_DAYS) % 1) + 1) % 1
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2

  // Acht Abschnitte; die Hauptphasen (Neu-, Voll-, Viertelmond) bekommen je ±1,8 Tage Spielraum.
  const p = phase * SYNODIC_MONTH_DAYS
  const near = (target: number) => Math.abs(p - target) <= 1.85 || Math.abs(p - target - SYNODIC_MONTH_DAYS) <= 1.85
  const q = SYNODIC_MONTH_DAYS / 4

  let name: string
  let emoji: string
  if (near(0)) [name, emoji] = ['Neumond', '🌑']
  else if (near(q)) [name, emoji] = ['Erstes Viertel', '🌓']
  else if (near(2 * q)) [name, emoji] = ['Vollmond', '🌕']
  else if (near(3 * q)) [name, emoji] = ['Letztes Viertel', '🌗']
  else if (p < q) [name, emoji] = ['Zunehmende Sichel', '🌒']
  else if (p < 2 * q) [name, emoji] = ['Zunehmender Mond', '🌔']
  else if (p < 3 * q) [name, emoji] = ['Abnehmender Mond', '🌖']
  else [name, emoji] = ['Abnehmende Sichel', '🌘']

  return { phase, illumination, name, emoji }
}
