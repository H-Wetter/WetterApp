import type { MultiModelForecast } from '../types/forecast'
import type { DaySummary } from './daily'
import { statsForValues } from './statistics'

/**
 * Inversion = die Temperatur NIMMT nach oben ZU (normal nimmt sie ab, ca. −0,65 °C pro 100 m).
 * Kalte Luft liegt dann im Tal, darüber wärmere – typisch im Herbst/Winter bei Hochdruck,
 * oft mit Nebel oder Hochnebel unter der Inversion.
 *
 * Erkennung (CLAUDE.md, Etappe 5): NICHT über den `elevation`-Parameter – der rechnet nur mit der
 * Standard-Abnahme um und kann eine Inversion gar nicht zeigen. Stattdessen über das
 * Temperaturprofil der Modelle am Standort: 2-m-Temperatur plus Druckniveaus 1000–850 hPa
 * (ca. Boden bis 1500 m). Niveaus, die unter dem Talboden liegen, werden weggelassen.
 */

/** Unter diesem Höhenunterschied (m) ist ein Berg-Tal-Vergleich nicht sinnvoll. */
export const MIN_HEIGHT_DIFFERENCE = 300

/** Druckniveaus für das Profil (Namen wie bei Open-Meteo, am 08.11.2026 geprüft) */
export const PROFILE_LEVELS = [1000, 975, 950, 925, 900, 850] as const

/** Zusätzliche Variablen für die Tal-Vorhersage */
export const PROFILE_EXTRA_VARIABLES = [
  'relative_humidity_2m',
  ...PROFILE_LEVELS.flatMap((l) => [`temperature_${l}hPa`, `relative_humidity_${l}hPa`, `geopotential_height_${l}hPa`]),
]

/** Ab so viel Erwärmung nach oben zählt es als Inversion (°C) – kleinere Werte sind Rauschen. */
const MIN_STRENGTH = 0.5
/** Ab dieser relativen Feuchte gilt eine Schicht als Nebel/Hochnebel (%) */
const FOG_RH = 95
/** Ein Druckniveau muss mindestens so hoch über dem Talboden liegen (m), sonst ist es „unter der Erde“ gerechnet. */
const ABOVE_GROUND_M = 50

/** Entfernung zweier Punkte auf der Erde in km (Haversine-Formel). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// ---------- Ein Profil (ein Modell, eine Stunde) ----------

export interface ProfilePoint {
  /** Höhe über dem Meer (m) */
  height: number
  temp: number
  rh: number | null
}

export interface ProfileInversion {
  /** Untergrenze der Inversion (m ü. M.) – darunter ist es kalt */
  base: number
  /** Obergrenze (m ü. M.) – hier ist es am wärmsten */
  top: number
  /** Erwärmung von unten nach oben (°C) */
  strength: number
  /** geschätzte Nebelobergrenze (m ü. M.), `null` = keine feuchte Schicht unter der Inversion */
  fogTop: number | null
  /** Reicht die feuchte Schicht bis zum Boden? (Nebel statt Hochnebel) */
  fogFromGround: boolean
}

/** Höhe, in der die Feuchte zwischen zwei Punkten unter 95 % fällt (lineare Schätzung). */
function fogCrossing(lower: ProfilePoint, upper: ProfilePoint | undefined): number {
  if (!upper || upper.rh === null || lower.rh === null || lower.rh === upper.rh) return lower.height
  const f = (lower.rh - FOG_RH) / (lower.rh - upper.rh)
  return lower.height + Math.min(1, Math.max(0, f)) * (upper.height - lower.height)
}

/** Sucht im Profil die stärkste Inversion und die feuchte Schicht darunter. */
export function analyzeProfile(profile: ProfilePoint[]): ProfileInversion | null {
  const p = [...profile].sort((a, b) => a.height - b.height)
  let best: { baseIdx: number; topIdx: number; strength: number } | null = null

  let i = 0
  while (i < p.length - 1) {
    if (p[i + 1].temp > p[i].temp) {
      // Schicht, in der es nach oben wärmer wird, so weit wie möglich nach oben verfolgen
      let j = i + 1
      while (j < p.length - 1 && p[j + 1].temp >= p[j].temp) j++
      const strength = p[j].temp - p[i].temp
      if (!best || strength > best.strength) best = { baseIdx: i, topIdx: j, strength }
      i = j
    } else {
      i++
    }
  }
  if (!best || best.strength < MIN_STRENGTH) return null

  // Feuchte Schicht unter der Inversion: Sie muss die Inversions-Untergrenze erreichen.
  let fogTop: number | null = null
  let fogFromGround = false
  const moist = (k: number) => (p[k].rh ?? 0) >= FOG_RH
  if (moist(best.baseIdx)) {
    let top = best.baseIdx
    while (top < best.topIdx && moist(top + 1)) top++
    let bottom = best.baseIdx
    while (bottom > 0 && moist(bottom - 1)) bottom--
    fogTop = Math.min(fogCrossing(p[top], p[top + 1]), p[best.topIdx].height)
    fogFromGround = bottom === 0
  }

  return { base: p[best.baseIdx].height, top: p[best.topIdx].height, strength: best.strength, fogTop, fogFromGround }
}

/** Profil eines Modells in Stunde i: 2 m über dem Talboden plus alle Druckniveaus über dem Boden. */
function profileAt(fc: MultiModelForecast, modelId: string, i: number, ground: number): ProfilePoint[] {
  const out: ProfilePoint[] = []
  const t2m = fc.data.temperature_2m[modelId]?.[i] ?? null
  if (t2m !== null) out.push({ height: ground + 2, temp: t2m, rh: fc.extra.relative_humidity_2m?.[modelId]?.[i] ?? null })
  for (const l of PROFILE_LEVELS) {
    const height = fc.extra[`geopotential_height_${l}hPa`]?.[modelId]?.[i] ?? null
    const temp = fc.extra[`temperature_${l}hPa`]?.[modelId]?.[i] ?? null
    if (height === null || temp === null || height < ground + ABOVE_GROUND_M) continue
    out.push({ height, temp, rh: fc.extra[`relative_humidity_${l}hPa`]?.[modelId]?.[i] ?? null })
  }
  return out
}

// ---------- Alle Modelle, stündlich ----------

export interface HourInversion {
  t: number
  /** Modelle mit brauchbarem Profil (Boden + mind. ein Niveau darüber) */
  models: number
  /** davon mit Inversion */
  inversionModels: number
  /** Mehrheit der Modelle sieht eine Inversion */
  inversion: boolean
  /** Median über die Modelle mit Inversion */
  strength: number | null
  base: number | null
  top: number | null
  /** Mehrheit der Inversions-Modelle sieht eine feuchte Schicht darunter */
  fog: boolean
  fogTop: number | null
  fogFromGround: boolean
}

function median(values: number[]): number | null {
  return statsForValues(values).median
}

/** Inversion je Stunde, ausgewertet über alle Modelle mit Profil. */
export function profileInversions(fc: MultiModelForecast, groundElevation: number): HourInversion[] {
  return fc.times.map((t, i) => {
    const results: (ProfileInversion | null)[] = []
    for (const id of fc.availableModels) {
      const profile = profileAt(fc, id, i, groundElevation)
      if (profile.length >= 2) results.push(analyzeProfile(profile))
    }
    const inv = results.filter((r): r is ProfileInversion => r !== null)
    const fogs = inv.filter((r) => r.fogTop !== null)
    const inversion = results.length >= 2 && inv.length / results.length >= 0.5
    const fog = inversion && fogs.length / inv.length >= 0.5
    return {
      t,
      models: results.length,
      inversionModels: inv.length,
      inversion,
      strength: inversion ? median(inv.map((r) => r.strength)) : null,
      base: inversion ? median(inv.map((r) => r.base)) : null,
      top: inversion ? median(inv.map((r) => r.top)) : null,
      fog,
      fogTop: fog ? median(fogs.map((r) => r.fogTop ?? 0)) : null,
      fogFromGround: fog && fogs.filter((r) => r.fogFromGround).length / fogs.length >= 0.5,
    }
  })
}

// ---------- Vergleich Tal ↔ Berg fürs Diagramm ----------

export interface HourComparison {
  t: number
  /** mittlere Temperatur im Tal / am Berg (°C) */
  valley: number | null
  mountain: number | null
  /** Berg minus Tal */
  diff: number | null
  /** Inversion laut Temperaturprofil am Standort */
  inversion: boolean
  strength: number | null
  top: number | null
  fogTop: number | null
}

function meanAt(fc: MultiModelForecast, i: number): number | null {
  return statsForValues(fc.availableModels.map((id) => fc.data.temperature_2m[id]?.[i] ?? null)).mean
}

/** Stündlicher Vergleich Tal ↔ Berg (gleiche Zeitachse vorausgesetzt), Inversion aus dem Profil. */
export function compareHours(valley: MultiModelForecast, mountain: MultiModelForecast | null, inversions: HourInversion[]): HourComparison[] {
  return valley.times.map((t, i) => {
    const v = meanAt(valley, i)
    const m = mountain && i < mountain.times.length ? meanAt(mountain, i) : null
    const inv = inversions[i]
    return {
      t,
      valley: v,
      mountain: m,
      diff: v !== null && m !== null ? m - v : null,
      inversion: inv?.inversion ?? false,
      strength: inv?.strength ?? null,
      top: inv?.top ?? null,
      fogTop: inv?.fogTop ?? null,
    }
  })
}

// ---------- Tageszusammenfassung ----------

/** Tagesabschnitte für Texte */
export const DAY_PARTS = [
  { key: 'night', label: 'in der Nacht', from: 0, to: 6 },
  { key: 'morning', label: 'am Vormittag', from: 6, to: 12 },
  { key: 'afternoon', label: 'am Nachmittag', from: 12, to: 18 },
  { key: 'evening', label: 'am Abend', from: 18, to: 24 },
] as const

export interface DayInversion {
  dayStart: number
  /** Anzahl Stunden mit Inversion */
  hours: number
  /** in welchen Tagesabschnitten (mind. 3 Stunden) */
  parts: string[]
  /** stärkste Erwärmung nach oben (°C) */
  maxStrength: number | null
  /** typische Obergrenze der Inversion (m ü. M.) */
  top: number | null
  /** Nebel/Hochnebel: mind. 3 Stunden mit feuchter Schicht unter der Inversion */
  fog: boolean
  /** typische Nebelobergrenze (m ü. M.) */
  fogTop: number | null
  /** Nebel bis zum Boden (sonst Hochnebel) */
  fogFromGround: boolean
  /** Anteil der Modelle, die die Inversion sehen (0–1), gemittelt über die Inversionsstunden */
  agreement: number | null
}

/** Inversion für einen Tag zusammenfassen. */
export function summarizeInversion(hours: HourInversion[], day: DaySummary): DayInversion {
  const dayHours = hours.slice(day.startIndex, day.endIndex)
  const inv = dayHours.filter((h) => h.inversion)
  const fog = inv.filter((h) => h.fog)
  const parts = DAY_PARTS.filter((p) => dayHours.filter((h, k) => h.inversion && k >= p.from && k < p.to).length >= 3).map(
    (p) => p.label,
  )
  const nums = (list: (number | null)[]) => list.filter((v): v is number => v !== null)

  return {
    dayStart: day.dayStart,
    hours: inv.length,
    parts,
    maxStrength: inv.length ? Math.max(...nums(inv.map((h) => h.strength))) : null,
    top: median(nums(inv.map((h) => h.top))),
    fog: fog.length >= 3,
    fogTop: fog.length >= 3 ? median(nums(fog.map((h) => h.fogTop))) : null,
    fogFromGround: fog.length >= 3 && fog.filter((h) => h.fogFromGround).length / fog.length >= 0.5,
    agreement: inv.length ? inv.reduce((a, h) => a + h.inversionModels / Math.max(1, h.models), 0) / inv.length : null,
  }
}
