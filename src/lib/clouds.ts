import { PRESSURE_LEVELS, WIND_LEVELS, type CloudProfileRaw, type WindLevel } from '../types/clouds'
import type { HourStats } from '../types/forecast'
import { compassName, meanWindDirection, type WindDirection } from './wind'
import { statsForValues } from './statistics'

/** Bis zu dieser Höhe (m über dem Meer) zeichnen wir den Wolkenschnitt. */
export const MAX_HEIGHT = 12000

/** Faustformel Wolkenbasis: je 1 °C Abstand zwischen Temperatur und Taupunkt ≈ 125 m Höhe. */
const BASE_M_PER_DEGREE = 125

/** Ab so viel tiefer Bewölkung (%) zeigen wir die geschätzte Wolkenbasis. */
const MIN_LOW_CLOUD_FOR_BASE = 20

/** Eine Höhenschicht in einer Stunde. */
export interface CloudCell {
  hPa: number
  /** Unter- und Obergrenze der Schicht in m über dem Meer */
  bottom: number
  top: number
  /** Bewölkung in % über die Modelle (Mittel, Spanne, Anzahl) */
  cover: HourStats
}

export interface LevelWind {
  hPa: WindLevel
  /** Höhe des Niveaus (m über dem Meer) */
  height: number
  direction: WindDirection
  /** mittlere Windgeschwindigkeit in km/h */
  speed: number | null
}

export interface CloudColumn {
  t: number
  cells: CloudCell[]
  /** geschätzte Wolkenbasis (m über dem Meer), `null` = keine nennenswerten tiefen Wolken */
  base: number | null
  winds: LevelWind[]
}

export interface CloudSection {
  columns: CloudColumn[]
  /** Geländehöhe des Ortes (m über dem Meer) */
  ground: number
  modelCount: number
}

type Lookup = (variable: string, i: number) => (number | null)[]

function nums(values: (number | null)[]): number[] {
  return values.filter((v): v is number => v !== null)
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}

/** Mittlere Höhe jedes Druckniveaus in Stunde i (über die Modelle). */
function levelHeights(at: Lookup, i: number): (number | null)[] {
  return PRESSURE_LEVELS.map((l) => mean(nums(at(`geopotential_height_${l}hPa`, i))))
}

function column(at: Lookup, i: number, t: number, ground: number): CloudColumn {
  const heights = levelHeights(at, i)

  // Nur Niveaus über dem Boden mit bekannter Höhe
  const above = PRESSURE_LEVELS.map((hPa, k) => ({ hPa, h: heights[k] })).filter(
    (x): x is { hPa: (typeof PRESSURE_LEVELS)[number]; h: number } => x.h !== null && x.h > ground,
  )

  const cells: CloudCell[] = above.map((lvl, k) => {
    const below = above[k - 1]
    const next = above[k + 1]
    // Schicht reicht von der Mitte zum Niveau darunter bis zur Mitte zum Niveau darüber
    const bottom = below ? (below.h + lvl.h) / 2 : ground
    const top = next ? (lvl.h + next.h) / 2 : Math.min(MAX_HEIGHT, lvl.h + (lvl.h - (below?.h ?? ground)) / 2)
    return { hPa: lvl.hPa, bottom, top, cover: statsForValues(at(`cloud_cover_${lvl.hPa}hPa`, i)) }
  })

  // Wolkenbasis: Spread (T − Td) je Modell → Mittel. Nur wenn es auch tiefe Wolken gibt.
  const temps = at('temperature_2m', i)
  const dews = at('dew_point_2m', i)
  const spreads = nums(temps.map((tt, k) => (tt !== null && dews[k] !== null ? Math.max(0, tt - (dews[k] as number)) : null)))
  const lowCloud = mean(nums(at('cloud_cover_low', i)))
  const spread = mean(spreads)
  const base =
    spread !== null && lowCloud !== null && lowCloud >= MIN_LOW_CLOUD_FOR_BASE ? ground + spread * BASE_M_PER_DEGREE : null

  const winds: LevelWind[] = []
  for (const hPa of WIND_LEVELS) {
    const k = PRESSURE_LEVELS.indexOf(hPa)
    const h = heights[k]
    if (h === null || h <= ground) continue
    const dirs = at(`wind_direction_${hPa}hPa`, i)
    const speeds = at(`wind_speed_${hPa}hPa`, i)
    winds.push({
      hPa,
      height: h,
      direction: meanWindDirection(dirs.map((d, m) => ({ direction: d, speed: speeds[m] }))),
      speed: mean(nums(speeds)),
    })
  }

  return { t, cells, base, winds }
}

/**
 * Baut den Wolkenschnitt für die Stunden `from` bis `to` (exklusiv).
 * @param modelIds welche Modelle einfließen (nur die, die Druckniveau-Wolken liefern, werden genutzt)
 */
export function buildCloudSection(raw: CloudProfileRaw, modelIds: string[], from: number, to: number): CloudSection {
  const ids = modelIds.filter((id) => raw.availableModels.includes(id))
  const at: Lookup = (variable, i) => ids.map((id) => raw.data[variable]?.[id]?.[i] ?? null)
  const columns: CloudColumn[] = []
  for (let i = from; i < Math.min(to, raw.times.length); i++) columns.push(column(at, i, raw.times[i], raw.elevation))
  return { columns, ground: raw.elevation, modelCount: ids.length }
}

/** Höhenbereich, grob benannt (für Texte). */
export function layerName(height: number, ground: number): string {
  const agl = height - ground
  if (agl < 2000) return 'tiefe Wolken'
  if (height < 6000) return 'mittelhohe Wolken'
  return 'hohe Wolken'
}

/**
 * Kurzer Satz zur Zugrichtung für eine Stunde: Wir nehmen das Windniveau mit den meisten Wolken.
 * Ohne nennenswerte Wolken (unter 20 %) nehmen wir 700 hPa (~3000 m) als „typische“ Wolkenhöhe.
 */
export function cloudMotionText(col: CloudColumn, ground: number): string | null {
  if (col.winds.length === 0) return null
  const coverAt = (h: number) => col.cells.find((c) => h >= c.bottom && h < c.top)?.cover.mean ?? 0
  const ranked = [...col.winds].sort((a, b) => coverAt(b.height) - coverAt(a.height))
  const best = coverAt(ranked[0].height) >= 20 ? ranked[0] : (col.winds.find((w) => w.hPa === 700) ?? ranked[0])
  const dir = best.direction
  const at = `in ca. ${roundHeight(best.height)} m`
  const hasClouds = coverAt(best.height) >= 20
  if (dir.degrees === null || dir.name === 'still') {
    return hasClouds ? `Die ${layerName(best.height, ground)} ${at} ziehen kaum – es ist dort fast windstill.` : `Kaum Wolken, ${at} ist es fast windstill.`
  }
  if (dir.name === 'wechselnd') return `${hasClouds ? `Die ${layerName(best.height, ground)}` : 'Der Wind'} ${at}: Zugrichtung uneinheitlich.`
  const speed = Math.round(best.speed ?? 0)
  if (!hasClouds) {
    return `Kaum Wolken. Der Wind ${at} kommt aus ${compassName(dir.degrees)} (${speed} km/h) – so würden Wolken ziehen.`
  }
  return `${capitalize(layerName(best.height, ground))} ${at} ziehen aus ${compassName(dir.degrees)} mit ${speed} km/h.`
}

function roundHeight(h: number): string {
  return (Math.round(h / 100) * 100).toLocaleString('de-AT')
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
