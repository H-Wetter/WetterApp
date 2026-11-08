import type { MultiModelForecast, Series } from '../types/forecast'

/**
 * Bergpunkt: Temperatur und Wind „in freier Atmosphäre“ in Gipfelhöhe.
 *
 * Warum? Open-Meteo rechnet die Bodentemperatur mit einer Standard-Abnahme
 * (ca. −0,65 °C pro 100 m) auf die Gipfelhöhe um. Bei einer Inversion stimmt das nicht –
 * dann ist es oben WÄRMER. Die Modelle kennen die Inversion aber in ihren Höhenwerten
 * (Druckniveaus). Darum rechnen wir aus diesen Werten auf die Gipfelhöhe um.
 */

/** Druckniveaus für die Umrechnung (ca. 800 m, 1500 m, 3000 m, 4200 m). */
export const MOUNTAIN_LEVELS = [925, 850, 700, 600] as const

/** Zusätzliche Variablen, die wir für den Bergpunkt abfragen. */
export const MOUNTAIN_EXTRA_VARIABLES = MOUNTAIN_LEVELS.flatMap((l) => [
  `temperature_${l}hPa`,
  `geopotential_height_${l}hPa`,
  `wind_speed_${l}hPa`,
  `wind_direction_${l}hPa`,
])

interface LevelValue {
  height: number
  temp: number
  speed: number | null
  direction: number | null
}

/** Werte eines Modells in Stunde i auf allen Niveaus, nach Höhe sortiert. */
function levelsAt(fc: MultiModelForecast, modelId: string, i: number): LevelValue[] {
  const out: LevelValue[] = []
  for (const l of MOUNTAIN_LEVELS) {
    const height = fc.extra[`geopotential_height_${l}hPa`]?.[modelId]?.[i] ?? null
    const temp = fc.extra[`temperature_${l}hPa`]?.[modelId]?.[i] ?? null
    if (height === null || temp === null) continue
    out.push({
      height,
      temp,
      speed: fc.extra[`wind_speed_${l}hPa`]?.[modelId]?.[i] ?? null,
      direction: fc.extra[`wind_direction_${l}hPa`]?.[modelId]?.[i] ?? null,
    })
  }
  return out.sort((a, b) => a.height - b.height)
}

/** Lineare Umrechnung zwischen den beiden Niveaus, die den Gipfel einschließen. */
function interpolate(levels: LevelValue[], summit: number): { temp: number; speed: number | null; direction: number | null } | null {
  for (let k = 0; k < levels.length - 1; k++) {
    const lo = levels[k]
    const hi = levels[k + 1]
    if (lo.height <= summit && hi.height >= summit) {
      const f = (summit - lo.height) / (hi.height - lo.height)
      const speed = lo.speed !== null && hi.speed !== null ? lo.speed + f * (hi.speed - lo.speed) : (lo.speed ?? hi.speed)
      // Richtung nicht mitteln (siehe wind.ts) – einfach vom näheren Niveau nehmen
      const direction = f < 0.5 ? lo.direction : hi.direction
      return { temp: lo.temp + f * (hi.temp - lo.temp), speed, direction }
    }
  }
  return null
}

/**
 * Windchill (gefühlte Temperatur bei Wind), Formel des kanadischen/US-Wetterdienstes.
 * Gilt für Temperaturen bis 10 °C und Wind ab 5 km/h – sonst bleibt die Lufttemperatur.
 */
export function windChill(temp: number, windKmh: number): number {
  if (temp > 10 || windKmh < 5) return temp
  const v = Math.pow(windKmh, 0.16)
  return 13.12 + 0.6215 * temp - 11.37 * v + 0.3965 * temp * v
}

/**
 * Baut aus der normalen Berg-Vorhersage eine „Gipfel-Vorhersage“:
 * Temperatur, Wind und gefühlte Temperatur kommen aus der freien Atmosphäre in Gipfelhöhe.
 * Wolken, Niederschlag, Sonne usw. bleiben wie geliefert.
 */
export function toSummitForecast(fc: MultiModelForecast, summit: number): MultiModelForecast {
  const temp: Record<string, Series> = {}
  const wind: Record<string, Series> = {}
  const dir: Record<string, Series> = {}
  const feels: Record<string, Series> = {}
  const gust: Record<string, Series> = {}

  for (const id of fc.availableModels) {
    const t2m = fc.data.temperature_2m[id] ?? []
    temp[id] = fc.times.map((_, i) => {
      const free = interpolate(levelsAt(fc, id, i), summit)
      return free ? free.temp : (t2m[i] ?? null)
    })
    wind[id] = fc.times.map((_, i) => interpolate(levelsAt(fc, id, i), summit)?.speed ?? fc.data.wind_speed_10m[id]?.[i] ?? null)
    dir[id] = fc.times.map(
      (_, i) => interpolate(levelsAt(fc, id, i), summit)?.direction ?? fc.data.wind_direction_10m[id]?.[i] ?? null,
    )
    feels[id] = fc.times.map((_, i) => {
      const t = temp[id][i]
      const w = wind[id][i]
      return t === null ? null : windChill(t, w ?? 0)
    })
    // Böen nie schwächer als der mittlere Gipfelwind
    gust[id] = fc.times.map((_, i) => {
      const g = fc.data.wind_gusts_10m[id]?.[i] ?? null
      const w = wind[id][i]
      if (g === null) return w
      return w === null ? g : Math.max(g, w)
    })
  }

  return {
    ...fc,
    data: {
      ...fc.data,
      temperature_2m: temp,
      wind_speed_10m: wind,
      wind_direction_10m: dir,
      apparent_temperature: feels,
      wind_gusts_10m: gust,
    },
  }
}
