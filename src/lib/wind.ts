/**
 * Windrichtung – richtig mitteln.
 *
 * Richtungen kann man nicht einfach addieren und teilen: Aus 350° und 10° (beides fast Nord)
 * käme 180° (Süd) heraus. Darum machen wir aus jeder Richtung einen Pfeil (Vektor), dessen Länge
 * der Windstärke entspricht, zählen alle Pfeile zusammen und lesen die Richtung des Ergebnisses ab.
 *
 * Die Windrichtung gibt an, WOHER der Wind kommt (0° = aus Nord, 90° = aus Ost).
 */

export interface WindDirection {
  /** mittlere Richtung in Grad (woher der Wind kommt), `null` = kein brauchbarer Wert */
  degrees: number | null
  /** Himmelsrichtung, z. B. „SW“ – oder „wechselnd“ / „still“ */
  name: string
  /**
   * Wie einig sind sich die Werte? 0 = völlig durcheinander, 1 = alle gleiche Richtung.
   * (Länge des Summenpfeils geteilt durch die Summe der Einzellängen.)
   */
  steadiness: number
}

const NAMES = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW']

/** Unter dieser mittleren Windstärke (km/h) ist die Richtung bedeutungslos. */
const CALM_KMH = 3
/** Unter dieser Einigkeit gilt die Richtung als „wechselnd“. */
const MIN_STEADINESS = 0.4

/** 225 → „SW“ */
export function compassName(degrees: number): string {
  return NAMES[Math.round((((degrees % 360) + 360) % 360) / 45) % 8]
}

/**
 * Mittlere Windrichtung aus Paaren (Richtung, Stärke).
 * Starker Wind zählt mehr als schwacher – genau so, wie man den Wind auch spürt.
 */
export function meanWindDirection(pairs: { direction: number | null; speed: number | null }[]): WindDirection {
  let x = 0
  let y = 0
  let total = 0
  let count = 0
  for (const { direction, speed } of pairs) {
    if (direction === null || speed === null) continue
    const rad = (direction * Math.PI) / 180
    x += Math.sin(rad) * speed
    y += Math.cos(rad) * speed
    total += speed
    count++
  }

  if (count === 0) return { degrees: null, name: '–', steadiness: 0 }
  if (total / count < CALM_KMH) return { degrees: null, name: 'still', steadiness: 0 }

  const steadiness = Math.hypot(x, y) / total
  const degrees = ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360
  if (steadiness < MIN_STEADINESS) return { degrees, name: 'wechselnd', steadiness }
  return { degrees, name: compassName(degrees), steadiness }
}
