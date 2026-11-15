import { describe, expect, it } from 'vitest'
import type { MultiModelForecast } from '../types/forecast'
import type { DaySummary } from './daily'
import { deckelStufe, thunderWarning } from './warnings'

const H = 3600 * 1000
const DAY = Date.UTC(2026, 6, 15)
const MODELS = ['a', 'b', 'c']
const day = { dayStart: DAY, startIndex: 0, endIndex: 24 } as DaySummary

/**
 * Ein Sommertag für drei Modelle: nachmittags (12–18 Uhr) CAPE und CIN wie angegeben, sonst 0.
 * @param gewitterModelle so viele Modelle melden am Nachmittag den Wettercode 95 (Gewitter)
 * @param cin `null` = kein Modell liefert CIN
 */
function fc(cape: number, cin: number | null, gewitterModelle: number): MultiModelForecast {
  const nachmittag = (wert: number) => Array.from({ length: 24 }, (_, h) => (h >= 12 && h < 18 ? wert : 0))
  const jeModell = (wert: (index: number) => (number | null)[]) => Object.fromEntries(MODELS.map((m, i) => [m, wert(i)]))
  return {
    times: Array.from({ length: 24 }, (_, i) => DAY + i * H),
    availableModels: MODELS,
    data: { weather_code: jeModell((i) => nachmittag(i < gewitterModelle ? 95 : 2)) },
    extra: {
      cape: jeModell(() => nachmittag(cape)),
      convective_inhibition: cin === null ? {} : jeModell(() => nachmittag(cin)),
    },
  } as unknown as MultiModelForecast
}

describe('deckelStufe', () => {
  it('teilt CIN in schwach, mittel und stark ein', () => {
    expect(deckelStufe(10)).toBe('schwach')
    expect(deckelStufe(120)).toBe('mittel')
    expect(deckelStufe(250)).toBe('stark')
    // Vorzeichen egal: Manche Quellen geben CIN negativ an
    expect(deckelStufe(-250)).toBe('stark')
    expect(deckelStufe(null)).toBeNull()
  })
})

describe('thunderWarning mit Deckel (CIN)', () => {
  it('ohne CIN-Wert wie bisher: viel CAPE ohne Gewittercode zählt eine Stufe niedriger', () => {
    const w = thunderWarning(fc(1200, null, 0), day)
    expect(w?.level).toBe(1)
    expect(w?.detail).not.toContain('Deckel')
  })

  it('schwacher Deckel: Die Stufe bleibt, auch wenn kein Modell Gewitter meldet', () => {
    const w = thunderWarning(fc(1200, 10, 0), day)
    expect(w?.level).toBe(2)
    expect(w?.detail).toContain('Kaum Deckel (CIN 10 J/kg): Gewitter können leicht auslösen.')
  })

  it('starker Deckel senkt die Stufe, bei viel CAPE bleibt aber gelb mit Hinweis', () => {
    const w = thunderWarning(fc(2500, 300, 0), day)
    expect(w?.level).toBe(1)
    expect(w?.detail).toContain('Starker Deckel (CIN 300 J/kg)')
    expect(w?.detail).toContain('heftig, falls der Deckel bricht')
  })

  it('starker Deckel bei wenig CAPE: kein Hinweis', () => {
    expect(thunderWarning(fc(700, 300, 0), day)).toBeNull()
  })

  it('melden die Modelle Gewitter, senkt auch ein starker Deckel die Stufe nicht', () => {
    // 2 von 3 Modellen mit Gewittercode
    const w = thunderWarning(fc(1200, 300, 2), day)
    expect(w?.level).toBe(2)
  })

  it('mäßiger Deckel: Hinweis auf nötigen Auslöser', () => {
    const w = thunderWarning(fc(1200, 120, 1), day)
    expect(w?.detail).toContain('Mäßiger Deckel (CIN 120 J/kg)')
  })
})
