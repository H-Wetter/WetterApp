import { FEW_MODELS, type DaySummary } from './daily'

/**
 * Hilfen für die Tagesliste und die Stundenansicht: Farbe je Temperatur,
 * Verlässlichkeit der Vorhersage und Text für den Niederschlag.
 */

/**
 * Farbton (HSL-Winkel) für eine Temperatur: violett bei −15 °C, blau um 0 °C,
 * grün um 10 °C, gelb um 20 °C, rot ab 35 °C.
 */
export function temperatureHue(t: number): number {
  const clamped = Math.max(-15, Math.min(35, t))
  return Math.round(270 - ((clamped + 15) / 50) * 270)
}

/**
 * Blasser Hintergrund für ein Temperatur-Kästchen. Die Zahl selbst bleibt in normaler
 * Textfarbe, so ist sie hell wie dunkel gut lesbar.
 */
export function temperatureBackground(t: number | null): string {
  if (t === null) return 'transparent'
  return `hsl(${temperatureHue(t)} 75% 50% / 0.28)`
}

/**
 * Verlässlichkeit der Tagesvorhersage in 1 bis 4 Punkten, aus der Einigkeit der Modelle.
 * Je ein Punkt Abzug für: Spanne der Höchstwerte über 2,5 °C, über 5 °C,
 * Uneinigkeit beim Niederschlag (nur ein Teil der Modelle sieht Regen) und wenige Modelle (ab etwa Tag 8).
 */
export function dayConfidence(d: DaySummary): 1 | 2 | 3 | 4 {
  let penalty = 0
  const spread = d.tempMax.max !== null && d.tempMax.min !== null ? d.tempMax.max - d.tempMax.min : 0
  if (spread > 2.5) penalty++
  if (spread > 5) penalty++
  if (d.precipShare > 0.2 && d.precipShare < 0.8) penalty++
  if (d.modelCount < FEW_MODELS) penalty++
  return Math.max(1, 4 - penalty) as 1 | 2 | 3 | 4
}

export const CONFIDENCE_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: 'unsicher',
  2: 'mäßig sicher',
  3: 'ziemlich sicher',
  4: 'sicher',
}

/** Niederschlag als Spanne der Modelle, z. B. „2–5 mm“. Trockener Tag: `null`. */
export function precipRange(d: DaySummary): string | null {
  const { mean, min, max } = d.precipSum
  if (mean === null || mean < 0.2) return null
  if (min === null || max === null || max - min < 1) return `${mean.toFixed(mean < 10 ? 1 : 0).replace('.', ',')} mm`
  return `${Math.round(min)}–${Math.round(max)} mm`
}
