import { FEW_MODELS, type DaySummary, type HourSummary } from './daily'
import type { DayInversion } from './inversion'
import type { WeatherSymbol } from './weatherSymbol'

/**
 * Tagesbeschreibung in Worten – regelbasiert aus den Zahlen (Textbausteine).
 * Jeder Satz ist eine eigene kleine Regel, damit man sie leicht anpassen kann.
 */

export type Place = 'valley' | 'mountain'

type Sky = 'sun' | 'cloud' | 'fog' | 'rain' | 'snow' | 'sleet' | 'thunder'

const SKY_TEXT: Record<Sky, string> = {
  sun: 'sonnig bis heiter',
  cloud: 'bewölkt',
  fog: 'neblig-trüb',
  rain: 'regnerisch',
  snow: 'Schneefall',
  sleet: 'Schneeregen',
  thunder: 'gewittrig',
}

function skyOf(s: WeatherSymbol): Sky {
  switch (s.condition) {
    case 'clear':
    case 'partly':
      return 'sun'
    case 'fog':
      return 'fog'
    case 'thunder':
      return 'thunder'
    case 'precip':
      return s.precip?.kind ?? 'rain'
    default:
      return 'cloud'
  }
}

/** Häufigster Himmelszustand in einem Tagesabschnitt. */
function dominantSky(hours: HourSummary[], dayStart: number, from: number, to: number): Sky | null {
  const counts = new Map<Sky, number>()
  for (const h of hours) {
    const hour = Math.round((h.t - dayStart) / 3600000)
    if (hour < from || hour >= to) continue
    const sky = skyOf(h.symbol)
    counts.set(sky, (counts.get(sky) ?? 0) + 1)
  }
  let best: Sky | null = null
  let max = 0
  for (const [sky, n] of counts) {
    if (n > max) {
      best = sky
      max = n
    }
  }
  return best
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function num(v: number, digits = 0): string {
  return v.toFixed(digits).replace('.', ',')
}

/** ['in der Nacht', 'am Vormittag'] → „in der Nacht und am Vormittag“ */
export function joinParts(parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}`
}

/** Satz 1: Himmel am Vormittag/Nachmittag + Sonnenstunden */
function skySentence(day: DaySummary, hours: HourSummary[]): string {
  const morning = dominantSky(hours, day.dayStart, 6, 12)
  const afternoon = dominantSky(hours, day.dayStart, 12, 18)
  const sun = day.sunshineHours.mean
  const sunText = sun === null ? '' : sun < 0.5 ? ', kaum Sonne' : `, etwa ${num(sun, 1)} Sonnenstunden`

  if (!morning || !afternoon) return `${cap(SKY_TEXT[skyOf(day.symbol)])}${sunText}.`
  if (morning === afternoon) return `${cap(SKY_TEXT[morning])}${sunText}.`
  return `Vormittags ${SKY_TEXT[morning]}, nachmittags ${SKY_TEXT[afternoon]}${sunText}.`
}

/** Satz 2: Niederschlag */
function precipSentence(day: DaySummary): string {
  const amount = day.precipSum.mean ?? 0
  const prob = Math.round(day.precipProbability ?? day.precipShare * 100)
  if (day.symbol.precip) {
    const snow = day.snowSum !== null && day.snowSum >= 0.5 ? `, davon etwa ${num(day.snowSum, 1)} cm Neuschnee` : ''
    return `${day.symbol.label} mit etwa ${num(amount, 1)} mm${snow} (Wahrscheinlichkeit ${prob} %).`
  }
  if (prob >= 30) return `Meist trocken, einzelne Schauer möglich (${prob} %).`
  return 'Trocken.'
}

/** Satz 3: Temperatur, gefühlt, Frost */
function tempSentence(day: DaySummary, place: Place): string {
  const min = day.tempMin.mean
  const max = day.tempMax.mean
  if (min === null || max === null) return ''
  const where = place === 'mountain' ? 'Am Gipfel' : 'Temperaturen'
  let s = `${where} von ${num(min)} bis ${num(max)} °C`
  const feelsMin = day.feelsMin.mean
  if (feelsMin !== null && min - feelsMin >= 3) s += `, gefühlt bis ${num(feelsMin)} °C`
  s += '.'
  if (min <= -0.5) s += place === 'valley' ? ' Frost in der Nacht und am Morgen.' : ' Frost.'
  return s
}

/** Satz 4: Wind */
function windSentence(day: DaySummary, place: Place): string {
  const wind = day.windMax.mean ?? 0
  const gust = day.gustMax.mean ?? 0
  const dir = day.windDirection
  const from = dir.degrees !== null && dir.name !== 'wechselnd' && dir.name !== 'still' ? ` aus ${dir.name}` : ''
  let strength: string
  if (wind < 12) strength = 'Schwacher Wind'
  else if (wind < 30) strength = 'Mäßiger Wind'
  else if (wind < 50) strength = 'Lebhafter bis starker Wind'
  else strength = 'Stürmischer Wind'
  if (place === 'mountain') strength += ' am Gipfel'
  let s = `${strength}${from}`
  if (gust >= 60) s += `, Sturmböen bis ${num(gust)} km/h`
  else if (gust >= 40) s += `, Böen bis ${num(gust)} km/h`
  return `${s}.`
}

/** Satz 5: Inversion / Hochnebel */
function inversionSentence(inv: DayInversion | null, place: Place): string {
  if (!inv || inv.hours < 3) return ''
  const when = inv.parts.length ? ` ${joinParts(inv.parts)}` : ''
  if (inv.fog) {
    return place === 'valley'
      ? 'Inversion: Hochnebel oder Nebel im Tal möglich, oben sonnig und mild.'
      : 'Über der Inversion: sonnig und mild – mit etwas Glück Blick aufs Nebelmeer.'
  }
  const diff = inv.maxDiff !== null && inv.maxDiff >= 0.5 ? ` (bis zu ${num(inv.maxDiff, 1)} °C)` : ''
  return place === 'valley'
    ? `Inversion: Am Berg ist es${when} wärmer als im Tal${diff} – kalte Luft sammelt sich im Tal.`
    : `Inversion: Am Gipfel ist es${when} milder als im Tal${diff}.`
}

/** Satz 6: Unsicherheit */
function uncertaintySentence(day: DaySummary): string {
  const spread =
    day.tempMax.max !== null && day.tempMax.min !== null ? day.tempMax.max - day.tempMax.min : 0
  if (day.modelCount < FEW_MODELS) return `Nur ${day.modelCount} Modelle rechnen so weit – ein grober Trend.`
  if (spread > 6) return 'Die Modelle sind sich bei der Temperatur noch recht uneinig.'
  return ''
}

/** Tagesbeschreibung als Liste von Sätzen. */
export function describeDay(day: DaySummary, hours: HourSummary[], place: Place, inversion: DayInversion | null): string[] {
  return [
    skySentence(day, hours),
    inversionSentence(inversion, place),
    precipSentence(day),
    tempSentence(day, place),
    windSentence(day, place),
    uncertaintySentence(day),
  ].filter((s) => s !== '')
}
