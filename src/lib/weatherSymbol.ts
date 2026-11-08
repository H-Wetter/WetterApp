/**
 * Wettersymbol aus den Modell-Mittelwerten (regelbasiert).
 *
 * Warum nicht einfach den Wettercode mitteln? Codes sind Kategorien (45 = Nebel, 61 = Regen …) –
 * „Mittelwert aus Nebel und Regen“ ergibt keinen Sinn. Darum bauen wir das Symbol aus messbaren
 * Größen (Regenmenge, Schnee, Bewölkung) und zählen nur, wie viele Modelle Gewitter/Nebel melden.
 */

export interface SymbolInput {
  /** Niederschlag in mm (Stunde bzw. Tagessumme) – enthält Regen UND Schnee (als Wasser) */
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
  /** Mondphase 0–1 (für Nachtsymbole), siehe moon.ts */
  moonPhase?: number
}

export type PrecipKind = 'rain' | 'snow' | 'sleet'
/** 1 = leicht, 2 = mittel, 3 = stark */
export type Intensity = 1 | 2 | 3

export interface WeatherSymbol {
  /** Emoji – für Symbole ohne eigene Grafik und als Textersatz */
  icon: string
  label: string
  /** Nur bei Niederschlag: Art und Stärke → eigene Grafik mit 1–3 Tropfen/Flocken */
  precip?: { kind: PrecipKind; intensity: Intensity }
  /** Nur nachts bei klarem/aufgelockertem Himmel: Mond in seiner Phase, ggf. mit Wolke */
  night?: { moonPhase: number; cloud: boolean }
}

/**
 * Laut Open-Meteo-Doku entsprechen 7 cm Schnee etwa 10 mm Wasser.
 * Damit rechnen wir aus, welcher Teil des Niederschlags als Schnee fällt.
 */
const MM_WATER_PER_CM_SNOW = 10 / 7

/**
 * Schwellen für Tag (Summe) und Stunde.
 * wet:  ab hier zählt es überhaupt als Niederschlag (mm)
 * rain: Grenzen leicht | mittel | stark in mm
 * snow: Grenzen leicht | mittel | stark in cm Neuschnee
 */
const THRESHOLDS = {
  day: { wet: 1, rain: [3, 20], snow: [2, 10] },
  hour: { wet: 0.1, rain: [0.5, 4], snow: [0.5, 2] },
} as const

function level(value: number, limits: readonly [number, number]): Intensity {
  if (value >= limits[1]) return 3
  if (value >= limits[0]) return 2
  return 1
}

const LABELS: Record<PrecipKind, Record<Intensity, string>> = {
  rain: { 1: 'Leichter Regen', 2: 'Regen', 3: 'Starkregen' },
  snow: { 1: 'Leichter Schneefall', 2: 'Schneefall', 3: 'Starker Schneefall' },
  sleet: { 1: 'Leichter Schneeregen', 2: 'Schneeregen', 3: 'Starker Schneeregen' },
}

const EMOJI: Record<PrecipKind, string> = { rain: '🌧️', snow: '🌨️', sleet: '🌨️' }

/**
 * Regen, Schnee oder Schneeregen? Wir rechnen den Schnee in Wasser um und schauen,
 * welcher Anteil des Niederschlags als Schnee fällt:
 *   über 50 % → Schnee, 20–50 % → Schneeregen, darunter → Regen
 */
export function precipKind(precipMm: number, snowCm: number): PrecipKind {
  if (precipMm <= 0) return snowCm > 0 ? 'snow' : 'rain'
  const snowShare = Math.min(1, (snowCm * MM_WATER_PER_CM_SNOW) / precipMm)
  if (snowShare > 0.5) return 'snow'
  if (snowShare >= 0.2) return 'sleet'
  return 'rain'
}

export function weatherSymbol(input: SymbolInput, scale: 'day' | 'hour'): WeatherSymbol {
  const t = THRESHOLDS[scale]
  const precip = input.precipitation ?? 0
  const snow = input.snowfall ?? 0
  const cloud = input.cloudCover ?? 0

  if (input.thunderShare >= 0.3) return { icon: '⛈️', label: 'Gewitter' }

  // Nur wenn mindestens 30 % der Modelle Niederschlag erwarten, zeigen wir ein Niederschlagssymbol.
  // Sonst würde ein einzelnes „nasses“ Modell den Mittelwert hochziehen und einen trockenen Tag verregnen.
  if (input.precipShare >= 0.3 && precip >= t.wet) {
    const kind = precipKind(precip, snow)
    // Stärke immer an der passenden Größe messen: Schnee in cm, Regen und Schneeregen in mm.
    const intensity = kind === 'snow' ? level(snow, t.snow) : level(precip, t.rain)
    return { icon: EMOJI[kind], label: LABELS[kind][intensity], precip: { kind, intensity } }
  }

  if (input.fogShare >= 0.4) return { icon: '🌫️', label: 'Nebel' }

  if (!input.isDay) {
    // Nachts: Mond (in der echten Phase) statt Sonne
    const moonPhase = input.moonPhase ?? 0.5
    if (cloud < 20) return { icon: '🌙', label: 'Klar', night: { moonPhase, cloud: false } }
    if (cloud < 45) return { icon: '🌙', label: 'Leicht bewölkt', night: { moonPhase, cloud: true } }
    if (cloud < 75) return { icon: '☁️', label: 'Wolkig', night: { moonPhase, cloud: true } }
    if (cloud < 90) return { icon: '☁️', label: 'Stark bewölkt' }
    return { icon: '☁️', label: 'Bedeckt' }
  }

  if (cloud < 20) return { icon: '☀️', label: 'Sonnig' }
  if (cloud < 45) return { icon: '🌤️', label: 'Heiter' }
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
