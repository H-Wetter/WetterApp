import type { AirQualityData, AqVariable, PollenType } from '../types/airQuality'

/**
 * Bewertung von Luftqualität, UV, Saharastaub und Pollen.
 *
 * Stufen 1–6 (für Farben): 1 = sehr gut/keine, 2 = gut/gering, 3 = mäßig, 4 = schlecht/hoch,
 * 5 = sehr schlecht/sehr hoch, 6 = extrem. 0 = keine Daten.
 */
export type EnvLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Rating {
  level: EnvLevel
  label: string
}

function rate(value: number | null, limits: number[], labels: string[]): Rating {
  if (value === null) return { level: 0, label: 'keine Daten' }
  let i = 0
  while (i < limits.length && value >= limits[i]) i++
  return { level: (i + 1) as EnvLevel, label: labels[i] }
}

// ---------- Schwellen ----------

/** Europäischer Luftqualitätsindex (EAQI), wie Open-Meteo ihn liefert: 0–20 sehr gut … über 100 extrem schlecht */
const AQI_LIMITS = [20, 40, 60, 80, 100]
const AQI_LABELS = ['sehr gut', 'gut', 'mäßig', 'schlecht', 'sehr schlecht', 'extrem schlecht']

/** Feinstaub-Tagesmittel in µg/m³ (Bänder des EAQI). EU-Grenzwert PM10: 50 µg/m³ im Tagesmittel. */
const PM10_LIMITS = [20, 40, 50, 100, 150]
const PM25_LIMITS = [10, 20, 25, 50, 75]

/** UV-Index nach WHO: 0–2 niedrig, 3–5 mäßig, 6–7 hoch, 8–10 sehr hoch, ab 11 extrem */
const UV_LIMITS = [3, 6, 8, 11]
const UV_LABELS = ['niedrig', 'mäßig', 'hoch', 'sehr hoch', 'extrem']
/** damit „mäßig“ auf Farbe 3 (gelb) fällt statt 2 – UV hat nur 5 Stufen */
const UV_LEVEL_MAP: EnvLevel[] = [0, 1, 3, 4, 5, 6]

/** Saharastaub in µg/m³ (Richtwerte): ab 20 milchiger Himmel, ab 50 deutlich (schmutziger Regen), ab 100 stark */
const DUST_LIMITS = [20, 50, 100]
const DUST_LABELS = ['kaum', 'leicht', 'deutlich', 'stark']
const DUST_LEVEL_MAP: EnvLevel[] = [0, 1, 3, 4, 5]

/**
 * Pollen in Körnern pro m³ – Richtwerte, angelehnt an gängige Pollenflug-Einteilungen.
 * Beifuß und Ragweed sind schon in kleinen Mengen stark allergen, darum niedrigere Schwellen.
 */
export const POLLEN: { type: PollenType; label: string; variable: AqVariable; limits: [number, number, number] }[] = [
  { type: 'alder', label: 'Erle', variable: 'alder_pollen', limits: [1, 20, 100] },
  { type: 'birch', label: 'Birke', variable: 'birch_pollen', limits: [1, 20, 100] },
  { type: 'grass', label: 'Gräser', variable: 'grass_pollen', limits: [1, 10, 50] },
  { type: 'mugwort', label: 'Beifuß', variable: 'mugwort_pollen', limits: [1, 5, 20] },
  { type: 'ragweed', label: 'Ragweed (Traubenkraut)', variable: 'ragweed_pollen', limits: [1, 5, 20] },
  { type: 'olive', label: 'Olive', variable: 'olive_pollen', limits: [1, 20, 100] },
]
const POLLEN_LABELS = ['keine', 'gering', 'mittel', 'hoch']
const POLLEN_LEVEL_MAP: EnvLevel[] = [0, 1, 2, 3, 5]

// ---------- Tageswerte ----------

export interface PollenDay {
  type: PollenType
  label: string
  max: number | null
  rating: Rating
}

export interface AirDay {
  dayStart: number
  aqi: { max: number | null; rating: Rating }
  pm10: { mean: number | null; rating: Rating }
  pm25: { mean: number | null; rating: Rating }
  uv: { max: number | null; rating: Rating }
  dust: { max: number | null; rating: Rating }
  pollen: PollenDay[]
  /** gibt es überhaupt Pollendaten für diesen Tag? (nur Europa, ca. 4 Tage) */
  hasPollenData: boolean
}

function values(d: AirQualityData, v: AqVariable, from: number, to: number): number[] {
  return d.data[v].slice(from, to).filter((x): x is number => x !== null)
}

const maxOf = (v: number[]) => (v.length ? Math.max(...v) : null)
const meanOf = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null)

/** Fasst die Stundenwerte zu Tagen zusammen (nur Tage mit Daten). */
export function summarizeAirDays(d: AirQualityData): AirDay[] {
  const days: AirDay[] = []
  for (let start = 0; start + 24 <= d.times.length; start += 24) {
    const end = start + 24
    const aqiMax = maxOf(values(d, 'european_aqi', start, end))
    if (aqiMax === null) break // ab hier keine Daten mehr

    const uvMax = maxOf(values(d, 'uv_index', start, end))
    const uvRating = rate(uvMax, UV_LIMITS, UV_LABELS)
    const dustMax = maxOf(values(d, 'dust', start, end))
    const dustRating = rate(dustMax, DUST_LIMITS, DUST_LABELS)
    const pm10 = meanOf(values(d, 'pm10', start, end))
    const pm25 = meanOf(values(d, 'pm2_5', start, end))

    const pollen = POLLEN.map((p) => {
      const max = maxOf(values(d, p.variable, start, end))
      const r = rate(max, p.limits, POLLEN_LABELS)
      return { type: p.type, label: p.label, max, rating: { level: POLLEN_LEVEL_MAP[r.level], label: r.label } }
    })

    days.push({
      dayStart: d.times[start],
      aqi: { max: aqiMax, rating: rate(aqiMax, AQI_LIMITS, AQI_LABELS) },
      pm10: { mean: pm10, rating: rate(pm10, PM10_LIMITS, AQI_LABELS) },
      pm25: { mean: pm25, rating: rate(pm25, PM25_LIMITS, AQI_LABELS) },
      uv: { max: uvMax, rating: { level: UV_LEVEL_MAP[uvRating.level], label: uvRating.label } },
      dust: { max: dustMax, rating: { level: DUST_LEVEL_MAP[dustRating.level], label: dustRating.label } },
      pollen,
      hasPollenData: pollen.some((p) => p.max !== null),
    })
  }
  return days
}

/** Kurzer Rat zum UV-Index (WHO-Empfehlungen, vereinfacht). */
export function uvAdvice(uv: number | null): string {
  if (uv === null) return ''
  if (uv < 3) return 'Kein Sonnenschutz nötig.'
  if (uv < 6) return 'Sonnenschutz empfohlen (Creme, Kopfbedeckung).'
  if (uv < 8) return 'Mittags Schatten suchen, Sonnenschutz nötig.'
  return 'Mittags möglichst drinnen bleiben, Sonnenschutz unbedingt nötig.'
}

/** Kurzer Text zur Gesamtlage eines Tages. */
export function airSummary(day: AirDay): string {
  // Grund nennen, wenn die Luft nicht gut ist und Feinstaub mitschuld ist
  const pmLevel = Math.max(day.pm10.rating.level, day.pm25.rating.level)
  const reason = day.aqi.rating.level >= 3 && pmLevel >= 3 ? ' – vor allem durch Feinstaub' : ''
  const parts: string[] = [`Luftqualität ${day.aqi.rating.label}${reason}`]
  if (day.uv.max !== null) parts.push(`UV ${day.uv.rating.label} (${day.uv.max.toFixed(1).replace('.', ',')})`)
  if (day.dust.max !== null && day.dust.max >= DUST_LIMITS[0]) parts.push(`Saharastaub ${day.dust.rating.label}`)
  const strongPollen = day.pollen.filter((p) => p.rating.level >= 2)
  if (strongPollen.length) parts.push(`Pollen: ${strongPollen.map((p) => `${p.label} ${p.rating.label}`).join(', ')}`)
  return `${parts.join(' · ')}.`
}
