import type { Confidence, EnsembleData, EnsembleDay, Spread } from '../types/ensemble'
import { formatDay } from './time'

const HOURS = 24
/** ab so vielen Millimetern zählt ein Tag als „nass“ */
const WET_MM = 1

/** Perzentil (0–100) einer sortierten Liste, linear zwischen den Nachbarwerten. */
function percentile(sorted: number[], p: number): number {
  const pos = (sorted.length - 1) * (p / 100)
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

function spreadOf(values: number[]): Spread {
  const s = [...values].sort((a, b) => a - b)
  return { min: s[0], p10: percentile(s, 10), median: percentile(s, 50), p90: percentile(s, 90), max: s[s.length - 1] }
}

/** Einigkeit der Läufe aus der Breite des 10–90-%-Bands der Höchstwerte. */
function confidenceOf(tmax: Spread): Confidence {
  const width = tmax.p90 - tmax.p10
  if (width < 3) return 'hoch'
  if (width < 6) return 'mittel'
  return 'gering'
}

/**
 * Fasst die Läufe tageweise zusammen: Jeder Lauf bekommt seinen Höchst- und Tiefstwert und seine
 * Regensumme, danach wird über alle Läufe die Verteilung berechnet.
 * Ein Lauf zählt an einem Tag nur, wenn er alle 24 Stunden liefert (sonst wäre die Summe zu klein).
 * Alle Läufe zählen gleich – ECMWF hat die meisten und damit das größte Gewicht.
 * @param fromDay erster Tag (0 = heute), z. B. 7 für Tag 8
 * @param toDay   letzter Tag (einschließlich)
 */
export function summarizeEnsembleDays(data: EnsembleData, fromDay: number, toDay: number): EnsembleDay[] {
  const days: EnsembleDay[] = []
  for (let d = fromDay; d <= toDay; d++) {
    const start = d * HOURS
    if (start + HOURS > data.times.length) break

    const tmax: number[] = []
    const tmin: number[] = []
    const precip: number[] = []
    const models = new Set<string>()

    for (const member of data.members) {
      const temps = member.values.temperature_2m.slice(start, start + HOURS)
      const rain = member.values.precipitation.slice(start, start + HOURS)
      const t = temps.filter((v): v is number => typeof v === 'number')
      const r = rain.filter((v): v is number => typeof v === 'number')
      if (t.length < HOURS || r.length < HOURS) continue
      tmax.push(Math.max(...t))
      tmin.push(Math.min(...t))
      precip.push(r.reduce((a, b) => a + b, 0))
      models.add(member.model)
    }
    if (tmax.length === 0) continue

    const tmaxSpread = spreadOf(tmax)
    days.push({
      dayStart: data.times[start],
      dayIndex: d,
      memberCount: tmax.length,
      models: [...models],
      tmax: tmaxSpread,
      tmin: spreadOf(tmin),
      precip: spreadOf(precip),
      precipProbability: (precip.filter((v) => v >= WET_MM).length / precip.length) * 100,
      confidence: confidenceOf(tmaxSpread),
    })
  }
  return days
}

function deg(v: number): string {
  return `${Math.round(v)} °C`
}

/** Kurze Beschreibung des Trends in Worten (regelbasiert). */
export function describeEnsembleTrend(days: EnsembleDay[]): string[] {
  if (days.length === 0) return []
  const sentences: string[] = []

  // Temperatur: wie entwickeln sich die Höchstwerte von der ersten zur zweiten Hälfte?
  const half = Math.ceil(days.length / 2)
  const avg = (list: EnsembleDay[]) => list.reduce((a, d) => a + d.tmax.median, 0) / list.length
  const first = avg(days.slice(0, half))
  const second = avg(days.slice(half))
  const lowest = Math.min(...days.map((d) => d.tmin.median))
  const highest = Math.max(...days.map((d) => d.tmax.median))
  const change = second - first
  const tendency =
    days.length < 2 || Math.abs(change) < 1.5
      ? 'ohne klare Tendenz'
      : change > 0
        ? `mit Tendenz zu milderem Wetter (etwa ${Math.round(change)} °C wärmer gegen Ende)`
        : `mit Tendenz zu kühlerem Wetter (etwa ${Math.round(-change)} °C kälter gegen Ende)`
  sentences.push(`Temperaturen meist zwischen ${deg(lowest)} in der Nacht und ${deg(highest)} am Tag, ${tendency}.`)

  // Niederschlag: Anzahl wahrscheinlich nasser Tage und der nasseste Tag
  const wet = days.filter((d) => d.precipProbability >= 60)
  const wettest = days.reduce((a, b) => (b.precipProbability > a.precipProbability ? b : a))
  if (wettest.precipProbability < 30) {
    sentences.push('Überwiegend trocken – nur wenige Läufe rechnen mit nennenswertem Niederschlag.')
  } else if (wet.length === 0) {
    sentences.push(
      `Niederschlag ist unsicher; am ehesten ${formatDay(wettest.dayStart)} (${Math.round(wettest.precipProbability)} % der Läufe).`,
    )
  } else {
    sentences.push(
      `An ${wet.length} von ${days.length} Tagen rechnet die Mehrheit der Läufe mit Niederschlag, am wahrscheinlichsten ${formatDay(wettest.dayStart)} (${Math.round(wettest.precipProbability)} %).`,
    )
  }

  const unsure = days.filter((d) => d.confidence === 'gering').length
  sentences.push(
    unsure > days.length / 2
      ? 'Die Läufe gehen weit auseinander – das ist nur ein grober Trend, Einzelwerte sind sehr unsicher.'
      : 'Die Läufe sind sich halbwegs einig, trotzdem gilt: Je weiter weg, desto unsicherer.',
  )
  return sentences
}
