/**
 * Wettersymbol aus den Modell-Mittelwerten (regelbasiert).
 *
 * Warum nicht einfach den Wettercode mitteln? Codes sind Kategorien (45 = Nebel, 61 = Regen …) –
 * „Mittelwert aus Nebel und Regen“ ergibt keinen Sinn. Darum bauen wir das Symbol aus messbaren
 * Größen (Regenmenge, Schnee, Bewölkung) und zählen nur, wie viele Modelle Gewitter/Nebel melden.
 */

export interface SymbolInput {
  /** Niederschlag in mm (Stunde bzw. Tagessumme) */
  precipitation: number | null
  /** Neuschnee in cm (Stunde bzw. Tagessumme) */
  snowfall: number | null
  /** Bewölkung in % */
  cloudCover: number | null
  /** Anteil der Modelle (0–1), die nennenswerten Niederschlag erwarten */
  precipShare: number
  /** Anteil der Modelle (0–1), die Gewitter melden (Code 95–99) */
  thunderShare: number
  /** Anteil der Modelle (0–1), die Nebel melden (Code 45/48) */
  fogShare: number
  /** Tag oder Nacht (nur für Stunden-Symbole) */
  isDay: boolean
}

export interface WeatherSymbol {
  icon: string
  label: string
}

/** Schwellen: Für einen ganzen Tag braucht es mehr Regen als für eine Stunde, damit es „Regen“ heißt. */
const THRESHOLDS = {
  day: { wet: 1, heavy: 10, snow: 1 },
  hour: { wet: 0.1, heavy: 2.5, snow: 0.2 },
}

export function weatherSymbol(input: SymbolInput, scale: 'day' | 'hour'): WeatherSymbol {
  const t = THRESHOLDS[scale]
  const precip = input.precipitation ?? 0
  const snow = input.snowfall ?? 0
  const cloud = input.cloudCover ?? 0

  if (input.thunderShare >= 0.3) return { icon: '⛈️', label: 'Gewitter' }

  // Nur wenn mindestens 30 % der Modelle Niederschlag erwarten, zeigen wir ein Regen-/Schneesymbol.
  // Sonst würde ein einzelnes „nasses“ Modell den Mittelwert hochziehen und einen trockenen Tag verregnen.
  const agreed = input.precipShare >= 0.3

  if (agreed && snow >= t.snow) {
    return precip >= t.heavy ? { icon: '❄️', label: 'Starker Schneefall' } : { icon: '🌨️', label: 'Schneefall' }
  }

  if (agreed && precip >= t.heavy) return { icon: '🌧️', label: 'Starkregen' }
  if (agreed && precip >= t.wet) {
    // Wenig Regen bei aufgelockerter Bewölkung = Schauer
    if (cloud < 70) return { icon: '🌦️', label: 'Regenschauer' }
    return { icon: '🌧️', label: precip >= t.wet * 4 ? 'Regen' : 'Leichter Regen' }
  }

  if (input.fogShare >= 0.4) return { icon: '🌫️', label: 'Nebel' }

  if (cloud < 20) return input.isDay ? { icon: '☀️', label: 'Sonnig' } : { icon: '🌙', label: 'Klar' }
  if (cloud < 45) return input.isDay ? { icon: '🌤️', label: 'Heiter' } : { icon: '🌙', label: 'Leicht bewölkt' }
  if (cloud < 75) return { icon: '⛅', label: 'Wolkig' }
  if (cloud < 90) return { icon: '🌥️', label: 'Stark bewölkt' }
  return { icon: '☁️', label: 'Bedeckt' }
}

export function isThunderCode(code: number): boolean {
  return code >= 95 && code <= 99
}

export function isFogCode(code: number): boolean {
  return code === 45 || code === 48
}
